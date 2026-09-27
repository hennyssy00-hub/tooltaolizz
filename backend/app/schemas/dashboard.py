from pydantic import BaseModel
from typing import List
from datetime import date

class DashboardStats(BaseModel):
    total_bets: int
    total_alerts: int
    accounts_flagged: int
    avg_risk_score: float

class RiskDistribution(BaseModel):
    level: str
    count: int

class TrendDataPoint(BaseModel):
    date: date
    alert_count: int
