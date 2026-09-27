import uuid
from sqlalchemy import Column, String, Integer, DateTime, JSON
from app.database import Base
from datetime import datetime

class Scan(Base):
    __tablename__ = "scans"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String)
    category = Column(String, default="CASINO") # CASINO or SPORTS or ALL
    status = Column(String) # PENDING/PROCESSING/COMPLETED/FAILED
    platforms = Column(JSON)
    total_bets = Column(Integer, default=0)
    total_alerts = Column(Integer, default=0)
    summary = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
