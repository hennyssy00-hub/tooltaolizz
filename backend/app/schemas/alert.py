from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime
from app.schemas.bet import BetBrief

class EvidencePair(BaseModel):
    bet_a: Optional[BetBrief]
    bet_b: Optional[BetBrief]
    time_diff_seconds: Optional[float]
    stake_diff_pct: Optional[float]

class AlertBase(BaseModel):
    alert_type: str
    severity: str
    risk_score: int
    description: str
    status: str = "PENDING"

class AlertUpdate(BaseModel):
    status: str
    reviewed_by: Optional[str]

class AlertResponse(AlertBase):
    id: str
    scan_id: str
    evidence: Dict[str, Any]
    bet_a_id: str
    bet_b_id: Optional[str]
    time_diff_seconds: Optional[float]
    stake_diff_pct: Optional[float]
    reviewed_by: Optional[str]
    reviewed_at: Optional[datetime]
    created_at: datetime
    class Config:
        from_attributes = True

class AlertListItem(AlertBase):
    id: str
    scan_id: str
    created_at: datetime
    class Config:
        from_attributes = True
