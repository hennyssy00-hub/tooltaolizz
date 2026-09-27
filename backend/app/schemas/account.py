from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class AccountBase(BaseModel):
    player_id: str
    platforms: List[str]
    total_bets: int
    total_alerts: int
    risk_score: int
    risk_level: str
    first_seen: datetime
    last_seen: datetime
    is_blacklisted: bool
    notes: Optional[str]

class AccountUpdate(BaseModel):
    risk_score: Optional[int]
    risk_level: Optional[str]
    is_blacklisted: Optional[bool]
    blacklist_reason: Optional[str]
    notes: Optional[str]

class AccountResponse(AccountBase):
    id: str
    blacklisted_at: Optional[datetime]
    blacklist_reason: Optional[str]
    created_at: datetime
    updated_at: datetime
    class Config:
        from_attributes = True

class AccountListItem(AccountBase):
    id: str
    updated_at: datetime
    class Config:
        from_attributes = True
