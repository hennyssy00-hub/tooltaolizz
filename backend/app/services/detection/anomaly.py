"""
Enhanced Statistical Anomaly & Bot Behavior Detector:
Implements Binomial Hypothesis Testing (Z-score), Bet Spread Spikes (Card Counting),
Timing Entropy (Bot script rhythm), and Staking Decimal Anomalies.
"""
from collections import defaultdict
import math


class AnomalyDetector:
    def __init__(self, config=None):
        self.config = config or {
            "min_bets": 20,
            "win_rate_threshold": 0.65,
            "timing_std_dev": 2.0,
        }

    def detect(self, bets, config=None):
        cfg = config or self.config
        min_bets = cfg.get("min_bets", 20)
        win_rate_thresh = cfg.get("win_rate_threshold", 0.65)
        timing_std_thresh = cfg.get("timing_std_dev", 2.0)

        alerts = []
        player_stats = defaultdict(lambda: {
            'total_bets': 0,
            'wins': 0,
            'stakes': [],
            'timestamps': [],
            'baccarat_bets': 0,
            'baccarat_wins': 0,
        })

        for b in bets:
            stats = player_stats[b.player_id]
            stats['total_bets'] += 1
            stats['stakes'].append(float(b.stake or 0))
            stats['timestamps'].append(b.bet_timestamp)
            if float(b.payout or 0) > 0:
                stats['wins'] += 1
                if b.game_type == 'BACCARAT':
                    stats['baccarat_wins'] += 1
            if b.game_type == 'BACCARAT':
                stats['baccarat_bets'] += 1

        for player_id, stats in player_stats.items():
            if stats['total_bets'] < min_bets:
                continue

            flags = []
            risk_score = 40

            # 1. Binomial Statistical Hypothesis Test (Z-Score on Win Rate)
            # Baseline expected casino win rate is ~0.45
            n = stats['total_bets']
            p_expected = 0.45
            actual_p = stats['wins'] / n
            std_error = math.sqrt((p_expected * (1 - p_expected)) / n)
            z_score = (actual_p - p_expected) / std_error if std_error > 0 else 0

            if actual_p >= win_rate_thresh and z_score >= 3.0:
                flags.append(
                    f"Tỷ lệ thắng dị thường (Win Rate {actual_p*100:.1f}%, Z-Score: +{z_score:.2f}σ, p < 0.001)"
                )
                risk_score += 35

            # 2. Bet Spread Spikes (Card counting / Shoe manipulation signature)
            stakes = [s for s in stats['stakes'] if s > 0]
            if len(stakes) >= 10:
                min_s = min(stakes)
                max_s = max(stakes)
                avg_s = sum(stakes) / len(stakes)
                spread_ratio = max_s / min_s if min_s > 0 else 1.0

                if spread_ratio >= 15.0 and actual_p > 0.55:
                    flags.append(
                        f"Đột biến biên độ cược Bet Spread {spread_ratio:.0f}x (Dấu hiệu đếm bài / vào tiền ván đẹp)"
                    )
                    risk_score += 25

                # Stake variance / fixed stake bot
                variance = sum((x - avg_s) ** 2 for x in stakes) / len(stakes)
                std_dev = math.sqrt(variance)
                if std_dev == 0:
                    flags.append("Tiền cược cố định 100% (std_dev = 0)")
                    risk_score += 15

                # Decimal fractions (tool precision)
                decimals = sum(1 for s in stakes if not s.is_integer())
                if decimals / len(stakes) > 0.7:
                    flags.append("Tiền cược số lẻ tính toán bằng thuật toán (Tool arbing bot)")
                    risk_score += 20

            # 3. Micro-Timing Entropy (Bot pacing vs Human variability)
            if len(stats['timestamps']) >= 10:
                timestamps = sorted(stats['timestamps'])
                intervals = [(timestamps[i] - timestamps[i - 1]).total_seconds() for i in range(1, len(timestamps))]
                # Filter positive intervals
                pos_intervals = [x for x in intervals if x > 0]
                if pos_intervals:
                    avg_int = sum(pos_intervals) / len(pos_intervals)
                    int_var = sum((x - avg_int) ** 2 for x in pos_intervals) / len(pos_intervals)
                    int_std = math.sqrt(int_var)

                    if int_std <= timing_std_thresh and avg_int < 60:
                        flags.append(
                            f"Nhịp độ cược máy móc cực đều (std_dev: {int_std:.2f}s, chu kỳ: {avg_int:.1f}s)"
                        )
                        risk_score += 30

                # Continuous session length without breaks (> 6 hours)
                session_start = timestamps[0]
                max_session = 0
                for i in range(1, len(timestamps)):
                    if intervals[i - 1] > 1800:
                        max_session = max(max_session, (timestamps[i - 1] - session_start).total_seconds())
                        session_start = timestamps[i]
                max_session = max(max_session, (timestamps[-1] - session_start).total_seconds())

                if max_session >= 6 * 3600:
                    flags.append(f"Thời gian cược liên tục không nghỉ > {max_session/3600:.1f} giờ")
                    risk_score += 15

            # 4. Turnover Velocity Ratio (TVR - Bào khuyến mãi / cày doanh số siêu tốc)
            total_turnover = sum(stats['stakes'])
            if len(stats['timestamps']) >= 10:
                duration_minutes = (max(stats['timestamps']) - min(stats['timestamps'])).total_seconds() / 60.0
                if duration_minutes > 0:
                    tvr = total_turnover / duration_minutes
                    if tvr >= 1000000 and stats['total_bets'] >= 15:
                        flags.append(
                            f"Tốc độ cày doanh số cao bất thường TVR ({tvr:,.0f} đ/phút, thời gian {duration_minutes:.1f}m - Dấu vết bào khuyến mãi)"
                        )
                        risk_score += 25

            if flags:
                severity = "CRITICAL" if risk_score >= 80 else ("HIGH" if risk_score >= 60 else "MEDIUM")
                ref_bets = [b for b in bets if b.player_id == player_id]
                ref_bet_id = ref_bets[0].id if ref_bets else None

                alerts.append({
                    "alert_type": "ANOMALY",
                    "severity": severity,
                    "risk_score": min(100, risk_score),
                    "bet_a_id": ref_bet_id,
                    "bet_b_id": None,
                    "description": f"Phát hiện bất thường cho {player_id}: {' | '.join(flags)}",
                    "evidence": {
                        "player_id": player_id,
                        "total_bets": stats['total_bets'],
                        "win_rate_pct": round(actual_p * 100, 1),
                        "z_score": round(z_score, 2),
                        "flags": flags,
                    }
                })

        return alerts
