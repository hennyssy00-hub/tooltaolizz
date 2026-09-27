from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime

class ScanCreate(BaseModel):
    name: str
    platforms: List[str]

class ScanSummary(BaseModel):
    cross_hedge: int = 0
    table_coverage: int = 0
    syndicate: int = 0
    anomaly: int = 0

class ScanResponse(ScanCreate):
    id: str
    status: str
    total_bets: int
    total_alerts: int
    summary: Optional[Dict[str, Any]]
    created_at: datetime
    completed_at: Optional[datetime]
    class Config:
        from_attributes = True

class ScanListItem(BaseModel):
    id: str
    name: str
    status: str
    total_bets: int
    total_alerts: int
    created_at: datetime
    class Config:
        from_attributes = True
