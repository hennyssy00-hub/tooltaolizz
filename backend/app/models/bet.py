import uuid
from sqlalchemy import Column, String, Numeric, DateTime, JSON, ForeignKey, Index
from app.database import Base
from datetime import datetime

class Bet(Base):
    __tablename__ = "bets"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    scan_id = Column(String, ForeignKey("scans.id"), index=True)
    platform = Column(String)
    category = Column(String, default="CASINO", index=True) # CASINO or SPORTS
    provider = Column(String)
    game_type = Column(String)
    event_name = Column(String, nullable=True) # Tên trận đấu (vd: Arsenal vs Chelsea)
    league = Column(String, nullable=True)     # Giải đấu (vd: Premier League)
    table_id = Column(String, nullable=True)   # Mã/tên bàn (Casino)
    round_id = Column(String, nullable=True)   # Mã phiên ván (Casino)
    player_id = Column(String, index=True)
    bet_choice = Column(String)
    bet_choice_normalized = Column(String)
    odds = Column(Numeric, nullable=True)      # Tỷ lệ cược (Odds)
    stake = Column(Numeric)
    valid_bet = Column(Numeric)
    payout = Column(Numeric)
    bet_timestamp = Column(DateTime)
    ip_address = Column(String, nullable=True, index=True)   # Địa chỉ IP người chơi đặt cược
    device_id = Column(String, nullable=True, index=True)    # Mã phần cứng / Device Fingerprint
    agent_id = Column(String, nullable=True, index=True)     # Mã đại lý / Upline / Tuyến trên
    bet_type_detail = Column(String, nullable=True)          # Loại cược chi tiết (Live, Early, Parlay...)
    result = Column(String)
    raw_data = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index('idx_provider_game_round', 'provider', 'game_type', 'round_id'),
    )
