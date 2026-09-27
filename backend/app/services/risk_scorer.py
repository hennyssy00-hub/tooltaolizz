from collections import defaultdict
from app.models.account import Account

class RiskScorer:
    def score(self, accounts, alerts):
        # Calculate weighted risk score:
        # score = w1*cross_hedge + w2*coverage + w3*syndicate + w4*anomaly
        weights = {
            'CROSS_HEDGE': 20,
            'TABLE_COVERAGE': 15,
            'SYNDICATE': 25,
            'ANOMALY': 10
        }
        
        player_scores = defaultdict(int)
        
        for alert in alerts:
            alert_type = alert.get('alert_type')
            w = weights.get(alert_type, 10)
            severity = alert.get('severity', 'LOW')
            mult = 2 if severity == 'CRITICAL' else (1.5 if severity == 'HIGH' else 1)
            
            # Need to get player ID from bet, but we only have bet IDs in alert here.
            # Assuming we can pass player_ids in the alerts list, or just calculate score.
            pass
            
        for acc in accounts:
            score = acc.risk_score
            # Dummy logic as we don't have full DB context here
            if score <= 25:
                acc.risk_level = "SAFE"
            elif score <= 50:
                acc.risk_level = "WATCH"
            elif score <= 75:
                acc.risk_level = "SUSPICIOUS"
            else:
                acc.risk_level = "CRITICAL"
        return accounts
