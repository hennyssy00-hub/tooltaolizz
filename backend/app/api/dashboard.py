"""
Dashboard API: Provides aggregated statistics, trends, and risk distribution data
with support for filtering by platform category (Casino vs Sports).
"""
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func, case, cast, Date
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.bet import Bet
from app.models.alert import Alert
from app.models.account import Account
from app.models.scan import Scan

router = APIRouter()


@router.post("/reset-data")
async def reset_data(db: AsyncSession = Depends(get_db)):
    """Reset all bets, alerts, scans, and accounts back to 0."""
    from sqlalchemy import delete
    await db.execute(delete(Alert))
    await db.execute(delete(Bet))
    await db.execute(delete(Scan))
    await db.execute(delete(Account))
    await db.commit()
    return {"status": "success", "message": "Toàn bộ dữ liệu đã được làm sạch về 0."}


@router.get("/stats")
async def get_stats(
    category: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """Get overall dashboard statistics, optionally filtered by category (CASINO, SPORTS, ALL)."""
    bet_query = select(func.count(Bet.id))
    if category and category.upper() in ["CASINO", "SPORTS"]:
        bet_query = bet_query.where(Bet.category == category.upper())
    total_bets = (await db.execute(bet_query)).scalar() or 0

    alert_query = select(func.count(Alert.id))
    if category and category.upper() == "CASINO":
        alert_query = alert_query.where(Alert.alert_type.in_(["CROSS_HEDGE", "TABLE_COVERAGE"]))
    elif category and category.upper() == "SPORTS":
        alert_query = alert_query.where(Alert.alert_type.in_(["SPORTS_ARBITRAGE", "SPORTS_HEDGE"]))
    total_alerts = (await db.execute(alert_query)).scalar() or 0

    flagged_result = await db.execute(
        select(func.count(Account.id)).where(Account.risk_level.in_(["SUSPICIOUS", "CRITICAL"]))
    )
    accounts_flagged = flagged_result.scalar() or 0

    avg_result = await db.execute(
        select(func.avg(Account.risk_score)).where(Account.total_alerts > 0)
    )
    avg_risk = avg_result.scalar() or 0.0

    return {
        "total_bets": total_bets,
        "total_alerts": total_alerts,
        "accounts_flagged": accounts_flagged,
        "avg_risk_score": round(float(avg_risk), 1),
        "category": category or "ALL",
    }


@router.get("/trends")
async def get_trends(
    days: int = 30,
    category: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """Get alert count trends by day for the last N days."""
    cutoff = datetime.utcnow() - timedelta(days=days)

    query = select(
        cast(Alert.created_at, Date).label("date"),
        func.count(Alert.id).label("alert_count"),
    ).where(Alert.created_at >= cutoff)

    if category and category.upper() == "CASINO":
        query = query.where(Alert.alert_type.in_(["CROSS_HEDGE", "TABLE_COVERAGE"]))
    elif category and category.upper() == "SPORTS":
        query = query.where(Alert.alert_type.in_(["SPORTS_ARBITRAGE", "SPORTS_HEDGE"]))

    result = await db.execute(
        query.group_by(cast(Alert.created_at, Date)).order_by(cast(Alert.created_at, Date))
    )
    rows = result.all()

    return [{"date": str(row.date), "alert_count": row.alert_count} for row in rows]


@router.get("/risk-distribution")
async def get_risk_distribution(db: AsyncSession = Depends(get_db)):
    """Get count of accounts in each risk level."""
    result = await db.execute(
        select(
            Account.risk_level,
            func.count(Account.id).label("count"),
        )
        .group_by(Account.risk_level)
    )
    rows = result.all()

    distribution = {"SAFE": 0, "WATCH": 0, "SUSPICIOUS": 0, "CRITICAL": 0}
    for row in rows:
        if row.risk_level in distribution:
            distribution[row.risk_level] = row.count

    return [{"level": k, "count": v} for k, v in distribution.items()]


@router.get("/recent-alerts")
async def get_recent_alerts(
    limit: int = 10,
    category: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """Get the most recent high-severity alerts."""
    query = select(Alert).where(Alert.severity.in_(["CRITICAL", "HIGH"]))

    if category and category.upper() == "CASINO":
        query = query.where(Alert.alert_type.in_(["CROSS_HEDGE", "TABLE_COVERAGE"]))
    elif category and category.upper() == "SPORTS":
        query = query.where(Alert.alert_type.in_(["SPORTS_ARBITRAGE", "SPORTS_HEDGE"]))

    result = await db.execute(query.order_by(Alert.created_at.desc()).limit(limit))
    alerts = result.scalars().all()

    enriched = []
    for alert in alerts:
        alert_dict = {
            "id": alert.id,
            "alert_type": alert.alert_type,
            "severity": alert.severity,
            "risk_score": alert.risk_score,
            "description": alert.description,
            "status": alert.status,
            "created_at": str(alert.created_at) if alert.created_at else None,
        }

        if alert.bet_a_id:
            bet_result = await db.execute(select(Bet).where(Bet.id == alert.bet_a_id))
            bet_a = bet_result.scalar_one_or_none()
            if bet_a:
                alert_dict["player_a"] = bet_a.player_id
                alert_dict["platform_a"] = bet_a.platform
                alert_dict["game_type"] = bet_a.game_type
                alert_dict["round_id"] = bet_a.round_id or bet_a.event_name
                alert_dict["category"] = getattr(bet_a, 'category', 'CASINO')

        if alert.bet_b_id:
            bet_result = await db.execute(select(Bet).where(Bet.id == alert.bet_b_id))
            bet_b = bet_result.scalar_one_or_none()
            if bet_b:
                alert_dict["player_b"] = bet_b.player_id
                alert_dict["platform_b"] = bet_b.platform

        enriched.append(alert_dict)

    return enriched
