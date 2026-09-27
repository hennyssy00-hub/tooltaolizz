"""
Enhanced Table Coverage Detector:
Calculates mathematical table coverage probability across both single-player
and multi-account / cross-platform coordinated table hedging.
"""
from collections import defaultdict


class TableCoverageDetector:
    def __init__(self, config=None):
        self.config = config or {
            "max_coverage_pct": 0.70,
            "cross_player": True,
        }

    def detect(self, bets, config=None):
        cfg = config or self.config
        cross_player = cfg.get("cross_player", True)
        alerts = []

        # Group bets by round:
        # If cross_player: group by (provider, game_type, round_id)
        # Else: group by (provider, game_type, round_id, player_id)
        groups = defaultdict(list)
        for b in bets:
            if not b.round_id:
                continue
            if cross_player:
                key = (b.provider, b.game_type, b.round_id)
            else:
                key = (b.provider, b.game_type, b.round_id, b.player_id)
            groups[key].append(b)

        for key, group_bets in groups.items():
            if len(group_bets) < 2:
                continue

            game_type = key[1]
            round_id = key[2]

            choices = set(b.bet_choice_normalized or b.bet_choice for b in group_bets)
            players = list(set(b.player_id for b in group_bets))
            platforms = list(set(b.platform for b in group_bets))

            coverage_found = False
            desc = ""
            coverage_pct = 0.0
            severity = "MEDIUM"
            risk = 50

            if game_type == 'ROULETTE':
                if 'RED' in choices and 'BLACK' in choices:
                    coverage_found = True
                    coverage_pct = 97.3
                    desc = "Bao phủ Đỏ và Đen (36/37 số = 97.3%)"
                    severity = "HIGH"
                    risk = 80
                elif 'ODD' in choices and 'EVEN' in choices:
                    coverage_found = True
                    coverage_pct = 97.3
                    desc = "Bao phủ Chẵn và Lẻ (36/37 số = 97.3%)"
                    severity = "HIGH"
                    risk = 80
                elif {'1ST12', '2ND12', '3RD12'}.issubset(choices):
                    coverage_found = True
                    coverage_pct = 97.3
                    desc = "Bao trọn cả 3 Dozens (36/37 số = 97.3%)"
                    severity = "CRITICAL"
                    risk = 92
                elif sum(1 for c in ['1ST12', '2ND12', '3RD12'] if c in choices) >= 2:
                    coverage_found = True
                    coverage_pct = 64.8
                    desc = "Bao phủ 2 trên 3 Dozens (24/37 số = 64.8%)"
                    severity = "MEDIUM"
                    risk = 60

            elif game_type == 'SICBO':
                if 'BIG' in choices and 'SMALL' in choices:
                    coverage_found = True
                    coverage_pct = 97.2
                    desc = "Bao phủ Tài và Xỉu (35/36 trường hợp)"
                    severity = "HIGH"
                    risk = 80
                elif 'ODD' in choices and 'EVEN' in choices:
                    coverage_found = True
                    coverage_pct = 97.2
                    desc = "Bao phủ Chẵn và Lẻ"
                    severity = "HIGH"
                    risk = 80

            elif game_type == 'BACCARAT':
                if 'PLAYER' in choices and 'BANKER' in choices and 'TIE' in choices:
                    coverage_found = True
                    coverage_pct = 100.0
                    desc = "Bao phủ Player, Banker và Tie (100% kết quả)"
                    severity = "CRITICAL"
                    risk = 96
                elif 'PLAYER' in choices and 'BANKER' in choices:
                    coverage_found = True
                    coverage_pct = 98.8
                    desc = "Bao phủ cả Player và Banker (98.8% ván)"
                    severity = "HIGH"
                    risk = 85

            if coverage_found:
                is_multi = len(players) > 1
                if is_multi:
                    desc += f" (Phối hợp nhóm: {', '.join(players)})"
                    risk = min(100, risk + 8)

                alerts.append({
                    "alert_type": "TABLE_COVERAGE",
                    "severity": severity,
                    "risk_score": risk,
                    "bet_a_id": group_bets[0].id,
                    "bet_b_id": group_bets[1].id,
                    "description": f"Bao bàn {game_type}: {desc}",
                    "evidence": {
                        "choices": list(choices),
                        "round_id": round_id,
                        "coverage_pct": coverage_pct,
                        "players_involved": players,
                        "platforms_involved": platforms,
                        "is_cross_player": is_multi,
                    }
                })

        return alerts
