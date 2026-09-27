from pydantic import BaseModel
from typing import Optional, Any
from datetime import datetime
from decimal import Decimal

class BetBase(BaseModel):
    platform: str
    provider: str
    game_type: str
    table_id: Optional[str] = None
    round_id: Optional[str] = None
    player_id: str
    bet_choice: str
    stake: Decimal
    valid_bet: Decimal
    payout: Decimal
    bet_timestamp: datetime
    result: str
    ip_address: Optional[str] = None
    device_id: Optional[str] = None
    agent_id: Optional[str] = None
    bet_type_detail: Optional[str] = None
    event_name: Optional[str] = None
    league: Optional[str] = None
    odds: Optional[Decimal] = None

class BetCreate(BetBase):
    scan_id: str
    bet_choice_normalized: str
    raw_data: dict[str, Any]

class BetResponse(BetCreate):
    id: str
    created_at: datetime
    class Config:
        from_attributes = True

class BetBrief(BaseModel):
    id: str
    platform: str
    player_id: str
    bet_choice: str
    stake: Decimal
    bet_timestamp: datetime
    class Config:
        from_attributes = True
