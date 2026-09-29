"""
Data normalizer: Standardizes game types, sports, bet choices, and market types
from both Casino and Sports platforms into a unified format.
"""

# Categorization mapping
SPORTS_GAMES = {'SOCCER', 'FOOTBALL', 'BASKETBALL', 'TENNIS', 'ESPORTS', 'BASEBALL'}

GAME_TYPE_MAP = {
    # --- CASINO GAMES ---
    # Chinese
    '百家乐': 'BACCARAT', '骰宝': 'SICBO', '轮盘': 'ROULETTE',
    '龙虎': 'DRAGON_TIGER', '番摊': 'FANTAN', '牛牛': 'BULL_BULL',
    # English
    'Baccarat': 'BACCARAT', 'BAC': 'BACCARAT', 'bac': 'BACCARAT', 'baccarat': 'BACCARAT',
    'Sic Bo': 'SICBO', 'Sicbo': 'SICBO', 'sicbo': 'SICBO', 'SBO': 'SICBO',
    'Tai Xiu': 'SICBO', 'tai xiu': 'SICBO',
    'Roulette': 'ROULETTE', 'RLT': 'ROULETTE', 'roulette': 'ROULETTE',
    'Dragon Tiger': 'DRAGON_TIGER', 'DT': 'DRAGON_TIGER', 'dragon tiger': 'DRAGON_TIGER',
    'Fan Tan': 'FANTAN', 'fantan': 'FANTAN',
    'Bull Bull': 'BULL_BULL', 'Niu Niu': 'BULL_BULL', 'bull bull': 'BULL_BULL',
    # Vietnamese
    'Tài Xỉu': 'SICBO', 'Rồng Hổ': 'DRAGON_TIGER',

    # --- SPORTS GAMES ---
    'Soccer': 'SOCCER', 'Football': 'SOCCER', 'Bóng đá': 'SOCCER', 'Bóng Đá': 'SOCCER',
    'Basketball': 'BASKETBALL', 'Bóng rổ': 'BASKETBALL', 'Bóng Rổ': 'BASKETBALL',
    'Tennis': 'TENNIS', 'Quần vợt': 'TENNIS',
    'Esports': 'ESPORTS', 'Thể thao điện tử': 'ESPORTS', 'E-Sports': 'ESPORTS',
    'Baseball': 'BASEBALL', 'Bóng chày': 'BASEBALL',
}

