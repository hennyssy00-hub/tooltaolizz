"""
Enhanced Cross-Hedging Detector:
Implements Net Exposure Index, Micro-Timing Synchronization,
Turnover Rebate Wash Detection, and Multi-Round Persistence Tracking.
"""
from collections import defaultdict
from app.services.detection.rules import is_opposite


class CrossHedgingDetector:
    def __init__(self, config=None):
        self.config = config or {
            "max_time_diff": 60,
            "max_stake_diff_pct": 0.15,
            "net_exposure_threshold": 0.10,
            "min_persistence": 1,
        }

    def detect(self, bets, config=None):
        cfg = config or self.config
        max_time_diff = cfg.get("max_time_diff", 60)
        max_stake_diff = cfg.get("max_stake_diff_pct", 0.15)
        net_exposure_thresh = cfg.get("net_exposure_threshold", 0.10)

        alerts = []
        # Group by (provider, game_type, round_id)
        groups = {}
        for b in bets:
            # Skip bets with missing round_id
            if not b.round_id:
                continue
            key = (b.provider, b.game_type, b.round_id)
            groups.setdefault(key, []).append(b)

        # Track player-pair hedging persistence
        pair_occurrences = defaultdict(int)

        potential_pairs = []

        for key, group_bets in groups.items():
            if len(group_bets) < 2:
                continue

            for i in range(len(group_bets)):
                for j in range(i + 1, len(group_bets)):
                    a = group_bets[i]
                    b = group_bets[j]

                    if a.player_id == b.player_id and a.platform == b.platform:
                        continue

                    choice_a = a.bet_choice_normalized or a.bet_choice
                    choice_b = b.bet_choice_normalized or b.bet_choice

                    if is_opposite(a.game_type, choice_a, choice_b):
                        stake_a = float(a.stake or 0)
                        stake_b = float(b.stake or 0)
                        total_stake = stake_a + stake_b
                        max_stake = max(stake_a, stake_b)

                        stake_diff_pct = abs(stake_a - stake_b) / max_stake if max_stake > 0 else 0
                        # Net Exposure Index: 0.0 = 100% neutralized, 1.0 = completely naked
                        net_exposure = abs(stake_a - stake_b) / total_stake if total_stake > 0 else 1.0

                        time_diff = abs((a.bet_timestamp - b.bet_timestamp).total_seconds())

                        # Filter by strictness profile time window
                        if time_diff > max_time_diff * 2:
                            continue

                        pair_key = tuple(sorted([a.player_id, b.player_id]))
                        pair_occurrences[pair_key] += 1

                        potential_pairs.append({
                            "a": a,
                            "b": b,
                            "pair_key": pair_key,
                            "choice_a": choice_a,
                            "choice_b": choice_b,
                            "stake_a": stake_a,
                            "stake_b": stake_b,
                            "stake_diff_pct": stake_diff_pct,
                            "net_exposure": net_exposure,
                            "time_diff": time_diff,
                        })

        # Process alerts with persistence and exposure scoring
        for item in potential_pairs:
            a = item["a"]
            b = item["b"]
            time_diff = item["time_diff"]
            stake_diff_pct = item["stake_diff_pct"]
            net_exposure = item["net_exposure"]
            persistence = pair_occurrences[item["pair_key"]]

            # Evaluate severity
            severity = "MEDIUM"
            risk_score = 45
            tags = []

            # 1. Micro-timing synchronization (< 3 seconds and < 1 second)
            if time_diff <= 1.0:
                tags.append("Đồng bộ tức thời (Micro-sync <= 1s - Bắn bot API)")
                risk_score += 35
            elif time_diff <= 3.0:
                tags.append("Đồng bộ vi mô (Micro-sync <= 3s)")
                risk_score += 25

            # 2. Net Exposure Analysis (< 5% exposure = zero-risk laundering)
            if net_exposure <= 0.05:
                tags.append("Triệt tiêu rủi ro hoàn toàn (Exposure < 5%)")
                risk_score += 25
            elif net_exposure <= net_exposure_thresh:
                tags.append(f"Độ lộ rủi ro thấp ({net_exposure*100:.1f}%)")
                risk_score += 15

            # 3. Persistence across multiple rounds
            if persistence >= 5:
                tags.append(f"Tổ chức cược chéo lặp lại ({persistence} ván)")
                risk_score += 30
            elif persistence >= 2:
                tags.append(f"Lặp lại {persistence} ván")
                risk_score += 15

            # 4. IP Intelligence & Subnet Collision
            ip_a = getattr(a, 'ip_address', None) or (a.raw_data.get('ip') if hasattr(a, 'raw_data') and isinstance(a.raw_data, dict) else None)
            ip_b = getattr(b, 'ip_address', None) or (b.raw_data.get('ip') if hasattr(b, 'raw_data') and isinstance(b.raw_data, dict) else None)
            same_ip = False
            same_subnet = False
            if ip_a and ip_b:
                str_ip_a = str(ip_a).strip()
                str_ip_b = str(ip_b).strip()
                if str_ip_a == str_ip_b:
                    same_ip = True
                    tags.append(f"TRÙNG IP HOÀN TOÀN: {str_ip_a} (Cùng máy/đường truyền)")
                    risk_score = 100
                else:
                    parts_a = str_ip_a.split('.')
                    parts_b = str_ip_b.split('.')
                    if len(parts_a) == 4 and len(parts_b) == 4 and parts_a[:3] == parts_b[:3]:
                        same_subnet = True
                        tags.append(f"CÙNG DẢI SUBNET IP: {'.'.join(parts_a[:3])}.x (Cùng mạng LAN/VPS)")
                        risk_score += 35

            # 5. Hardware Device / Fingerprint Collision
            dev_a = getattr(a, 'device_id', None) or (a.raw_data.get('device') if hasattr(a, 'raw_data') and isinstance(a.raw_data, dict) else None)
            dev_b = getattr(b, 'device_id', None) or (b.raw_data.get('device') if hasattr(b, 'raw_data') and isinstance(b.raw_data, dict) else None)
            same_device = False
            if dev_a and dev_b and str(dev_a).strip() == str(dev_b).strip():
                same_device = True
                tags.append(f"TRÙNG THIẾT BỊ: {dev_a} (Multi-accounting trên cùng phần cứng)")
                risk_score = 100

            # 6. Agent / Upline Collusion
            agent_a = getattr(a, 'agent_id', None)
            agent_b = getattr(b, 'agent_id', None)
            same_agent = False
            if agent_a and agent_b and str(agent_a).strip() == str(agent_b).strip():
                same_agent = True
                tags.append(f"CÙNG MÃ ĐẠI LÝ: {agent_a} (Nghi vấn cày hoa hồng đại lý)")
                risk_score += 30

            # Determine final severity based on composite risk score
            if risk_score >= 85 or same_ip or same_device or (stake_diff_pct <= max_stake_diff and time_diff <= max_time_diff):
                severity = "CRITICAL"
                risk_score = min(100, max(risk_score, 90))
            elif risk_score >= 65:
                severity = "HIGH"
                risk_score = min(89, risk_score)
            else:
                severity = "MEDIUM"

            desc_parts = [
                f"Đánh chéo 2 đầu ({item['choice_a']} vs {item['choice_b']})",
                f"giữa {a.player_id} ({a.platform}) và {b.player_id} ({b.platform})"
            ]
            if tags:
                desc_parts.append(f"[{' | '.join(tags)}]")

            alerts.append({
                "alert_type": "CROSS_HEDGE",
                "severity": severity,
                "risk_score": risk_score,
                "bet_a_id": a.id,
                "bet_b_id": b.id,
                "time_diff_seconds": round(time_diff, 1),
                "stake_diff_pct": round(stake_diff_pct, 4),
                "description": " - ".join(desc_parts),
                "evidence": {
                    "betA": {
                        "id": str(a.id),
                        "playerId": str(a.player_id),
                        "platform": str(a.platform),
                        "category": "CASINO",
                        "gameType": str(a.game_type),
                        "betChoice": str(a.bet_choice),
                        "stake": float(a.stake) if a.stake else 0.0,
                        "payout": float(a.payout) if a.payout else 0.0,
                        "timestamp": a.bet_timestamp.isoformat() if hasattr(a.bet_timestamp, 'isoformat') else str(a.bet_timestamp or ""),
                        "result": str(a.result or ""),
                        "roundId": str(a.round_id or ""),
                    },
                    "betB": {
                        "id": str(b.id),
                        "playerId": str(b.player_id),
                        "platform": str(b.platform),
                        "category": "CASINO",
                        "gameType": str(b.game_type),
                        "betChoice": str(b.bet_choice),
                        "stake": float(b.stake) if b.stake else 0.0,
                        "payout": float(b.payout) if b.payout else 0.0,
                        "timestamp": b.bet_timestamp.isoformat() if hasattr(b.bet_timestamp, 'isoformat') else str(b.bet_timestamp or ""),
                        "result": str(b.result or ""),
                        "roundId": str(b.round_id or ""),
                    },
                    "roundId": str(a.round_id or ""),
                    "round_id": str(a.round_id or ""),
                    "gameType": str(a.game_type or ""),
                    "game": str(a.game_type or ""),
                    "timeDiffSeconds": round(time_diff, 1),
                    "stakeDiffPercentage": round(stake_diff_pct * 100, 1),
                    "net_exposure_pct": round(net_exposure * 100, 2),
                    "persistence_rounds": persistence,
                    "sync_latency_sec": round(time_diff, 2),
                    "ip_a": ip_a,
                    "ip_b": ip_b,
                    "same_ip": same_ip,
                    "same_subnet": same_subnet,
                    "device_a": dev_a,
                    "device_b": dev_b,
                    "same_device": same_device,
                    "agent_a": agent_a,
                    "agent_b": agent_b,
                    "same_agent": same_agent,
                    "tags": tags,
                }
            })

        return alerts
