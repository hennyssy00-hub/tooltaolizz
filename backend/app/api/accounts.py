"""
Accounts API: View and manage player accounts and their risk profiles.
"""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.account import Account
from app.models.alert import Alert
from app.models.bet import Bet

router = APIRouter()


@router.get("")
async def list_accounts(
    q: Optional[str] = None,
    risk_level: Optional[str] = None,
    sort_by: str = Query("risk_score", pattern="^(risk_score|total_bets|total_alerts|last_seen)$"),
    order: str = Query("desc", pattern="^(asc|desc)$"),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """List all accounts with risk scores, filterable and sortable."""
    query = select(Account)

    if q:
        query = query.where(Account.player_id.ilike(f"%{q.strip()}%"))
    if risk_level:
        query = query.where(Account.risk_level == risk_level.upper())

    # Sort
    sort_col = getattr(Account, sort_by, Account.risk_score)
    if order == "desc":
        query = query.order_by(sort_col.desc())
    else:
        query = query.order_by(sort_col.asc())

    # Count
    count_query = select(func.count(Account.id))
    if q:
        count_query = count_query.where(Account.player_id.ilike(f"%{q.strip()}%"))
    if risk_level:
        count_query = count_query.where(Account.risk_level == risk_level.upper())
    total = (await db.execute(count_query)).scalar() or 0

    # Paginate
    offset = (page - 1) * limit
    result = await db.execute(query.offset(offset).limit(limit))
    accounts = result.scalars().all()

    items = []
    for acc in accounts:
        platforms = acc.platforms if isinstance(acc.platforms, list) else ["Tất cả sảnh"]
        items.append({
            "playerId": acc.player_id,
            "platforms": platforms,
            "totalBets": acc.total_bets or 0,
            "totalAlerts": acc.total_alerts or 0,
            "riskScore": acc.risk_score or 0,
            "riskLevel": (acc.risk_level or "safe").lower(),
            "isBlacklisted": bool(acc.is_blacklisted),
            "blacklistReason": acc.blacklist_reason or "",
            "lastSeen": acc.last_seen.isoformat() if acc.last_seen else ""
        })

    return {"items": items, "total": total, "page": page, "limit": limit}


@router.get("/{player_id}")
async def get_account(player_id: str, db: AsyncSession = Depends(get_db)):
    """Get detailed account information with associated alerts and betting stats."""
    acc_result = await db.execute(
        select(Account).where(Account.player_id == player_id)
    )
    account = acc_result.scalar_one_or_none()
    if not account:
        raise HTTPException(404, f"Account {player_id} not found")

    # Get all alerts involving this player
    # We need to join through bets to find alerts
    bet_ids_result = await db.execute(
        select(Bet.id).where(Bet.player_id == player_id)
    )
    bet_ids = [row[0] for row in bet_ids_result.all()]

    alerts = []
    if bet_ids:
        alerts_result = await db.execute(
            select(Alert)
            .where(
                (Alert.bet_a_id.in_(bet_ids)) | (Alert.bet_b_id.in_(bet_ids))
            )
            .order_by(Alert.risk_score.desc())
            .limit(50)
        )
        alerts = alerts_result.scalars().all()

    # Calculate betting stats
    stats_result = await db.execute(
        select(
            func.count(Bet.id).label("total_bets"),
            func.sum(Bet.stake).label("total_stake"),
            func.avg(Bet.stake).label("avg_stake"),
            func.count(func.distinct(Bet.platform)).label("platforms_count"),
        ).where(Bet.player_id == player_id)
    )
    stats = stats_result.one()

    # Win rate
    wins_result = await db.execute(
        select(func.count(Bet.id)).where(
            Bet.player_id == player_id,
            Bet.payout > 0,
        )
    )
    wins = wins_result.scalar() or 0
    total_bets = stats.total_bets or 0
    win_rate = (wins / total_bets * 100) if total_bets > 0 else 0

    return {
        "account": account,
        "alerts": alerts,
        "stats": {
            "total_bets": total_bets,
            "total_stake": float(stats.total_stake or 0),
            "avg_stake": round(float(stats.avg_stake or 0), 2),
            "win_rate": round(win_rate, 1),
            "platforms_count": stats.platforms_count or 0,
        },
    }