BET_CHOICE_MAP = {
    # --- CASINO CHOICES ---
    # Chinese
    '庄': 'BANKER', '闲': 'PLAYER', '和': 'TIE',
    '大': 'BIG', '小': 'SMALL', '单': 'ODD', '双': 'EVEN',
    '龙': 'DRAGON', '虎': 'TIGER', '红': 'RED', '黑': 'BLACK',
    # English
    'Banker': 'BANKER', 'BANK': 'BANKER', 'B': 'BANKER', 'banker': 'BANKER',
    'Player': 'PLAYER', 'PLAY': 'PLAYER', 'P': 'PLAYER', 'player': 'PLAYER',
    'Tie': 'TIE', 'T': 'TIE', 'tie': 'TIE', 'Draw': 'TIE',
    'Big': 'BIG', 'Over': 'BIG', 'O': 'BIG', 'big': 'BIG',
    'Small': 'SMALL', 'Under': 'SMALL', 'U': 'SMALL', 'small': 'SMALL',
    'Odd': 'ODD', 'odd': 'ODD', 'Even': 'EVEN', 'even': 'EVEN',
    'Dragon': 'DRAGON', 'dragon': 'DRAGON', 'Tiger': 'TIGER', 'tiger': 'TIGER',
    'Red': 'RED', 'R': 'RED', 'red': 'RED',
    'Black': 'BLACK', 'BLK': 'BLACK', 'black': 'BLACK',
    # Vietnamese
    'Cái': 'BANKER', 'cái': 'BANKER', 'Nhà cái': 'BANKER', 'nhà cái': 'BANKER', 'nha cai': 'BANKER',
    'Con': 'PLAYER', 'con': 'PLAYER', 'Người chơi': 'PLAYER', 'người chơi': 'PLAYER', 'nguoi choi': 'PLAYER',
    'Hòa': 'TIE', 'hòa': 'TIE', 'hoa': 'TIE',
    'Tài': 'BIG', 'tài': 'BIG', 'Xỉu': 'SMALL', 'xỉu': 'SMALL',
    'Lẻ': 'ODD', 'lẻ': 'ODD', 'Chẵn': 'EVEN', 'chẵn': 'EVEN',
    'Rồng': 'DRAGON', 'rồng': 'DRAGON', 'Hổ': 'TIGER', 'hổ': 'TIGER',
    'Đỏ': 'RED', 'đỏ': 'RED', 'Đen': 'BLACK', 'đen': 'BLACK',

    # --- SPORTS CHOICES & MARKETS ---
    'Home': 'HOME', 'Đội Nhà': 'HOME', 'Chủ Nhà': 'HOME', '1': 'HOME', 'H': 'HOME',
    'Away': 'AWAY', 'Đội Khách': 'AWAY', 'Khách': 'AWAY', '2': 'AWAY', 'A': 'AWAY',
    'Over/Under': 'OU', 'Tài/Xỉu': 'OU',
    'Over': 'OVER', 'Tài Bàn Thắng': 'OVER',
    'Under': 'UNDER', 'Xỉu Bàn Thắng': 'UNDER',
    'Handicap Home': 'HANDICAP_HOME', 'Kèo trên': 'HANDICAP_HOME', 'Chấp': 'HANDICAP_HOME',
    'Handicap Away': 'HANDICAP_AWAY', 'Kèo dưới': 'HANDICAP_AWAY', 'Được chấp': 'HANDICAP_AWAY',
    '1X': '1X', 'X2': 'X2', '12': '12',
}


def normalize_game_type(raw_type: str) -> str:
    """Normalize game type string to standard enum value."""
    if not raw_type:
        return 'Live Casino'
    stripped = str(raw_type).strip()
    # Guard against numeric values falsely placed in game_type (e.g. payout numbers '-70.0')
    try:
        float(stripped)
        return 'Live Casino'
    except ValueError:
        pass

    if stripped in GAME_TYPE_MAP:
        return GAME_TYPE_MAP[stripped]

    low = stripped.lower()
    for k, v in GAME_TYPE_MAP.items():
        if k.lower() == low:
            return v
    if 'baccarat' in low or 'bac bo' in low:
        return 'BACCARAT'
    if 'sicbo' in low or 'tài xỉu' in low:
        return 'SICBO'
    if 'roulette' in low or 'luân bàn' in low:
        return 'ROULETTE'
    if 'dragon' in low or 'tiger' in low or 'rồng hổ' in low:
        return 'DRAGON_TIGER'

    return stripped


def normalize_bet_choice(raw_choice: str) -> str:
    """Normalize bet choice string to standard enum value."""
    if not raw_choice:
        return 'UNKNOWN'
    stripped = str(raw_choice).strip()
    if stripped in BET_CHOICE_MAP:
        return BET_CHOICE_MAP[stripped]

    low = stripped.lower()
    for k, v in BET_CHOICE_MAP.items():
        if k.lower() == low:
            return v

    # Check composite prefixes/suffixes (e.g. BacBo_Player, Baccarat_Banker)
    if 'player' in low or 'người chơi' in low or 'nguoi choi' in low or low.endswith('_p'):
        return 'PLAYER'
    if 'banker' in low or 'nhà cái' in low or 'nha cai' in low or low.endswith('_b'):
        return 'BANKER'
    if 'tie' in low or 'hòa' in low or 'hoa' in low or low.endswith('_t'):
        return 'TIE'
    if 'big' in low or 'tài' in low:
        return 'BIG'
    if 'small' in low or 'xỉu' in low:
        return 'SMALL'

    return stripped.upper()


def detect_category(game_type_normalized: str) -> str:
    """Detect whether a normalized game type belongs to CASINO or SPORTS."""
    if game_type_normalized in SPORTS_GAMES:
        return 'SPORTS'
    return 'CASINO'
