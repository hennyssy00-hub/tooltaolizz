"""
detector.py — Engine quét đối đả (Arbitrage Detection) chính.

Luồng xử lý:
1. Load dữ liệu từ các file game (mỗi file = 1 đài)
2. Gom cược theo (account, round_id)
3. Quét 内对打 (trong đài) + 外对打 (giữa các đài)
4. Lọc: cửa đối nghịch, chênh cược ≤10%, payout 90-100%, 1 thắng 1 thua
5. Áp ngưỡng: 内≥3, 外≥4, bằng tiền/ván ≥90%
6. Kiểm tra cùng tay (同手): ≥2 → loại toàn bộ cặp
7. Trả kết quả: cặp hợp lệ + cặp bị loại do cùng tay
"""

from __future__ import annotations

from dataclasses import dataclass, field
from collections import defaultdict
from typing import Literal

from .rules import (
    is_opposite,
    is_same_hand,
    display_platform,
)
from .data_loader import RoundBets


# ---------------------------------------------------------------------------
# Data structures for results
# ---------------------------------------------------------------------------

@dataclass
class MatchedRound:
    """Một ván đối đả hợp lệ."""
    round_id: str
    account_a: str
    account_b: str
    platform_a: str
    platform_b: str
    bet_area_a: str
    bet_area_b: str
    amount_a: float
    amount_b: float
    win_loss_a: float
    win_loss_b: float
    stake_diff_pct: float     # ABS(A-B)/MAX(A,B) as percentage
    is_equal_stake: bool      # A == B chính xác
    payout_pct: float         # payout % (abs(winner_wl) / loser_stake)


@dataclass
class SameHandRound:
    """Một ván cùng tay."""
    round_id: str
    account_a: str
    account_b: str
    platform_a: str
    platform_b: str
    bet_area_a: str
    bet_area_b: str
    amount_a: float
    amount_b: float


@dataclass
class ArbitragePair:
    """Một cặp đối đả đã qua tất cả bộ lọc."""
    match_type: Literal["内对打", "外对打"]
    platform_a: str           # Đài của account A
    platform_b: str           # Đài của account B
    account_a: str
    account_b: str
    matched_rounds: list[MatchedRound]
    same_hand_rounds: list[SameHandRound]

    @property
    def num_rounds(self) -> int:
        """Số ván đối đả hợp lệ (unique round_id)."""
        return len({r.round_id for r in self.matched_rounds})

    @property
    def num_equal_stake(self) -> int:
        """Số ván bằng tiền chính xác."""
        seen: set[str] = set()
        count = 0
        for r in self.matched_rounds:
            if r.round_id not in seen and r.is_equal_stake:
                count += 1
                seen.add(r.round_id)
        return count

    @property
    def equal_stake_ratio(self) -> float:
        """Bằng tiền / Ván (%)."""
        n = self.num_rounds
        if n == 0:
            return 0.0
        return self.num_equal_stake / n

    @property
    def total_stake(self) -> float:
        """Tổng tiền cược cả hai bên."""
        return sum(r.amount_a + r.amount_b for r in self.matched_rounds)

    @property
    def total_diff(self) -> float:
        """Tổng ABS(Tiền A - Tiền B)."""
        return sum(abs(r.amount_a - r.amount_b) for r in self.matched_rounds)

    @property
    def num_same_hand(self) -> int:
        """Số ván cùng tay (unique round_id)."""
        return len({r.round_id for r in self.same_hand_rounds})

    @property
    def remark(self) -> str:
        """Ghi chú (备注)."""
        sh = self.num_same_hand
        if sh == 1:
            return "同手1局（未达淘汰条件）"
        return ""


@dataclass
class EliminatedPair:
    """Một cặp bị loại do cùng tay ≥2."""
    match_type: Literal["内对打", "外对打"]
    platform_a: str
    platform_b: str
    account_a: str
    account_b: str
    num_arb_rounds: int
    num_equal_stake: int
    total_stake: float
    total_diff: float
    num_same_hand: int
    remark: str = "同手≥2局，整组淘汰"


@dataclass
class DetectionResult:
    """Kết quả quét đối đả toàn bộ."""
    valid_pairs: list[ArbitragePair]
    eliminated_pairs: list[EliminatedPair]
    platforms: list[str]
    stats: dict


