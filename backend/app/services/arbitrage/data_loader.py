"""
data_loader.py — Load & chuẩn hóa dữ liệu game từ file Excel/CSV.

Mỗi file đại diện cho 1 đài (platform).
Các cột cần thiết:
  - 账号 / tài khoản (account)
  - 三方游戏编号 (game_id)
  - 三方游戏局号 (round_id)
  - 投注区域 (bet_area)
  - 投注金额 (bet_amount)
  - 游戏输赢 (win_loss)
"""

from __future__ import annotations

import os
import re
from dataclasses import dataclass, field
from typing import Any

import pandas as pd

from .rules import normalize_bet_choice


# ---------------------------------------------------------------------------
# Data structures
# ---------------------------------------------------------------------------

@dataclass
class BetRecord:
    """Một dòng cược đã chuẩn hóa."""
    platform: str          # Tên đài gốc (chưa display)
    account: str           # Tài khoản (dạng text, giữ số 0 đầu)
    game_id: str           # 三方游戏编号
    round_id: str          # 三方游戏局号
    bet_area_raw: str      # Cửa cược gốc
    bet_area: str | None   # Cửa cược đã chuẩn hóa (BANKER, PLAYER, ...)
    bet_amount: float      # 投注金额
    win_loss: float        # 游戏输赢 (>0 thắng, <0 thua, =0 hòa)


@dataclass
class RoundBets:
    """Tất cả cược của 1 tài khoản trong 1 round, đã gom."""
    platform: str
    account: str
    round_id: str
    game_id: str
    bet_area: str | None   # Cửa cược chính (sau khi gom)
    total_amount: float    # Tổng tiền cược
    total_win_loss: float  # Tổng thắng/thua
    raw_records: list[BetRecord] = field(default_factory=list)


# ---------------------------------------------------------------------------
# Column detection (auto-detect column names)
# ---------------------------------------------------------------------------

_COL_PATTERNS: dict[str, list[str]] = {
    "account": [
        "账号", "帐号", "用户名", "会员", "member", "username",
        "player", "tài khoản", "tai khoan", "account", "user",
    ],
    "game_id": [
        "三方游戏编号", "游戏编号", "game_id", "game id", "gameid",
        "三方编号", "第三方编号",
    ],
    "round_id": [
        "三方游戏局号", "游戏局号", "局号", "round_id", "round id",
        "roundid", "三方局号", "第三方局号", "注单号",
    ],
    "bet_area": [
        "投注区域", "下注区域", "投注内容", "下注内容", "bet_area",
        "bet area", "投注类型", "下注类型", "cửa cược",
    ],
    "bet_amount": [
        "投注金额", "下注金额", "投注额", "下注额", "bet_amount",
        "bet amount", "stake", "tiền cược",
    ],
    "win_loss": [
        "游戏输赢", "输赢", "输赢金额", "盈亏", "win_loss",
        "win loss", "winloss", "profit", "thắng thua",
        "派彩", "结果金额",
    ],
}


def _detect_column(df_columns: list[str], field_name: str) -> str | None:
    """Tự động phát hiện cột dựa trên danh sách pattern."""
    patterns = _COL_PATTERNS.get(field_name, [])
    # Exact match first (case-insensitive)
    lower_cols = {c.strip().lower(): c for c in df_columns}
    for pat in patterns:
        if pat.lower() in lower_cols:
            return lower_cols[pat.lower()]
    # Partial match
    for pat in patterns:
        for col in df_columns:
            if pat.lower() in col.strip().lower():
                return col
    return None


def _detect_columns(df: pd.DataFrame) -> dict[str, str]:
    """Phát hiện mapping tất cả cột cần thiết."""
    mapping: dict[str, str] = {}
    for field_name in _COL_PATTERNS:
        col = _detect_column(list(df.columns), field_name)
        if col:
            mapping[field_name] = col
    return mapping


# ---------------------------------------------------------------------------
# Loading
# ---------------------------------------------------------------------------

def load_platform_file(
    file_path: str,
    platform_name: str,
    column_mapping: dict[str, str] | None = None,
    sheet_name: int | str = 0,
) -> list[BetRecord]:
    """Load 1 file game của 1 đài → list[BetRecord].

    Args:
        file_path: Đường dẫn file Excel (.xlsx/.xls) hoặc CSV.
        platform_name: Tên đài.
        column_mapping: Mapping thủ công {field_name: column_name}.
                        Nếu None thì auto-detect.
        sheet_name: Tên hoặc index sheet (mặc định sheet đầu tiên).

    Returns:
        Danh sách BetRecord đã chuẩn hóa.
    """
    ext = os.path.splitext(file_path)[1].lower()

_NUM_CLEAN_RE = re.compile(r"[^\d.\-]")


def _parse_number(val: Any) -> float | None:
    """Parse giá trị số siêu tốc từ text, xử lý dấu phẩy, khoảng trắng, tiền tệ."""
    if val is None:
        return None
    if isinstance(val, (int, float)):
        return float(val)
    s = str(val).strip().replace(",", "").replace(" ", "")
    if not s or s == "nan" or s == "None":
        return None
    try:
        return float(s)
    except ValueError:
        cleaned = _NUM_CLEAN_RE.sub("", s)
        if cleaned:
            try:
                return float(cleaned)
            except ValueError:
                return None
        return None


