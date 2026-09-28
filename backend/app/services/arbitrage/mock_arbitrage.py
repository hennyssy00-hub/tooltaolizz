"""
mock_arbitrage.py — Tạo dữ liệu giả lập cho test module quét đối đả.

Tạo 3 file CSV giả lập 3 đài (22, 87, AG) với các pattern gian lận cài sẵn:
- 2 cặp cross-hedge (đối đả ngoài đài)
- 1 cặp đối đả trong đài
- 1 cặp bị loại do cùng tay ≥2
- Dữ liệu bình thường của nhiều tài khoản khác

Chạy: python -m app.services.arbitrage.mock_arbitrage
"""

from __future__ import annotations

import csv
import os
import random
from datetime import datetime, timedelta

# Output directory
OUTPUT_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    "mock_data", "arbitrage"
)

# Game providers
PROVIDERS = ["AG-LIVE", "SEXY-LIVE", "EVO-LIVE"]

# Game types & their opposite bets
GAMES = {
    "百家乐": [("庄", "闲"), ("大", "小")],
    "龙虎": [("龙", "虎")],
    "骰宝": [("大", "小"), ("单", "双")],
}

# Normal accounts
NORMAL_ACCOUNTS_22 = [f"user22_{i:04d}" for i in range(1, 21)]
NORMAL_ACCOUNTS_87 = [f"user87_{i:04d}" for i in range(1, 21)]
NORMAL_ACCOUNTS_AG = [f"userag_{i:04d}" for i in range(1, 16)]

# Fraud accounts
# Pair 1: 外对打 between 22 and 87 (should be detected)
FRAUD_A1_22 = "0088001"   # Account on 22
FRAUD_A1_87 = "0077001"   # Account on 87

# Pair 2: 外对打 between 22 and AG (should be detected)
FRAUD_A2_22 = "0088002"
FRAUD_A2_AG = "00ag002"

# Pair 3: 内对打 within 87 (should be detected)
FRAUD_INTERNAL_87_A = "0077010"
FRAUD_INTERNAL_87_B = "0077011"

# Pair 4: 外对打 between 87 and AG — but has 同手 ≥2 (should be ELIMINATED)
FRAUD_SAMEHAND_87 = "0077020"
FRAUD_SAMEHAND_AG = "00ag020"

GROUND_TRUTH = {
    "valid_external_pairs": [
        {"type": "外对打", "platform_a": "22", "platform_b": "87",
         "account_a": FRAUD_A1_22, "account_b": FRAUD_A1_87, "rounds": 5},
        {"type": "外对打", "platform_a": "22", "platform_b": "AG",
         "account_a": FRAUD_A2_22, "account_b": FRAUD_A2_AG, "rounds": 4},
    ],
    "valid_internal_pairs": [
        {"type": "内对打", "platform": "87",
         "account_a": FRAUD_INTERNAL_87_A, "account_b": FRAUD_INTERNAL_87_B, "rounds": 3},
    ],
    "eliminated_pairs": [
        {"type": "外对打", "platform_a": "87", "platform_b": "AG",
         "account_a": FRAUD_SAMEHAND_87, "account_b": FRAUD_SAMEHAND_AG,
         "arb_rounds": 4, "same_hand_rounds": 3, "reason": "同手≥2局"},
    ],
}


def _gen_round_id(base: int, idx: int) -> str:
    """Generate unique round ID."""
    return f"R{base:06d}{idx:04d}"


def _gen_game_id() -> str:
    return f"G{random.randint(100000, 999999)}"


def _random_bet(game_type: str) -> tuple[str, str]:
    """Random bet for a game. Returns (bet_choice, opposite_choice)."""
    pairs = GAMES[game_type]
    pair = random.choice(pairs)
    if random.random() > 0.5:
        return pair
    return (pair[1], pair[0])


