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
                risk_score = 95 if is_opposite_heavy else 80
                
                alerts.append({
                    "alert_type": "SYNDICATE",
                    "severity": severity,
                    "risk_score": risk_score,
                    "bet_a_id": bet_pairs[pair][0][0].id,
                    "bet_b_id": bet_pairs[pair][0][1].id,
                    "description": f"Syndicate detected between {pair[0]} and {pair[1]}. Co-occurred {count} times ({opp_count} times on opposite sides).",
                    "evidence": {"co_occurrence": count, "opposite_occurrence": opp_count}
                })
        return alerts
