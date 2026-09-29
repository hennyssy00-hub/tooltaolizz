"""
Scan API: Creates scan sessions, runs the fraud detection engine,
saves alerts, and updates account risk scores.
"""
import uuid
import asyncio
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select, func, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.scan import Scan
from app.models.bet import Bet
from app.models.alert import Alert
from app.models.account import Account
from app.services.detection.engine import DetectionEngine

router = APIRouter()
detection_engine = DetectionEngine()


class ScanCreateRequest(BaseModel):
    name: str
    scan_id: Optional[str] = None  # If bets already uploaded to a scan


class ScanRunRequest(BaseModel):
    scan_id: str
    detectors: list[str] = ["CROSS_HEDGE", "TABLE_COVERAGE", "SYNDICATE", "ANOMALY"]
    time_window: int = 60  # seconds
    stake_tolerance: float = 0.15  # 15%


@router.post("")
async def create_scan(payload: ScanCreateRequest, db: AsyncSession = Depends(get_db)):
    """Create a new empty scan session."""
    scan = Scan(
        id=str(uuid.uuid4()),
        name=payload.name,
        status="PENDING",
        platforms=[],
        total_bets=0,
        total_alerts=0,
        summary={},
    )
    db.add(scan)
    await db.commit()
    await db.refresh(scan)
    return {"scan_id": scan.id, "name": scan.name, "status": scan.status}


@router.get("/profiles")
async def get_strictness_profiles():
    """Return available anti-fraud strictness profiles and their parameters."""
    from app.services.detection.profiles import PROFILES
    return list(PROFILES.values())


