"""
Blacklist API: Manage blacklisted player accounts.
"""
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.account import Account

router = APIRouter()


class BlacklistRequest(BaseModel):
    player_id: str
    reason: str


@router.get("")
async def list_blacklist(db: AsyncSession = Depends(get_db)):
    """List all blacklisted accounts."""
    result = await db.execute(
        select(Account)
        .where(Account.is_blacklisted == True)
        .order_by(Account.blacklisted_at.desc())
    )
    return result.scalars().all()


@router.post("")
async def add_blacklist(payload: BlacklistRequest, db: AsyncSession = Depends(get_db)):
    """Add an account to the blacklist."""
    result = await db.execute(
        select(Account).where(Account.player_id == payload.player_id)
    )
    account = result.scalar_one_or_none()
    if not account:
        raise HTTPException(404, f"Account {payload.player_id} not found")

    account.is_blacklisted = True
    account.blacklisted_at = datetime.utcnow()
    account.blacklist_reason = payload.reason
    account.risk_level = "CRITICAL"
    account.risk_score = 100
    await db.commit()

    return {"message": f"Đã thêm {payload.player_id} vào danh sách đen", "account": account}


@router.delete("/{player_id}")
async def remove_blacklist(player_id: str, db: AsyncSession = Depends(get_db)):
    """Remove an account from the blacklist."""
    result = await db.execute(
        select(Account).where(Account.player_id == player_id)
    )
    account = result.scalar_one_or_none()
    if not account:
        raise HTTPException(404, f"Account {player_id} not found")

    account.is_blacklisted = False
    account.blacklisted_at = None
    account.blacklist_reason = None
    await db.commit()

    return {"message": f"Đã xóa {player_id} khỏi danh sách đen"}
