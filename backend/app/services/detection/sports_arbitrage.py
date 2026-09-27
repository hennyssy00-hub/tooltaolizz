"""
Enhanced Sports Arbitrage & Integrity Detector:
Derived from Tier-1 Bookmaker Risk Engines (Pinnacle/Sportradar/IBIA):
1. Surebet Margin Analysis: 1/Odd_A + 1/Odd_B < 1.0 (Guaranteed Arbitrage)
2. Palpable Error Detection (Kèo nhầm giá / Inverted lines > 6% profit)
3. Kelly / Proportional Staking Ratio Signature (Dấu vết tool bào cỏ)
4. Courtsiding & Micro-Latency In-Play Detection (Cược rung trễ < 5s)
5. Asian Handicap & Totals Market Correlated Hedging
"""
from app.services.detection.rules import is_opposite


def normalize_event_name(name: str) -> str:
    """Normalize match event names for fuzzy matching."""
    if not name:
        return ""
    clean = (
        name.lower()
        .replace("fc", "")
        .replace("united", "utd")
        .replace(" vs ", " v ")
        .replace(" - ", " v ")
        .replace("@", " v ")
    )
    return "".join(c for c in clean if c.isalnum() or c == " ").strip()


class SportsArbitrageDetector:
    def __init__(self, config=None):
        self.config = config or {
            "max_arb_margin": 1.00,
            "min_profit_pct": 0.5,
            "stake_ratio_tolerance": 0.05,
            "time_window": 300,
            "check_palpable_error": True,
            "check_kelly_stake": True,
        }

    def detect(self, bets, config=None):
        cfg = config or self.config
        max_arb_margin = cfg.get("max_arb_margin", 1.00)
        min_profit_pct = cfg.get("min_profit_pct", 0.5)
        stake_ratio_tol = cfg.get("stake_ratio_tolerance", 0.05)
        time_window = cfg.get("time_window", 300)

        alerts = []
        sports_bets = [
            b for b in bets
            if getattr(b, 'category', None) == 'SPORTS'
            or b.game_type in {'SOCCER', 'FOOTBALL', 'BASKETBALL', 'TENNIS', 'ESPORTS', 'BASEBALL'}
            or getattr(b, 'event_name', None)
        ]

        if not sports_bets:
            return []

        # Group by (normalized_event_name, game_type)
        groups = {}
        for b in sports_bets:
            event = getattr(b, 'event_name', None) or b.round_id or "UNKNOWN"
            norm_event = normalize_event_name(event)
            key = (norm_event, b.game_type)
            groups.setdefault(key, []).append(b)

        for (event, game_type), group_bets in groups.items():
            if len(group_bets) < 2:
                continue

            for i in range(len(group_bets)):
                for j in range(i + 1, len(group_bets)):
                    a = group_bets[i]
                    b = group_bets[j]

                    # Different platforms or different accounts
                    if a.player_id == b.player_id and a.platform == b.platform:
                        continue

                    choice_a = a.bet_choice_normalized or a.bet_choice
                    choice_b = b.bet_choice_normalized or b.bet_choice

                    if is_opposite(a.game_type, choice_a, choice_b):
                        stake_a = float(a.stake or 0)
                        stake_b = float(b.stake or 0)
                        odd_a = float(getattr(a, 'odds', 0) or 0)
                        odd_b = float(getattr(b, 'odds', 0) or 0)

                        time_diff = abs((a.bet_timestamp - b.bet_timestamp).total_seconds())

                        # Filter by time window
                        if time_diff > time_window:
                            continue

                        # 1. Arbitrage Margin Calculation
                        is_arbitrage = False
                        is_palpable_error = False
                        profit_margin = 0.0

                        if odd_a > 1.0 and odd_b > 1.0:
                            margin = (1.0 / odd_a) + (1.0 / odd_b)
                            if margin <= max_arb_margin:
                                profit_margin = round((1.0 - margin) * 100, 2)
                                if profit_margin >= min_profit_pct:
                                    is_arbitrage = True
                                # Palpable error: profit margin > 6% indicates inverted odd mistake by bookmaker
                                if profit_margin > 6.0:
                                    is_palpable_error = True

                        # 2. Kelly / Proportional Staking Signature
                        # Arbers balance payout: Stake_B = Stake_A * (Odd_A / Odd_B)
                        is_formula_stake = False
                        stake_ratio_diff = 1.0
                        if odd_a > 1.0 and odd_b > 1.0 and stake_a > 0 and stake_b > 0:
                            theoretical_stake_b = (stake_a * odd_a) / odd_b
                            stake_ratio_diff = abs(stake_b - theoretical_stake_b) / max(stake_b, theoretical_stake_b)
                            if stake_ratio_diff <= stake_ratio_tol:
                                is_formula_stake = True

                        # 3. Micro-Latency Courtsiding (in-play fast bet)
                        is_courtsiding = time_diff <= 3.0

                        max_stake = max(stake_a, stake_b)
                        stake_diff_pct = abs(stake_a - stake_b) / max_stake if max_stake > 0 else 0

                        # Determine severity and risk score
                        tags = []
                        risk_score = 50
                        severity = "MEDIUM"

                        if is_palpable_error:
                            tags.append(f"Khai thác kèo nhầm giá (Palpable Error +{profit_margin}%)")
                            risk_score = 100
                            severity = "CRITICAL"
                        elif is_arbitrage:
                            tags.append(f"Bào cỏ Surebet (Lợi nhuận +{profit_margin}%)")
                            risk_score = 98 if is_formula_stake else 92
                            severity = "CRITICAL"

                        if is_formula_stake:
                            tags.append(f"Khớp công thức chia tiền Kelly/Arb (Lệch {stake_ratio_diff*100:.1f}%)")
                            risk_score = max(risk_score, 94)
                            severity = "CRITICAL"

                        if is_courtsiding:
                            tags.append("Đồng bộ tức thời Courtsiding (<= 3s)")
                            risk_score = min(100, risk_score + 15)

                        # 4. IP & Hardware Device Collision
                        ip_a = getattr(a, 'ip_address', None) or (a.raw_data.get('ip') if hasattr(a, 'raw_data') and isinstance(a.raw_data, dict) else None)
                        ip_b = getattr(b, 'ip_address', None) or (b.raw_data.get('ip') if hasattr(b, 'raw_data') and isinstance(b.raw_data, dict) else None)
                        same_ip = False
                        same_subnet = False
                        if ip_a and ip_b:
                            str_ip_a = str(ip_a).strip()
                            str_ip_b = str(ip_b).strip()
                            if str_ip_a == str_ip_b:
                                same_ip = True
                                tags.append(f"TRÙNG IP: {str_ip_a} (100% Cùng nguồn)")
                                risk_score = 100
                                severity = "CRITICAL"
                            else:
                                parts_a = str_ip_a.split('.')
                                parts_b = str_ip_b.split('.')
                                if len(parts_a) == 4 and len(parts_b) == 4 and parts_a[:3] == parts_b[:3]:
                                    same_subnet = True
                                    tags.append(f"CÙNG DẢI SUBNET IP: {'.'.join(parts_a[:3])}.x")
                                    risk_score += 30

                        dev_a = getattr(a, 'device_id', None) or (a.raw_data.get('device') if hasattr(a, 'raw_data') and isinstance(a.raw_data, dict) else None)
                        dev_b = getattr(b, 'device_id', None) or (b.raw_data.get('device') if hasattr(b, 'raw_data') and isinstance(b.raw_data, dict) else None)
                        same_device = False
                        if dev_a and dev_b and str(dev_a).strip() == str(dev_b).strip():
                            same_device = True
                            tags.append(f"TRÙNG THIẾT BỊ: {dev_a}")
                            risk_score = 100
                            severity = "CRITICAL"

                        if not is_arbitrage and not is_formula_stake and not same_ip and not same_device:
                            if time_diff <= 60 and stake_diff_pct <= 0.15:
                                tags.append("Cược đối kháng chặt (Asian Handicap/Totals)")
                                severity = "HIGH"
                                risk_score = 85
                            else:
                                tags.append("Cược ngược chiều cùng trận đấu")
                                severity = "MEDIUM"
                                risk_score = 65

                        desc = f"{' | '.join(tags)}: {choice_a} @{odd_a} vs {choice_b} @{odd_b} [{a.player_id} ({a.platform}) ↔ {b.player_id} ({b.platform})]"

                        alerts.append({
                            "alert_type": "SPORTS_ARBITRAGE" if is_arbitrage else "SPORTS_HEDGE",
                            "severity": severity,
                            "risk_score": risk_score,
                            "bet_a_id": a.id,
                            "bet_b_id": b.id,
                            "time_diff_seconds": round(time_diff, 1),
                            "stake_diff_pct": round(stake_diff_pct, 4),
                            "description": desc,
                            "evidence": {
                                "match": event,
                                "sport": game_type,
                                "odd_a": odd_a,
                                "odd_b": odd_b,
                                "profit_margin_pct": profit_margin,
                                "is_arbitrage": is_arbitrage,
                                "is_palpable_error": is_palpable_error,
                                "is_formula_stake": is_formula_stake,
                                "is_courtsiding": is_courtsiding,
                                "tags": tags,
                            }
                        })

        return alerts