@router.post("/{scan_id}/run")
async def run_scan(
    scan_id: str,
    profile_id: str = "STANDARD",
    db: AsyncSession = Depends(get_db)
):
    """
    Run the fraud detection engine on all bets in a scan using a specified strictness profile.
    """
    # 1. Verify scan exists
    scan_result = await db.execute(select(Scan).where(Scan.id == scan_id))
    scan = scan_result.scalar_one_or_none()
    if not scan:
        raise HTTPException(404, f"Scan {scan_id} not found")

    scan.status = "PROCESSING"
    await db.commit()

    try:
        # 2. Load all bets for this scan
        bets_result = await db.execute(select(Bet).where(Bet.scan_id == scan_id))
        bets = bets_result.scalars().all()

        if not bets:
            scan.status = "COMPLETED"
            scan.summary = {"message": "Không có vé cược nào để quét"}
            await db.commit()
            return {"scan_id": scan_id, "status": "COMPLETED", "total_alerts": 0}

        # 3. Run detection engine with selected profile (offloaded to thread to avoid blocking event loop)
        scan_cat = getattr(scan, 'category', 'ALL') or 'ALL'
        raw_alerts = await asyncio.to_thread(
            detection_engine.run, scan_id, bets, category=scan_cat, profile_id=profile_id
        )

        # 4. Save alerts to database
        alert_counts = {
            "CROSS_HEDGE": 0, "TABLE_COVERAGE": 0, "SYNDICATE": 0, "ANOMALY": 0,
            "SPORTS_ARBITRAGE": 0, "SPORTS_HEDGE": 0
        }
        severity_counts = {"CRITICAL": 0, "HIGH": 0, "MEDIUM": 0, "LOW": 0}
        alerts_created = 0

        for raw_alert in raw_alerts:
            alert = Alert(
                id=str(uuid.uuid4()),
                scan_id=scan_id,
                alert_type=raw_alert.get("alert_type", "UNKNOWN"),
                severity=raw_alert.get("severity", "MEDIUM"),
                risk_score=raw_alert.get("risk_score", 50),
                bet_a_id=raw_alert.get("bet_a_id"),
                bet_b_id=raw_alert.get("bet_b_id"),
                time_diff_seconds=raw_alert.get("time_diff_seconds"),
                stake_diff_pct=raw_alert.get("stake_diff_pct"),
                description=raw_alert.get("description", ""),
                evidence=raw_alert.get("evidence", {}),
                status="PENDING",
            )
            db.add(alert)
            alerts_created += 1

            alert_type = raw_alert.get("alert_type", "UNKNOWN")
            if alert_type in alert_counts:
                alert_counts[alert_type] += 1

            severity = raw_alert.get("severity", "MEDIUM")
            if severity in severity_counts:
                severity_counts[severity] += 1

        # 5. Update account risk scores based on alerts
        # Fast map: bet_id -> player_id for O(1) player lookup
        bet_player_map = {b.id: b.player_id for b in bets if b.id and b.player_id}
        player_alert_scores: dict[str, list[int]] = {}
        for raw_alert in raw_alerts:
            r_score = raw_alert.get("risk_score", 50)
            pid_a = bet_player_map.get(raw_alert.get("bet_a_id"))
            if pid_a:
                player_alert_scores.setdefault(pid_a, []).append(r_score)

            pid_b = bet_player_map.get(raw_alert.get("bet_b_id"))
            if pid_b:
                player_alert_scores.setdefault(pid_b, []).append(r_score)

        # Update each account's risk score in batch
        flagged_pids = list(player_alert_scores.keys())
        if flagged_pids:
            for i in range(0, len(flagged_pids), 500):
                batch_pids = flagged_pids[i:i+500]
                acc_result = await db.execute(
                    select(Account).where(Account.player_id.in_(batch_pids))
                )
                for account in acc_result.scalars().all():
                    scores = player_alert_scores.get(account.player_id, [])
                    if not scores:
                        continue
                    new_score = min(100, max(scores))
                    if account.risk_score > 0:
                        new_score = min(100, int(0.4 * account.risk_score + 0.6 * new_score))
                    account.risk_score = new_score
                    account.total_alerts = (account.total_alerts or 0) + len(scores)

                    if new_score <= 25:
                        account.risk_level = "SAFE"
                    elif new_score <= 50:
                        account.risk_level = "WATCH"
                    elif new_score <= 75:
                        account.risk_level = "SUSPICIOUS"
                    else:
                        account.risk_level = "CRITICAL"
            await db.flush()

        # 6. Update scan summary
        scan.status = "COMPLETED"
        scan.completed_at = datetime.utcnow()
        scan.total_alerts = alerts_created
        scan.summary = {
            "alert_counts": alert_counts,
            "severity_counts": severity_counts,
            "players_flagged": len(player_alert_scores),
            "total_bets_scanned": len(bets),
        }

        await db.commit()

        return {
            "scan_id": scan_id,
            "status": "COMPLETED",
            "total_bets_scanned": len(bets),
            "total_alerts": alerts_created,
            "alert_counts": alert_counts,
            "severity_counts": severity_counts,
            "players_flagged": len(player_alert_scores),
        }

    except Exception as e:
        import traceback
        traceback.print_exc()
        try:
            scan.status = "FAILED"
            scan.summary = {"error": str(e)}
            await db.commit()
        except Exception:
            pass
        raise HTTPException(500, detail=f"Lỗi hệ thống khi quét: {str(e)}")


