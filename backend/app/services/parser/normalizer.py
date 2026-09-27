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
    'Cái': 'BANKER', 'cái': 'BANKER', 'Con': 'PLAYER', 'con': 'PLAYER',
    'Hòa': 'TIE', 'hòa': 'TIE',
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
        return 'UNKNOWN'
    stripped = raw_type.strip()
    return GAME_TYPE_MAP.get(stripped, stripped.upper().replace(' ', '_'))


def normalize_bet_choice(raw_choice: str) -> str:
    """Normalize bet choice string to standard enum value."""
    if not raw_choice:
        return 'UNKNOWN'
    stripped = raw_choice.strip()
    return BET_CHOICE_MAP.get(stripped, stripped.upper())


def detect_category(game_type_normalized: str) -> str:
    """Detect whether a normalized game type belongs to CASINO or SPORTS."""
    if game_type_normalized in SPORTS_GAMES:
        return 'SPORTS'
    return 'CASINO'