def generate():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    base_time = datetime(2024, 3, 15, 10, 0, 0)
    round_base = 100000

    rows_22: list[dict] = []
    rows_87: list[dict] = []
    rows_ag: list[dict] = []

    round_counter = [0]

    def next_round():
        round_counter[0] += 1
        return _gen_round_id(round_base, round_counter[0])

    # ====================================================================
    # FRAUD PAIR 1: 外对打 22↔87, 5 rounds, 庄↔闲, equal stake
    # ====================================================================
    for i in range(5):
        rid = next_round()
        gid = _gen_game_id()
        provider = "SEXY-LIVE"
        game = "百家乐"
        amount = random.choice([100, 200, 500, 1000])
        ts = (base_time + timedelta(minutes=i * 3)).isoformat()

        # Account on 22 bets 庄
        rows_22.append({
            "账号": FRAUD_A1_22, "三方游戏编号": gid,
            "三方游戏局号": rid, "投注区域": "庄",
            "投注金额": amount, "游戏输赢": -amount,
        })
        # Account on 87 bets 闲 (wins)
        rows_87.append({
            "账号": FRAUD_A1_87, "三方游戏编号": gid,
            "三方游戏局号": rid, "投注区域": "闲",
            "投注金额": amount, "游戏输赢": amount * random.choice([0.95, 1.0, 0.98]),
        })

    # ====================================================================
    # FRAUD PAIR 2: 外对打 22↔AG, 4 rounds, 龙↔虎, equal stake
    # ====================================================================
    for i in range(4):
        rid = next_round()
        gid = _gen_game_id()
        amount = 500
        ts = (base_time + timedelta(minutes=20 + i * 5)).isoformat()

        rows_22.append({
            "账号": FRAUD_A2_22, "三方游戏编号": gid,
            "三方游戏局号": rid, "投注区域": "龙",
            "投注金额": amount, "游戏输赢": amount,
        })
        rows_ag.append({
            "账号": FRAUD_A2_AG, "三方游戏编号": gid,
            "三方游戏局号": rid, "投注区域": "虎",
            "投注金额": amount, "游戏输赢": -amount,
        })

    # ====================================================================
    # FRAUD PAIR 3: 内对打 within 87, 3 rounds, 大↔小
    # ====================================================================
    for i in range(3):
        rid = next_round()
        gid = _gen_game_id()
        amount = 300
        wl = amount if random.random() > 0.5 else -amount

        rows_87.append({
            "账号": FRAUD_INTERNAL_87_A, "三方游戏编号": gid,
            "三方游戏局号": rid, "投注区域": "大",
            "投注金额": amount, "游戏输赢": wl,
        })
        rows_87.append({
            "账号": FRAUD_INTERNAL_87_B, "三方游戏编号": gid,
            "三方游戏局号": rid, "投注区域": "小",
            "投注金额": amount, "游戏输赢": -wl,
        })

    # ====================================================================
    # FRAUD PAIR 4: 外对打 87↔AG, 4 arb rounds + 3 same-hand → ELIMINATE
    # ====================================================================
    # 4 opposite rounds
    for i in range(4):
        rid = next_round()
        gid = _gen_game_id()
        amount = 200

        rows_87.append({
            "账号": FRAUD_SAMEHAND_87, "三方游戏编号": gid,
            "三方游戏局号": rid, "投注区域": "庄",
            "投注金额": amount, "游戏输赢": -amount,
        })
        rows_ag.append({
            "账号": FRAUD_SAMEHAND_AG, "三方游戏编号": gid,
            "三方游戏局号": rid, "投注区域": "闲",
            "投注金额": amount, "游戏输赢": amount,
        })

    # 3 same-hand rounds (both bet 庄)
    for i in range(3):
        rid = next_round()
        gid = _gen_game_id()
        amount = 200
        wl = random.choice([amount, -amount])

        rows_87.append({
            "账号": FRAUD_SAMEHAND_87, "三方游戏编号": gid,
            "三方游戏局号": rid, "投注区域": "庄",
            "投注金额": amount, "游戏输赢": wl,
        })
        rows_ag.append({
            "账号": FRAUD_SAMEHAND_AG, "三方游戏编号": gid,
            "三方游戏局号": rid, "投注区域": "庄",
            "投注金额": amount, "游戏输赢": wl,
        })

    # ====================================================================
    # NORMAL DATA — regular players
    # ====================================================================
    for _ in range(200):
        rid = next_round()
        gid = _gen_game_id()
        game = random.choice(list(GAMES.keys()))
        bet, _ = _random_bet(game)
        amount = random.choice([50, 100, 200, 500, 1000, 2000])
        wl = random.choice([amount, -amount, round(amount * 0.95, 2), round(-amount * 0.95, 2)])

        acc = random.choice(NORMAL_ACCOUNTS_22)
        rows_22.append({
            "账号": acc, "三方游戏编号": gid,
            "三方游戏局号": rid, "投注区域": bet,
            "投注金额": amount, "游戏输赢": wl,
        })

    for _ in range(180):
        rid = next_round()
        gid = _gen_game_id()
        game = random.choice(list(GAMES.keys()))
        bet, _ = _random_bet(game)
        amount = random.choice([50, 100, 200, 500, 1000])
        wl = random.choice([amount, -amount])

        acc = random.choice(NORMAL_ACCOUNTS_87)
        rows_87.append({
            "账号": acc, "三方游戏编号": gid,
            "三方游戏局号": rid, "投注区域": bet,
            "投注金额": amount, "游戏输赢": wl,
        })

    for _ in range(150):
        rid = next_round()
        gid = _gen_game_id()
        game = random.choice(list(GAMES.keys()))
        bet, _ = _random_bet(game)
        amount = random.choice([100, 200, 500])
        wl = random.choice([amount, -amount])

        acc = random.choice(NORMAL_ACCOUNTS_AG)
        rows_ag.append({
            "账号": acc, "三方游戏编号": gid,
            "三方游戏局号": rid, "投注区域": bet,
            "投注金额": amount, "游戏输赢": wl,
        })

    # Write CSV files
    fields = ["账号", "三方游戏编号", "三方游戏局号", "投注区域", "投注金额", "游戏输赢"]

    for name, rows in [("22", rows_22), ("87", rows_87), ("AG", rows_ag)]:
        path = os.path.join(OUTPUT_DIR, f"game_data_{name}.csv")
        with open(path, "w", newline="", encoding="utf-8-sig") as f:
            writer = csv.DictWriter(f, fieldnames=fields)
            writer.writeheader()
            writer.writerows(rows)
        print(f"Created {path} ({len(rows)} records)")

    print(f"\nGROUND TRUTH:")
    import json
    print(json.dumps(GROUND_TRUTH, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    generate()