@router.get("")
async def list_scans(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """List all scans with pagination."""
    offset = (page - 1) * limit
    total_result = await db.execute(select(func.count(Scan.id)))
    total = total_result.scalar() or 0

    result = await db.execute(
        select(Scan).order_by(Scan.created_at.desc()).offset(offset).limit(limit)
    )
    scans = result.scalars().all()
    return {"items": scans, "total": total, "page": page, "limit": limit}


@router.get("/{scan_id}")
async def get_scan(scan_id: str, db: AsyncSession = Depends(get_db)):
    """Get scan detail with summary stats."""
    result = await db.execute(select(Scan).where(Scan.id == scan_id))
    scan = result.scalar_one_or_none()
    if not scan:
        raise HTTPException(404, "Scan not found")
    return scan


@router.get("/{scan_id}/alerts")
async def get_scan_alerts(
    scan_id: str,
    alert_type: Optional[str] = None,
    severity: Optional[str] = None,
    status: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    """Get alerts for a scan with optional filtering and pagination."""
    query = select(Alert).where(Alert.scan_id == scan_id)

    if alert_type:
        query = query.where(Alert.alert_type == alert_type)
    if severity:
        query = query.where(Alert.severity == severity)
    if status:
        query = query.where(Alert.status == status)

    # Count total
    count_query = select(func.count(Alert.id)).where(Alert.scan_id == scan_id)
    if alert_type:
        count_query = count_query.where(Alert.alert_type == alert_type)
    if severity:
        count_query = count_query.where(Alert.severity == severity)
    if status:
        count_query = count_query.where(Alert.status == status)

    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    offset = (page - 1) * limit
    result = await db.execute(
        query.order_by(Alert.risk_score.desc()).offset(offset).limit(limit)
    )
    alerts = result.scalars().all()

    items_out = []
    for alert in alerts:
        ev = dict(alert.evidence) if isinstance(alert.evidence, dict) else {}

        # If evidence lacks betA and bet_a_id is present, query it
        if not ev.get("betA") and alert.bet_a_id:
            res_a = await db.execute(select(Bet).where(Bet.id == alert.bet_a_id))
            b_a = res_a.scalar_one_or_none()
            if b_a:
                ev["betA"] = {
                    "id": b_a.id, "playerId": b_a.player_id, "platform": b_a.platform,
                    "category": b_a.category or "CASINO", "gameType": b_a.game_type, "betChoice": b_a.bet_choice,
                    "stake": float(b_a.stake), "payout": float(b_a.payout or 0),
                    "timestamp": b_a.bet_timestamp.isoformat() if b_a.bet_timestamp else "",
                    "result": b_a.result or "", "roundId": b_a.round_id or ""
                }
        if not ev.get("betB") and alert.bet_b_id:
            res_b = await db.execute(select(Bet).where(Bet.id == alert.bet_b_id))
            b_b = res_b.scalar_one_or_none()
            if b_b:
                ev["betB"] = {
                    "id": b_b.id, "playerId": b_b.player_id, "platform": b_b.platform,
                    "category": b_b.category or "CASINO", "gameType": b_b.game_type, "betChoice": b_b.bet_choice,
                    "stake": float(b_b.stake), "payout": float(b_b.payout or 0),
                    "timestamp": b_b.bet_timestamp.isoformat() if b_b.bet_timestamp else "",
                    "result": b_b.result or "", "roundId": b_b.round_id or ""
                }

        if "timeDiffSeconds" not in ev:
            ev["timeDiffSeconds"] = alert.time_diff_seconds or 0
        if "stakeDiffPercentage" not in ev:
            ev["stakeDiffPercentage"] = round((alert.stake_diff_pct or 0) * 100, 1)

        pids = []
        if ev.get("betA") and ev["betA"].get("playerId"):
            pids.append(ev["betA"]["playerId"])
        if ev.get("betB") and ev["betB"].get("playerId"):
            pids.append(ev["betB"]["playerId"])

        items_out.append({
            "id": alert.id,
            "scanId": alert.scan_id,
            "type": alert.alert_type.lower() if alert.alert_type else "cross_hedge",
            "category": "CASINO",
            "severity": alert.severity.lower() if alert.severity else "medium",
            "status": alert.status.lower() if alert.status else "pending",
            "playerIds": pids if pids else ["Người chơi nghi vấn"],
            "gameType": ev.get("gameType") or ev.get("game") or "Baccarat",
            "roundId": ev.get("roundId") or ev.get("round_id") or "",
            "riskScore": alert.risk_score,
            "timestamp": alert.created_at.isoformat() if alert.created_at else "",
            "description": alert.description or "",
            "evidence": ev,
        })

    return {"items": items_out, "total": total, "page": page, "limit": limit}


@router.delete("/{scan_id}")
async def delete_scan(scan_id: str, db: AsyncSession = Depends(get_db)):
    """Delete a scan session and its associated bets and alerts."""
    from sqlalchemy import delete
    scan_result = await db.execute(select(Scan).where(Scan.id == scan_id))
    scan = scan_result.scalar_one_or_none()
    if not scan:
        raise HTTPException(404, "Scan not found")

    await db.execute(delete(Alert).where(Alert.scan_id == scan_id))
    await db.execute(delete(Bet).where(Bet.scan_id == scan_id))
    await db.execute(delete(Scan).where(Scan.id == scan_id))
    await db.commit()
    return {"status": "success", "message": f"Đã xóa phiên quét {scan_id}"}

