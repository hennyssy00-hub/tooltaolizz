import uuid
from sqlalchemy import Column, String, Integer, Boolean, DateTime, JSON
from app.database import Base
from datetime import datetime

class Account(Base):
    __tablename__ = "accounts"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    player_id = Column(String, unique=True, index=True)
    platforms = Column(JSON)
    total_bets = Column(Integer, default=0)
    total_alerts = Column(Integer, default=0)
    risk_score = Column(Integer, default=0)
    risk_level = Column(String, default="SAFE")
    first_seen = Column(DateTime)
    last_seen = Column(DateTime)
    is_blacklisted = Column(Boolean, default=False)
    blacklisted_at = Column(DateTime, nullable=True)
    blacklist_reason = Column(String, nullable=True)
    notes = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