def load_platform_file(
    file_path: str,
    platform_name: str,
    column_mapping: dict[str, str] | None = None,
    sheet_name: int | str = 0,
) -> list[BetRecord]:
    """Load 1 file game của 1 đài với hiệu năng tối đa (Vectorized/Array iteration).

    Args:
        file_path: Đường dẫn file Excel (.xlsx/.xls) hoặc CSV.
        platform_name: Tên đài.
        column_mapping: Mapping thủ công {field_name: column_name}.
                        Nếu None thì auto-detect.
        sheet_name: Tên hoặc index sheet (mặc định sheet đầu tiên).

    Returns:
        Danh sách BetRecord đã chuẩn hóa.
    """
    ext = os.path.splitext(file_path)[1].lower()

    if ext in (".xlsx", ".xls"):
        # openpyxl engine with dtype=str to preserve leading zeros
        df = pd.read_excel(
            file_path,
            sheet_name=sheet_name,
            dtype=str,
            engine="openpyxl" if ext == ".xlsx" else None,
        )
    elif ext == ".csv":
        # Tự động thử các bảng mã phổ biến của sảnh Casino Trung Quốc & Quốc Tế
        df = None
        for enc in ["utf-8-sig", "gb18030", "gbk", "utf-8", "big5", "latin1"]:
            try:
                df = pd.read_csv(file_path, dtype=str, encoding=enc)
                break
            except (UnicodeDecodeError, Exception):
                continue
        if df is None:
            df = pd.read_csv(file_path, dtype=str, encoding_errors="replace")
    else:
        raise ValueError(f"Định dạng file không được hỗ trợ: {ext}")

    # Detect or use provided column mapping
    col_map = column_mapping if column_mapping else _detect_columns(df)

    # Validate required columns
    required = ["account", "round_id", "bet_area", "bet_amount", "win_loss"]
    missing = [f for f in required if f not in col_map]
    if missing:
        available = list(df.columns)
        raise ValueError(
            f"Không tìm thấy cột cho: {missing}. "
            f"Các cột có trong file: {available}"
        )

    # Trích xuất dạng NumPy / Series arrays trực tiếp (nhanh hơn df.iterrows() 50-100 lần)
    acc_col = col_map["account"]
    rid_col = col_map["round_id"]
    area_col = col_map["bet_area"]
    amt_col = col_map["bet_amount"]
    wl_col = col_map["win_loss"]
    gid_col = col_map.get("game_id")

    accounts = df[acc_col].astype(str).values
    round_ids = df[rid_col].astype(str).values
    bet_areas = df[area_col].astype(str).values
    amounts = df[amt_col].values
    win_losses = df[wl_col].values
    game_ids = df[gid_col].astype(str).values if (gid_col and gid_col in df) else None

    records: list[BetRecord] = []
    n_rows = len(df)

    for i in range(n_rows):
        account = accounts[i].strip()
        if not account or account == "nan":
            continue

        round_id = round_ids[i].strip()
        if not round_id or round_id == "nan":
            continue

        game_id = ""
        if game_ids is not None:
            g = game_ids[i].strip()
            if g and g != "nan":
                game_id = g

        bet_area_raw = bet_areas[i].strip()
        bet_area = normalize_bet_choice(bet_area_raw)

        bet_amount = _parse_number(amounts[i])
        if bet_amount is None or bet_amount <= 0:
            continue

        win_loss = _parse_number(win_losses[i])
        if win_loss is None:
            continue

        records.append(BetRecord(
            platform=platform_name,
            account=account,
            game_id=game_id,
            round_id=round_id,
            bet_area_raw=bet_area_raw,
            bet_area=bet_area,
            bet_amount=bet_amount,
            win_loss=win_loss,
        ))

    return records


# ---------------------------------------------------------------------------
# Gom cược theo (account, round_id)
# ---------------------------------------------------------------------------

def aggregate_round_bets(records: list[BetRecord]) -> list[RoundBets]:
    """Gom các dòng cược của cùng 1 tài khoản trong cùng 1 round.

    Quy tắc:
    - Nếu cùng tài khoản + cùng round_id có nhiều dòng cược,
      gom lại thành 1 RoundBets.
    - bet_area: lấy cửa cược chính (cửa xuất hiện nhiều nhất
      hoặc cửa có tổng tiền cược lớn nhất).
    - total_amount: tổng tiền cược.
    - total_win_loss: tổng thắng/thua.
    """
    from collections import defaultdict

    # Group by (platform, account, round_id)
    groups: dict[tuple[str, str, str], list[BetRecord]] = defaultdict(list)
    for r in records:
        key = (r.platform, r.account, r.round_id)
        groups[key].append(r)

    result: list[RoundBets] = []
    for (platform, account, round_id), recs in groups.items():
        total_amount = sum(r.bet_amount for r in recs)
        total_wl = sum(r.win_loss for r in recs)
        game_id = recs[0].game_id

        # Determine primary bet area
        # Nếu chỉ 1 cửa → dùng cửa đó
        # Nếu nhiều cửa → lấy cửa có tổng tiền cược lớn nhất
        area_amounts: dict[str | None, float] = defaultdict(float)
        for r in recs:
            area_amounts[r.bet_area] += r.bet_amount

        primary_area = max(area_amounts, key=area_amounts.get)  # type: ignore

        result.append(RoundBets(
            platform=platform,
            account=account,
            round_id=round_id,
            game_id=game_id,
            bet_area=primary_area,
            total_amount=total_amount,
            total_win_loss=total_wl,
            raw_records=recs,
        ))

    return result
