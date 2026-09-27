"""
Platform Configs API: Save and manage column mappings for different betting platforms.
"""
import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.platform_config import PlatformConfig

router = APIRouter()


class PlatformConfigCreate(BaseModel):
    platform_name: str
    column_mapping: dict[str, str]
    file_type: str = "csv"
    notes: Optional[str] = None


class PlatformConfigUpdate(BaseModel):
    column_mapping: Optional[dict[str, str]] = None
    notes: Optional[str] = None


@router.get("")
async def list_configs(db: AsyncSession = Depends(get_db)):
    """List all saved platform column mappings."""
    result = await db.execute(select(PlatformConfig).order_by(PlatformConfig.platform_name))
    return result.scalars().all()


@router.post("")
async def create_config(payload: PlatformConfigCreate, db: AsyncSession = Depends(get_db)):
    """Save a new column mapping for a platform."""
    # Check if platform already exists
    existing = await db.execute(
        select(PlatformConfig).where(PlatformConfig.platform_name == payload.platform_name)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(409, f"Platform '{payload.platform_name}' already has a saved config. Use PUT to update.")

    config = PlatformConfig(
        id=str(uuid.uuid4()),
        platform_name=payload.platform_name,
        column_mapping=payload.column_mapping,
        file_type=payload.file_type,
        notes=payload.notes,
    )
    db.add(config)
    await db.commit()
    await db.refresh(config)
    return config


@router.put("/{config_id}")
async def update_config(config_id: str, payload: PlatformConfigUpdate, db: AsyncSession = Depends(get_db)):
    """Update an existing column mapping."""
    result = await db.execute(select(PlatformConfig).where(PlatformConfig.id == config_id))
    config = result.scalar_one_or_none()
    if not config:
        raise HTTPException(404, "Config not found")

    if payload.column_mapping is not None:
        config.column_mapping = payload.column_mapping
    if payload.notes is not None:
        config.notes = payload.notes

    await db.commit()
    return config


@router.delete("/{config_id}")
async def delete_config(config_id: str, db: AsyncSession = Depends(get_db)):
    """Delete a column mapping."""
    result = await db.execute(select(PlatformConfig).where(PlatformConfig.id == config_id))
    config = result.scalar_one_or_none()
    if not config:
        raise HTTPException(404, "Config not found")

    await db.delete(config)
    await db.commit()
    return {"message": f"Deleted config for {config.platform_name}"}
