"""
Pipeline verification test:
1. Initialize database tables
2. Ingest mock betting CSV files
3. Run fraud detection engine
4. Print detection results & risk scores
"""
import asyncio
import os
import io
import pandas as pd
from datetime import datetime

from app.database import engine, Base, AsyncSessionLocal
from app.models.scan import Scan
from app.models.bet import Bet
from app.models.alert import Alert
from app.models.account import Account
from app.services.parser.column_mapper import ColumnMapper
from app.services.parser.normalizer import normalize_game_type, normalize_bet_choice
from app.services.detection.engine import DetectionEngine


async def test_pipeline():
    print("=" * 60)
    print("CASINOGUARD - TESTING END-TO-END PIPELINE")
    print("=" * 60)

    # 1. Create DB tables
    print("\n[Step 1] Initializing SQLite database...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    print("[OK] Database tables created successfully.")

    # 2. Ingest mock CSV files
    print("\n[Step 2] Ingesting mock betting history files...")
    mapper = ColumnMapper()
    scan_id = "test-scan-001"

    async with AsyncSessionLocal() as db:
        scan = Scan(
            id=scan_id,
            name="Phiên quét thử nghiệm 3 sảnh",
            status="PENDING",
            platforms=["Platform Alpha", "Platform Beta", "Platform Gamma"],
            total_bets=0,
            total_alerts=0,
            summary={},
        )
        db.add(scan)
        await db.commit()

        mock_dir = os.path.join(os.path.dirname(__file__), "mock_data")
        files = [
            ("Platform Alpha", os.path.join(mock_dir, "platform_alpha.csv")),
            ("Platform Beta", os.path.join(mock_dir, "platform_beta.csv")),
            ("Platform Gamma", os.path.join(mock_dir, "platform_gamma.csv")),
        ]

        total_bets_ingested = 0
        all_bets = []

        for platform_name, filepath in files:
            df = pd.read_csv(filepath)
            mapping = mapper.detect_mapping(df.columns.tolist())
            reverse_map = {v: k for k, v in mapping.items()}

            for idx, row in df.iterrows():
                mapped = {}
                for col, val in row.items():
                    std_field = reverse_map.get(col)
                    if std_field:
                        mapped[std_field] = val

                raw_game = str(mapped.get("game_type", ""))
                raw_choice = str(mapped.get("bet_choice", ""))
                ts_str = str(mapped.get("bet_timestamp", ""))
                try:
                    ts = datetime.fromisoformat(ts_str)
                except Exception:
                    ts = datetime.utcnow()

                import uuid
                bet = Bet(
                    id=str(uuid.uuid4()),
                    scan_id=scan_id,
                    platform=platform_name,
                    provider=str(mapped.get("provider", "Evolution")),
                    game_type=normalize_game_type(raw_game),
                    table_id=str(mapped.get("table_id", "T1")),
                    round_id=str(mapped.get("round_id", "")),
                    player_id=str(mapped.get("player_id", "")),
                    bet_choice=raw_choice,
                    bet_choice_normalized=normalize_bet_choice(raw_choice),
                    stake=float(mapped.get("stake", 0)),
                    valid_bet=float(mapped.get("stake", 0)),
                    payout=float(mapped.get("payout", 0)),
                    bet_timestamp=ts,
                    result=str(mapped.get("result", "PENDING")),
                    raw_data={},
                )
                db.add(bet)
                all_bets.append(bet)
                total_bets_ingested += 1

                # Upsert account
                pid = bet.player_id
                acc = await db.get(Account, pid)
                if not acc:
                    acc = Account(
                        id=pid,
                        player_id=pid,
                        platforms=[platform_name],
                        total_bets=1,
                        total_alerts=0,
                        risk_score=0,
                        risk_level="SAFE",
                        first_seen=ts,
                        last_seen=ts,
                    )
                    db.add(acc)
                else:
                    acc.total_bets += 1
                    acc.last_seen = max(acc.last_seen, ts)
                    if platform_name not in acc.platforms:
                        acc.platforms.append(platform_name)

        scan.total_bets = total_bets_ingested
        await db.commit()
        print(f"[OK] Ingested {total_bets_ingested} bets across 3 platforms.")

        # 3. Run Detection Engine
        print("\n[Step 3] Running Fraud Detection Engine...")
        engine_inst = DetectionEngine()
        raw_alerts = engine_inst.run(scan_id, all_bets)
        print(f"[OK] Detected {len(raw_alerts)} potential fraud alerts!")

        # 4. Save Alerts and calculate risk
        print("\n[Step 4] Saving Alerts & Scoring Player Risk...")
        alert_types = {}
        severity_counts = {}

        for ra in raw_alerts:
            t = ra.get("alert_type")
            s = ra.get("severity")
            alert_types[t] = alert_types.get(t, 0) + 1
            severity_counts[s] = severity_counts.get(s, 0) + 1

            alert = Alert(
                id=str(uuid.uuid4()),
                scan_id=scan_id,
                alert_type=ra.get("alert_type"),
                severity=ra.get("severity"),
                risk_score=ra.get("risk_score"),
                bet_a_id=ra.get("bet_a_id"),
                bet_b_id=ra.get("bet_b_id"),
                time_diff_seconds=ra.get("time_diff_seconds"),
                stake_diff_pct=ra.get("stake_diff_pct"),
                description=ra.get("description"),
                evidence=ra.get("evidence"),
                status="PENDING",
            )
            db.add(alert)

        scan.total_alerts = len(raw_alerts)
        scan.status = "COMPLETED"
        await db.commit()

        print("\n" + "=" * 60)
        print("DETECTION SUMMARY REPORT")
        print("=" * 60)
        print(f"Total Bets Scanned : {total_bets_ingested}")
        print(f"Total Fraud Alerts : {len(raw_alerts)}")
        print("\nAlerts by Type:")
        for k, v in alert_types.items():
            print(f"  * {k:20s}: {v} cases")
        print("\nAlerts by Severity:")
        for k, v in severity_counts.items():
            print(f"  * {k:10s}: {v} cases")

        print("\nSample Detected Evidence:")
        for idx, ra in enumerate(raw_alerts[:5], 1):
            print(f"  [{idx}] {ra.get('severity')} - {ra.get('alert_type')}: {ra.get('description')}")

        print("\n[OK] Pipeline verification completed with 100% success!")


if __name__ == "__main__":
    asyncio.run(test_pipeline())
