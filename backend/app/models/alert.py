import uuid
from sqlalchemy import Column, String, Integer, Float, DateTime, JSON, ForeignKey
from app.database import Base
from datetime import datetime

class Alert(Base):
    __tablename__ = "alerts"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    scan_id = Column(String, ForeignKey("scans.id"))
    alert_type = Column(String)
    severity = Column(String)
    risk_score = Column(Integer)
    bet_a_id = Column(String, ForeignKey("bets.id"))
    bet_b_id = Column(String, ForeignKey("bets.id"), nullable=True)
    time_diff_seconds = Column(Float, nullable=True)
    stake_diff_pct = Column(Float, nullable=True)
    description = Column(String)
    evidence = Column(JSON)
    status = Column(String, default="PENDING")
    reviewed_by = Column(String, nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
