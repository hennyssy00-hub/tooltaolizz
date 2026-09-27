import uuid
from sqlalchemy import Column, String, DateTime, JSON
from app.database import Base
from datetime import datetime

class PlatformConfig(Base):
    __tablename__ = "platform_configs"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    platform_name = Column(String, unique=True)
    column_mapping = Column(JSON)
    file_type = Column(String)
    notes = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
