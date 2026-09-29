"""
rules.py — Quy tắc cửa đối nghịch và cùng tay cho quét đối đả.

Opposite bet pairs (đối nghịch rõ ràng, gần 1:1):
  Banker ↔ Player  /  庄 ↔ 闲
  Dragon ↔ Tiger   /  龙 ↔ 虎
  Big ↔ Small      /  大 ↔ 小
  Odd ↔ Even       /  单 ↔ 双
  Red ↔ Black

Same-hand (cùng tay): cùng cửa trong cùng round.
"""

from __future__ import annotations

# ---------------------------------------------------------------------------
# 1. Chuẩn hóa tên cửa cược → dạng chuẩn (UPPER, tiếng Anh)
# ---------------------------------------------------------------------------

_BET_NORMALIZE: dict[str, str] = {
    # Banker
    "banker": "BANKER", "bank": "BANKER", "b": "BANKER",
    "庄": "BANKER", "莊": "BANKER", "cái": "BANKER", "cai": "BANKER",
    "nhà cái": "BANKER", "nha cai": "BANKER",
    # Player
    "player": "PLAYER", "play": "PLAYER", "p": "PLAYER",
    "闲": "PLAYER", "閒": "PLAYER", "con": "PLAYER",
    "người chơi": "PLAYER", "nguoi choi": "PLAYER",
    # Dragon
    "dragon": "DRAGON", "龙": "DRAGON", "龍": "DRAGON",
    "rồng": "DRAGON", "rong": "DRAGON",
    # Tiger
    "tiger": "TIGER", "虎": "TIGER",
    "hổ": "TIGER", "ho": "TIGER",
    # Big
    "big": "BIG", "over": "BIG", "大": "BIG",
    "tài": "BIG", "tai": "BIG", "o": "BIG",
    # Small
    "small": "SMALL", "under": "SMALL", "小": "SMALL",
    "xỉu": "SMALL", "xiu": "SMALL", "u": "SMALL",
    # Odd
    "odd": "ODD", "单": "ODD", "單": "ODD",
    "lẻ": "ODD", "le": "ODD",
    # Even
    "even": "EVEN", "双": "EVEN", "雙": "EVEN",
    "chẵn": "EVEN", "chan": "EVEN",
    # Red
    "red": "RED", "r": "RED", "红": "RED", "紅": "RED",
    "đỏ": "RED", "do": "RED",
    # Black
    "black": "BLACK", "blk": "BLACK", "黑": "BLACK",
    "đen": "BLACK", "den": "BLACK",
    # Tie (not opposite to anything — kept for reference only)
    "tie": "TIE", "和": "TIE", "hòa": "TIE", "hoa": "TIE", "t": "TIE",
}

# ---------------------------------------------------------------------------
# 2. Cặp đối nghịch — chỉ nhận các cửa đối nghịch rõ ràng
# ---------------------------------------------------------------------------

OPPOSITE_PAIRS: set[frozenset[str]] = {
    frozenset({"BANKER", "PLAYER"}),
    frozenset({"DRAGON", "TIGER"}),
    frozenset({"BIG", "SMALL"}),
    frozenset({"ODD", "EVEN"}),
    frozenset({"RED", "BLACK"}),
}

# Fast lookup: normalised choice → its opposite
_OPPOSITE_MAP: dict[str, str] = {}
for _pair in OPPOSITE_PAIRS:
    _a, _b = tuple(_pair)
    _OPPOSITE_MAP[_a] = _b
    _OPPOSITE_MAP[_b] = _a


# ---------------------------------------------------------------------------
# 3. Cặp cùng tay (same-hand) — cùng cửa cược
# ---------------------------------------------------------------------------

SAME_HAND_CHOICES: set[str] = {
    "BANKER", "PLAYER",
    "DRAGON", "TIGER",
    "BIG", "SMALL",
    "ODD", "EVEN",
    "RED", "BLACK",
}


# ---------------------------------------------------------------------------
# Public helpers
# ---------------------------------------------------------------------------

def normalize_bet_choice(raw: str) -> str | None:
    """Chuẩn hóa cửa cược thô → dạng chuẩn.
    Trả về None nếu không nhận diện được."""
    if raw is None:
        return None
    key = str(raw).strip().lower()
    if key in _BET_NORMALIZE:
        return _BET_NORMALIZE[key]

    # Check composite prefixes/suffixes (e.g. BacBo_Player, Baccarat_Banker)
    if 'player' in key or 'người chơi' in key or 'nguoi choi' in key or key.endswith('_p'):
        return 'PLAYER'
    if 'banker' in key or 'nhà cái' in key or 'nha cai' in key or key.endswith('_b'):
        return 'BANKER'
    if 'tie' in key or 'hòa' in key or 'hoa' in key or key.endswith('_t'):
        return 'TIE'
    if 'big' in key or 'tài' in key:
        return 'BIG'
    if 'small' in key or 'xỉu' in key:
        return 'SMALL'

    return None


def is_opposite(choice_a: str, choice_b: str) -> bool:
    """Hai cửa có đối nghịch nhau không?"""
    return frozenset({choice_a, choice_b}) in OPPOSITE_PAIRS


def get_opposite(choice: str) -> str | None:
    """Trả về cửa đối nghịch, None nếu không có."""
    return _OPPOSITE_MAP.get(choice)


def is_same_hand(choice_a: str, choice_b: str) -> bool:
    """Hai cửa có phải cùng tay (cùng cửa) không?"""
    if choice_a == choice_b and choice_a in SAME_HAND_CHOICES:
        return True
    return False


# ---------------------------------------------------------------------------
# Platform name display rules (Quy tắc tên đài)
# ---------------------------------------------------------------------------

_PLATFORM_DISPLAY: dict[str, str] = {
    "22": "2222",
    "87": "8777",
}


def display_platform(name: str) -> str:
    """Áp dụng quy tắc hiển thị tên đài."""
    stripped = str(name).strip()
    return _PLATFORM_DISPLAY.get(stripped, stripped)
