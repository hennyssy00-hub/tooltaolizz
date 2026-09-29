from collections import defaultdict
from app.services.detection.rules import is_opposite

class SyndicateDetector:
    def detect(self, bets):
        alerts = []
        
        # Build round to players mapping
        round_players = defaultdict(list)
        for b in bets:
            round_players[(b.provider, b.game_type, b.round_id)].append(b)
            
        co_occurrence = defaultdict(int)
        opposite_occurrence = defaultdict(int)
        bet_pairs = defaultdict(list)
        
        for key, group_bets in round_players.items():
            for i in range(len(group_bets)):
                for j in range(i+1, len(group_bets)):
                    a = group_bets[i]
                    b = group_bets[j]
                    if a.player_id != b.player_id:
                        pair_key = tuple(sorted([a.player_id, b.player_id]))
                        co_occurrence[pair_key] += 1
                        bet_pairs[pair_key].append((a, b))
                        if is_opposite(a.game_type, a.bet_choice_normalized, b.bet_choice_normalized):
                            opposite_occurrence[pair_key] += 1
                            
        for pair, count in co_occurrence.items():
            if count > 5:
                opp_count = opposite_occurrence[pair]
                is_opposite_heavy = opp_count / count > 0.5
                severity = "CRITICAL" if is_opposite_heavy else "HIGH"
                risk_score = 95 if is_opposite_heavy else 75

                first_pair = bet_pairs[pair][0]
                a, b = first_pair[0], first_pair[1]

                desc = (
                    f"Phát hiện nhóm đánh vây / tài khoản cùng hội giữa {pair[0]} và {pair[1]}: "
                    f"xuất hiện chung {count} ván ({opp_count} ván cược đối đầu trực diện)."
                    if opp_count > 0 else
                    f"Phát hiện nhóm tài khoản liên kết giữa {pair[0]} và {pair[1]}: "
                    f"cùng tham gia chung phòng/bàn {count} ván liên tiếp."
                )

                alerts.append({
                    "alert_type": "SYNDICATE",
                    "severity": severity,
                    "risk_score": risk_score,
                    "bet_a_id": a.id,
                    "bet_b_id": b.id,
                    "description": desc,
                    "evidence": {
                        "co_occurrence": count,
                        "opposite_occurrence": opp_count,
                        "betA": {
                            "id": str(a.id),
                            "playerId": str(a.player_id),
                            "platform": str(a.platform or ""),
                            "category": "CASINO",
                            "gameType": str(a.game_type or ""),
                            "betChoice": str(a.bet_choice or a.bet_choice_normalized or "N/A"),
                            "stake": float(a.stake) if a.stake else 0.0,
                            "payout": float(a.payout) if a.payout else 0.0,
                            "timestamp": a.bet_timestamp.isoformat() if hasattr(a.bet_timestamp, 'isoformat') else str(a.bet_timestamp or ""),
                            "result": str(a.result or ""),
                            "roundId": str(a.round_id or ""),
                        },
                        "betB": {
                            "id": str(b.id),
                            "playerId": str(b.player_id),
                            "platform": str(b.platform or ""),
                            "category": "CASINO",
                            "gameType": str(b.game_type or ""),
                            "betChoice": str(b.bet_choice or b.bet_choice_normalized or "N/A"),
                            "stake": float(b.stake) if b.stake else 0.0,
                            "payout": float(b.payout) if b.payout else 0.0,
                            "timestamp": b.bet_timestamp.isoformat() if hasattr(b.bet_timestamp, 'isoformat') else str(b.bet_timestamp or ""),
                            "result": str(b.result or ""),
                            "roundId": str(b.round_id or ""),
                        },
                        "roundId": str(a.round_id or b.round_id or ""),
                        "round_id": str(a.round_id or b.round_id or ""),
                        "gameType": str(a.game_type or "Live Casino"),
                        "game": str(a.game_type or "Live Casino"),
                    }
                })
        return alerts