# ---------------------------------------------------------------------------
# Core Detection Engine
# ---------------------------------------------------------------------------

class ArbitrageDetector:
    """Engine quét đối đả / arbitrage."""

    def __init__(
        self,
        internal_min_rounds: int = 3,
        external_min_rounds: int = 4,
        min_equal_stake_ratio: float = 0.90,
        max_stake_diff_pct: float = 0.10,
        min_payout_pct: float = 0.90,
        max_payout_pct: float = 1.00,
        max_same_hand: int = 1,
    ):
        self.internal_min_rounds = internal_min_rounds
        self.external_min_rounds = external_min_rounds
        self.min_equal_stake_ratio = min_equal_stake_ratio
        self.max_stake_diff_pct = max_stake_diff_pct
        self.min_payout_pct = min_payout_pct
        self.max_payout_pct = max_payout_pct
        self.max_same_hand = max_same_hand

    def detect(
        self,
        platform_data: dict[str, list[RoundBets]],
    ) -> DetectionResult:
        """Chạy quét đối đả trên tất cả dữ liệu.

        Args:
            platform_data: {platform_name: [RoundBets, ...]}.
                           Dữ liệu đã gom (aggregate_round_bets).

        Returns:
            DetectionResult chứa cặp hợp lệ + cặp bị loại.
        """
        platforms = sorted(platform_data.keys())
        all_candidates: list[ArbitragePair] = []

        # --- 内对打: Quét trong từng đài ---
        for platform in platforms:
            rounds = platform_data[platform]
            pairs = self._scan_pairs(
                rounds_a=rounds,
                rounds_b=rounds,
                platform_a=platform,
                platform_b=platform,
                match_type="内对打",
                min_rounds=self.internal_min_rounds,
                is_internal=True,
            )
            all_candidates.extend(pairs)

        # --- 外对打: Quét giữa tất cả các đài ---
        for i, plat_a in enumerate(platforms):
            for plat_b in platforms[i + 1:]:
                pairs = self._scan_pairs(
                    rounds_a=platform_data[plat_a],
                    rounds_b=platform_data[plat_b],
                    platform_a=plat_a,
                    platform_b=plat_b,
                    match_type="外对打",
                    min_rounds=self.external_min_rounds,
                    is_internal=False,
                )
                all_candidates.extend(pairs)

        # --- Kiểm tra cùng tay & phân loại ---
        valid_pairs: list[ArbitragePair] = []
        eliminated_pairs: list[EliminatedPair] = []

        for pair in all_candidates:
            # Kiểm tra cùng tay
            same_hand = self._check_same_hand(
                pair, platform_data
            )
            pair.same_hand_rounds = same_hand

            if pair.num_same_hand >= 2:
                # LOẠI do cùng tay ≥2
                eliminated_pairs.append(EliminatedPair(
                    match_type=pair.match_type,
                    platform_a=pair.platform_a,
                    platform_b=pair.platform_b,
                    account_a=pair.account_a,
                    account_b=pair.account_b,
                    num_arb_rounds=pair.num_rounds,
                    num_equal_stake=pair.num_equal_stake,
                    total_stake=pair.total_stake,
                    total_diff=pair.total_diff,
                    num_same_hand=pair.num_same_hand,
                ))
            else:
                valid_pairs.append(pair)

        # --- Kiểm tra cuối bắt buộc theo Mục 14 ---
        self._validate_final_result(valid_pairs)

        # Stats
        stats = {
            "total_platforms": len(platforms),
            "total_valid_pairs": len(valid_pairs),
            "total_eliminated": len(eliminated_pairs),
            "internal_pairs": sum(
                1 for p in valid_pairs if p.match_type == "内对打"
            ),
            "external_pairs": sum(
                1 for p in valid_pairs if p.match_type == "外对打"
            ),
        }

        return DetectionResult(
            valid_pairs=valid_pairs,
            eliminated_pairs=eliminated_pairs,
            platforms=platforms,
            stats=stats,
        )

    def _validate_final_result(
        self,
        valid_pairs: list[ArbitragePair],
    ) -> None:
        """Kiểm tra cuối bắt buộc theo Mục 14 của tài liệu:
        - 内对打 không có Ván <3.
        - 外对打 không có Ván <4.
        - Không có Bằng tiền / Ván <90%.
        - Không có payout ngoài 90%–100%.
        - Mỗi ván phải một bên thắng, một bên thua.
        - Không có cặp 同手Ván ≥2 trong file kết quả chính.
        - Mỗi cặp + mỗi 三方游戏局号 chỉ tính 1 lần.
        - Chênh cược từng ván ≤10%.
        """
        for p in valid_pairs:
            # Ngưỡng ván
            if p.match_type == "内对打" and p.num_rounds < self.internal_min_rounds:
                raise ValueError(
                    f"Vi phạm kiểm tra cuối: Cặp {p.account_a}-{p.account_b} là 内对打 nhưng ván ({p.num_rounds}) < {self.internal_min_rounds}"
                )
            if p.match_type == "外对打" and p.num_rounds < self.external_min_rounds:
                raise ValueError(
                    f"Vi phạm kiểm tra cuối: Cặp {p.account_a}-{p.account_b} là 外对打 nhưng ván ({p.num_rounds}) < {self.external_min_rounds}"
                )
            # Tỷ lệ bằng tiền
            if round(p.equal_stake_ratio, 4) < round(self.min_equal_stake_ratio, 4):
                raise ValueError(
                    f"Vi phạm kiểm tra cuối: Cặp {p.account_a}-{p.account_b} có tỷ lệ bằng tiền {p.equal_stake_ratio:.1%} < {self.min_equal_stake_ratio:.0%}"
                )
            # Cùng tay
            if p.num_same_hand >= 2:
                raise ValueError(
                    f"Vi phạm kiểm tra cuối: Cặp {p.account_a}-{p.account_b} có {p.num_same_hand} ván cùng tay nằm trong kết quả chính"
                )
            # Từng ván đối đả
            seen_rids: set[str] = set()
            for r in p.matched_rounds:
                if r.round_id in seen_rids:
                    raise ValueError(
                        f"Vi phạm kiểm tra cuối: Trùng lặp round {r.round_id} trong cặp {p.account_a}-{p.account_b}"
                    )
                seen_rids.add(r.round_id)

                if not (self.min_payout_pct - 1e-4 <= r.payout_pct <= self.max_payout_pct + 1e-4):
                    raise ValueError(
                        f"Vi phạm kiểm tra cuối: Ván {r.round_id} có payout {r.payout_pct:.1%} ngoài phạm vi 90%-100%"
                    )
                if not ((r.win_loss_a > 0 and r.win_loss_b < 0) or (r.win_loss_a < 0 and r.win_loss_b > 0)):
                    raise ValueError(
                        f"Vi phạm kiểm tra cuối: Ván {r.round_id} không thỏa điều kiện 1 thắng 1 thua"
                    )
                if round(r.stake_diff_pct, 4) > round(self.max_stake_diff_pct, 4):
                    raise ValueError(
                        f"Vi phạm kiểm tra cuối: Ván {r.round_id} có chênh cược {r.stake_diff_pct:.1%} > {self.max_stake_diff_pct:.0%}"
                    )

    # -----------------------------------------------------------------
    # Internal: Scan pairs between two sets of round data
    # -----------------------------------------------------------------

    def _scan_pairs(
        self,
        rounds_a: list[RoundBets],
        rounds_b: list[RoundBets],
        platform_a: str,
        platform_b: str,
        match_type: Literal["内对打", "外对打"],
        min_rounds: int,
        is_internal: bool,
    ) -> list[ArbitragePair]:
        """Quét tất cả cặp tài khoản giữa rounds_a và rounds_b."""

        # Index: round_id → list of RoundBets
        idx_a: dict[str, list[RoundBets]] = defaultdict(list)
        for rb in rounds_a:
            if rb.bet_area is not None:  # Chỉ xét cửa đã nhận diện
                idx_a[rb.round_id].append(rb)

        idx_b: dict[str, list[RoundBets]] = defaultdict(list)
        for rb in rounds_b:
            if rb.bet_area is not None:
                idx_b[rb.round_id].append(rb)

        # Tìm round_ids chung
        common_rounds = set(idx_a.keys()) & set(idx_b.keys())

        # Thu thập matched rounds cho từng cặp account
        pair_matches: dict[
            tuple[str, str], list[MatchedRound]
        ] = defaultdict(list)

        for round_id in common_rounds:
            bets_a = idx_a[round_id]
            bets_b = idx_b[round_id]

            for ba in bets_a:
                for bb in bets_b:
                    # 内对打: phải khác account
                    if is_internal and ba.account == bb.account:
                        continue

                    # Không so sánh cùng 1 record
                    if ba is bb:
                        continue

                    # Sắp thứ tự account để tránh trùng lặp
                    if is_internal:
                        key = tuple(sorted([ba.account, bb.account]))
                        acc_a, acc_b = key
                        if ba.account == acc_a:
                            r_a, r_b = ba, bb
                        else:
                            r_a, r_b = bb, ba
                    else:
                        acc_a, acc_b = ba.account, bb.account
                        r_a, r_b = ba, bb

                    pair_key = (acc_a, acc_b)

                    # Đã có round này cho cặp này chưa?
                    # (mỗi cặp + mỗi round chỉ tính 1 lần)
                    existing_rounds = {
                        m.round_id for m in pair_matches[pair_key]
                    }
                    if round_id in existing_rounds:
                        continue

                    # Kiểm tra cửa đối nghịch
                    if not is_opposite(r_a.bet_area, r_b.bet_area):
                        continue

                    # Kiểm tra chênh cược ≤10%
                    max_amount = max(r_a.total_amount, r_b.total_amount)
                    if max_amount == 0:
                        continue
                    stake_diff = abs(
                        r_a.total_amount - r_b.total_amount
                    ) / max_amount
                    if round(stake_diff, 4) > round(self.max_stake_diff_pct, 4):
                        continue

                    # Bằng tiền chính xác?
                    is_equal = (abs(r_a.total_amount - r_b.total_amount) < 1e-4)

                    # Kiểm tra 1 thắng 1 thua
                    wl_a = r_a.total_win_loss
                    wl_b = r_b.total_win_loss
                    if not self._check_one_win_one_loss(wl_a, wl_b):
                        continue

                    # Kiểm tra payout 90-100%
                    payout = self._calc_payout(
                        r_a.total_amount, r_b.total_amount,
                        wl_a, wl_b,
                    )
                    if payout is None:
                        continue
                    if not (self.min_payout_pct - 1e-4 <= payout <= self.max_payout_pct + 1e-4):
                        continue

                    pair_matches[pair_key].append(MatchedRound(
                        round_id=round_id,
                        account_a=acc_a,
                        account_b=acc_b,
                        platform_a=platform_a,
                        platform_b=platform_b,
                        bet_area_a=r_a.bet_area,
                        bet_area_b=r_b.bet_area,
                        amount_a=r_a.total_amount,
                        amount_b=r_b.total_amount,
                        win_loss_a=wl_a,
                        win_loss_b=wl_b,
                        stake_diff_pct=stake_diff,
                        is_equal_stake=is_equal,
                        payout_pct=payout,
                    ))

        # Lọc theo ngưỡng
        result: list[ArbitragePair] = []
        for (acc_a, acc_b), matches in pair_matches.items():
            # Deduplicate by round_id
            seen_rounds: set[str] = set()
            unique_matches: list[MatchedRound] = []
            for m in matches:
                if m.round_id not in seen_rounds:
                    unique_matches.append(m)
                    seen_rounds.add(m.round_id)

            num_rounds = len(unique_matches)

            # Ngưỡng ván tối thiểu
            if num_rounds < min_rounds:
                continue

            # Ngưỡng bằng tiền / ván ≥ 90%
            num_equal = sum(1 for m in unique_matches if m.is_equal_stake)
            if num_rounds > 0 and round(num_equal / num_rounds, 4) < round(self.min_equal_stake_ratio, 4):
                continue

            result.append(ArbitragePair(
                match_type=match_type,
                platform_a=platform_a,
                platform_b=platform_b,
                account_a=acc_a,
                account_b=acc_b,
                matched_rounds=unique_matches,
                same_hand_rounds=[],
            ))

        return result

    # -----------------------------------------------------------------
    # Check same-hand (cùng tay) for a candidate pair
    # -----------------------------------------------------------------

    def _check_same_hand(
        self,
        pair: ArbitragePair,
        platform_data: dict[str, list[RoundBets]],
    ) -> list[SameHandRound]:
        """Quay lại file gốc, tìm tất cả round mà 2 tài khoản cùng xuất hiện
        và cược cùng cửa (同手)."""

        acc_a = pair.account_a
        acc_b = pair.account_b

        # Thu thập RoundBets cho account A và B
        bets_a: dict[str, RoundBets] = {}
        bets_b: dict[str, RoundBets] = {}

        if pair.match_type == "内对打":
            # Cùng đài
            for rb in platform_data[pair.platform_a]:
                if rb.account == acc_a and rb.bet_area is not None:
                    bets_a[rb.round_id] = rb
                elif rb.account == acc_b and rb.bet_area is not None:
                    bets_b[rb.round_id] = rb
        else:
            # Khác đài
            for rb in platform_data[pair.platform_a]:
                if rb.account == acc_a and rb.bet_area is not None:
                    bets_a[rb.round_id] = rb
            for rb in platform_data[pair.platform_b]:
                if rb.account == acc_b and rb.bet_area is not None:
                    bets_b[rb.round_id] = rb

        # Tìm rounds cùng xuất hiện
        common = set(bets_a.keys()) & set(bets_b.keys())
        same_hand_rounds: list[SameHandRound] = []
        seen: set[str] = set()

        for round_id in common:
            if round_id in seen:
                continue
            ra = bets_a[round_id]
            rb = bets_b[round_id]

            # Check same-hand:
            # Banker+Banker, Player+Player, Dragon+Dragon, Tiger+Tiger,
            # Big+Big, Small+Small, Odd+Odd, Even+Even, Red+Red, Black+Black
            # hoặc cùng một cửa cược giống nhau trong cùng game và cùng 三方游戏局号.
            is_sh = False
            if is_same_hand(ra.bet_area, rb.bet_area):
                is_sh = True
            else:
                for rec_a in ra.raw_records:
                    for rec_b in rb.raw_records:
                        if is_same_hand(rec_a.bet_area, rec_b.bet_area):
                            is_sh = True
                            break
                        if (
                            rec_a.bet_area_raw and rec_b.bet_area_raw
                            and rec_a.bet_area_raw.strip().lower() == rec_b.bet_area_raw.strip().lower()
                        ):
                            is_sh = True
                            break
                    if is_sh:
                        break

            if is_sh:
                same_hand_rounds.append(SameHandRound(
                    round_id=round_id,
                    account_a=acc_a,
                    account_b=acc_b,
                    platform_a=ra.platform,
                    platform_b=rb.platform,
                    bet_area_a=str(ra.bet_area),
                    bet_area_b=str(rb.bet_area),
                    amount_a=ra.total_amount,
                    amount_b=rb.total_amount,
                ))
                seen.add(round_id)

        return same_hand_rounds

    # -----------------------------------------------------------------
    # Helpers
    # -----------------------------------------------------------------

    @staticmethod
    def _check_one_win_one_loss(wl_a: float, wl_b: float) -> bool:
        """Một bên phải thắng (>0), một bên phải thua (<0).
        Hai bên cùng thắng hoặc cùng thua -> LOẠI."""
        if wl_a > 0 and wl_b < 0:
            return True
        if wl_a < 0 and wl_b > 0:
            return True
        return False

    @staticmethod
    def _calc_payout(
        amount_a: float,
        amount_b: float,
        wl_a: float,
        wl_b: float,
    ) -> float | None:
        """Tính payout percentage.

        Hợp lệ: 90%–100%.
        Ví dụ:
            100 → -100 và 100 → +100 (payout 100% ✓)
            100 → -100 và 100 → +95  (payout 95% ✓)
            100 → -100 và 100 → +90  (payout 90% ✓)
        Loại:
            100 → -100 và 100 → +89  (payout 89% ✗)
            100 → -100 và 100 → +300 (payout 300% ✗)
            100 → -100 và 100 → +20  (payout 20% ✗)
        """
        if wl_a > 0 and wl_b < 0:
            winner_wl = wl_a
            winner_amount = amount_a
            loser_amount = amount_b
            loser_wl = wl_b
        elif wl_b > 0 and wl_a < 0:
            winner_wl = wl_b
            winner_amount = amount_b
            loser_amount = amount_a
            loser_wl = wl_a
        else:
            return None

        if winner_amount <= 0 or loser_amount <= 0:
            return None

        # Payout tính theo tỷ lệ tiền thắng / tiền cược bên thắng
        payout = abs(winner_wl) / winner_amount
        return payout
