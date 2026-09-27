"""
Alerts API: View and manage fraud alerts.
"""
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.alert import Alert
from app.models.bet import Bet

router = APIRouter()


class AlertUpdateRequest(BaseModel):
    status: str  # CONFIRMED, FALSE_POSITIVE, DISMISSED
    reviewed_by: Optional[str] = None


@router.get("")
async def list_alerts(
    q: Optional[str] = None,
    alert_type: Optional[str] = None,
    severity: Optional[str] = None,
    status: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    """List all alerts with filtering, search and pagination."""
    query = select(Alert)

    if alert_type and alert_type.upper() != "ALL":
        query = query.where(Alert.alert_type.ilike(f"%{alert_type}%"))
    if severity and severity.upper() != "ALL":
        query = query.where(Alert.severity == severity.upper())
    if status and status.upper() != "ALL":
        query = query.where(Alert.status == status.upper())
    if q:
        query = query.where(
            (Alert.description.ilike(f"%{q.strip()}%")) |
            (Alert.alert_type.ilike(f"%{q.strip()}%"))
        )

    count_query = select(func.count(Alert.id))
    if alert_type and alert_type.upper() != "ALL":
        count_query = count_query.where(Alert.alert_type.ilike(f"%{alert_type}%"))
    if severity and severity.upper() != "ALL":
        count_query = count_query.where(Alert.severity == severity.upper())
    if status and status.upper() != "ALL":
        count_query = count_query.where(Alert.status == status.upper())
    if q:
        count_query = count_query.where(
            (Alert.description.ilike(f"%{q.strip()}%")) |
            (Alert.alert_type.ilike(f"%{q.strip()}%"))
        )

    total = (await db.execute(count_query)).scalar() or 0

    offset = (page - 1) * limit
    result = await db.execute(
        query.order_by(Alert.risk_score.desc()).offset(offset).limit(limit)
    )
    alerts = result.scalars().all()

    items_out = []
    for alert in alerts:
        ev = dict(alert.evidence) if isinstance(alert.evidence, dict) else {}
        pids = []
        if ev.get("betA") and isinstance(ev["betA"], dict) and ev["betA"].get("playerId"):
            pids.append(ev["betA"]["playerId"])
        if ev.get("betB") and isinstance(ev["betB"], dict) and ev["betB"].get("playerId"):
            pids.append(ev["betB"]["playerId"])
        if not pids and ev.get("player_id"):
            pids.append(ev["player_id"])
        if not pids and ev.get("players") and isinstance(ev["players"], list):
            pids.extend(ev["players"])

        items_out.append({
            "id": alert.id,
            "scanId": alert.scan_id or "",
            "type": alert.alert_type.lower() if alert.alert_type else "cross_hedge",
            "category": ev.get("category") or "CASINO",
            "severity": alert.severity.lower() if alert.severity else "medium",
            "status": alert.status.lower() if alert.status else "pending",
            "playerIds": pids if pids else ["Người chơi nghi vấn"],
            "gameType": ev.get("gameType") or ev.get("game") or "Live Casino",
            "roundId": ev.get("roundId") or ev.get("round_id") or "",
            "riskScore": alert.risk_score or 50,
            "timestamp": alert.created_at.isoformat() if alert.created_at else "",
            "description": alert.description or "",
            "evidence": ev,
        })

    return {"items": items_out, "total": total, "page": page, "limit": limit}


@router.get("/{alert_id}")
async def get_alert(alert_id: str, db: AsyncSession = Depends(get_db)):
    """Get alert detail with full evidence and bet information."""
    result = await db.execute(select(Alert).where(Alert.id == alert_id))
    alert = result.scalar_one_or_none()
    if not alert:
        raise HTTPException(404, "Alert not found")

    response = {
        "alert": alert,
        "bet_a": None,
        "bet_b": None,
    }

    if alert.bet_a_id:
        bet_result = await db.execute(select(Bet).where(Bet.id == alert.bet_a_id))
        response["bet_a"] = bet_result.scalar_one_or_none()

    if alert.bet_b_id:
        bet_result = await db.execute(select(Bet).where(Bet.id == alert.bet_b_id))
        response["bet_b"] = bet_result.scalar_one_or_none()

    return response


@router.patch("/{alert_id}")
async def update_alert(
    alert_id: str, payload: AlertUpdateRequest, db: AsyncSession = Depends(get_db)
):
    """Update alert status (confirm fraud, dismiss, or mark as false positive)."""
    result = await db.execute(select(Alert).where(Alert.id == alert_id))
    alert = result.scalar_one_or_none()
    if not alert:
        raise HTTPException(404, "Alert not found")

    alert.status = payload.status
    alert.reviewed_by = payload.reviewed_by
    alert.reviewed_at = datetime.utcnow()
    await db.commit()

    return {"message": f"Alert updated to {payload.status}", "alert_id": alert_id}


@router.patch("/bulk-update")
async def bulk_update_alerts(
    alert_ids: list[str],
    status: str,
    db: AsyncSession = Depends(get_db),
):
    """Bulk update alert statuses."""
    for aid in alert_ids:
        result = await db.execute(select(Alert).where(Alert.id == aid))
        alert = result.scalar_one_or_none()
        if alert:
            alert.status = status
            alert.reviewed_at = datetime.utcnow()

    await db.commit()
    return {"message": f"Updated {len(alert_ids)} alerts to {status}"}
