"""
DetectionEngine:
Orchestrates anti-fraud detectors applying configurable strictness profiles
(Tier-1 Standard, Ultra Strict, Rebate Hunter, Sports Sharp).
"""
from app.services.detection.cross_hedging import CrossHedgingDetector
from app.services.detection.table_coverage import TableCoverageDetector
from app.services.detection.syndicate import SyndicateDetector
from app.services.detection.anomaly import AnomalyDetector
from app.services.detection.sports_arbitrage import SportsArbitrageDetector
from app.services.detection.profiles import get_profile


class DetectionEngine:
    def __init__(self):
        self.cross_hedging = CrossHedgingDetector()
        self.table_coverage = TableCoverageDetector()
        self.syndicate = SyndicateDetector()
        self.anomaly = AnomalyDetector()
        self.sports_arbitrage = SportsArbitrageDetector()

    def run(self, scan_id, bets, category="ALL", profile_id="STANDARD", custom_config=None):
        profile = get_profile(profile_id)
        if custom_config:
            # Merge custom config overrides
            profile = {**profile, **custom_config}

        all_alerts = []
        cat = category.upper() if category else "ALL"

        # 1. Run Casino Detectors
        if cat in ["CASINO", "ALL"]:
            all_alerts.extend(
                self.cross_hedging.detect(bets, config=profile.get("cross_hedge"))
            )
            all_alerts.extend(
                self.table_coverage.detect(bets, config=profile.get("table_coverage"))
            )

        # 2. Run Sports Detectors
        if cat in ["SPORTS", "ALL"]:
            all_alerts.extend(
                self.sports_arbitrage.detect(bets, config=profile.get("sports"))
            )

        # 3. Run Universal Multi-Account & Statistical Detectors
        all_alerts.extend(
            self.syndicate.detect(bets)
        )
        all_alerts.extend(
            self.anomaly.detect(bets, config=profile.get("anomaly"))
        )

        for a in all_alerts:
            a['scan_id'] = scan_id
            a['profile_used'] = profile_id

        return all_alerts
