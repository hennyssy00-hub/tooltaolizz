"""
Opposite bet rules matrix: Defines conflicting selections for both Casino and Sports.
"""

OPPOSITE_BETS = {
    # --- CASINO GAMES ---
    'BACCARAT': [
        ('BANKER', 'PLAYER'),
    ],
    'SICBO': [
        ('BIG', 'SMALL'),
        ('ODD', 'EVEN'),
    ],
    'ROULETTE': [
        ('RED', 'BLACK'),
        ('ODD', 'EVEN'),
        ('BIG', 'SMALL'),
        ('1-18', '19-36'),
    ],
    'DRAGON_TIGER': [
        ('DRAGON', 'TIGER'),
    ],
    'BULL_BULL': [
        ('BANKER', 'PLAYER'),
    ],
    'FANTAN': [
        ('1', '3'),
        ('2', '4'),
        ('ODD', 'EVEN'),
    ],

    # --- SPORTS (SOCCER / BASKETBALL / TENNIS) ---
    'SOCCER': [
        ('OVER', 'UNDER'),                  # Tài Xỉu bàn thắng
        ('HOME', 'AWAY'),                   # Đội nhà vs Đội khách (kèo không có hòa)
        ('HANDICAP_HOME', 'HANDICAP_AWAY'), # Kèo chấp Châu Á (Asian Handicap)
        ('HOME', 'X2'),                     # Thắng Chủ vs Cơ hội kép Khách/Hòa
        ('AWAY', '1X'),                     # Thắng Khách vs Cơ hội kép Chủ/Hòa
    ],
    'BASKETBALL': [
        ('OVER', 'UNDER'),                  # Tài Xỉu tổng điểm
        ('HOME', 'AWAY'),                   # Moneyline Chủ vs Khách
        ('HANDICAP_HOME', 'HANDICAP_AWAY'), # Điểm chấp Châu Á
    ],
    'TENNIS': [
        ('HOME', 'AWAY'),                   # Tay vợt 1 vs Tay vợt 2
        ('OVER', 'UNDER'),                  # Tổng số games Tài vs Xỉu
    ],
    'BASEBALL': [
        ('HOME', 'AWAY'),
        ('OVER', 'UNDER'),
    ],
    'ESPORTS': [
        ('HOME', 'AWAY'),
        ('OVER', 'UNDER'),
    ]
}


def is_opposite(game_type: str, choice_a: str, choice_b: str) -> bool:
    """Check if two selections are directly opposed / hedging."""
    pairs = OPPOSITE_BETS.get(game_type, [])
    for p in pairs:
        if (choice_a == p[0] and choice_b == p[1]) or (choice_a == p[1] and choice_b == p[0]):
            return True
    return False
