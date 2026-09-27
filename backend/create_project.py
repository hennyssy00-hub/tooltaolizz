import os
import textwrap

base_dir = r'C:\Users\HONG\.gemini\antigravity\scratch\casino-guard\backend'
app_dir = os.path.join(base_dir, 'app')

files = {}

files['requirements.txt'] = """
fastapi==0.115.0
uvicorn[standard]==0.30.0
sqlalchemy[asyncio]==2.0.35
asyncpg==0.30.0
alembic==1.13.0
pydantic==2.9.0
pydantic-settings==2.5.0
pandas==2.2.0
openpyxl==3.1.5
python-multipart==0.0.12
aiofiles==24.1.0
jinja2==3.1.4
weasyprint==62.3
xlsxwriter==3.2.0
passlib[bcrypt]==1.7.4
python-jose[cryptography]==3.3.0
httpx==0.27.0
celery[redis]==5.4.0
redis==5.1.0
pytest==8.3.0
pytest-asyncio==0.24.0
"""

files['app/__init__.py'] = ""

files['app/config.py'] = """
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite+aiosqlite:///./casino_guard.db"
    REDIS_URL: str = "redis://localhost:6379/0"
    SECRET_KEY: str = "your-secret-key-here"
    UPLOAD_DIR: str = "./uploads"
    
    class Config:
        env_file = ".env"

settings = Settings()
"""

files['app/database.py'] = """
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import declarative_base, sessionmaker
from app.config import settings

engine = create_async_engine(settings.DATABASE_URL, echo=False)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
Base = declarative_base()

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
"""

files['app/main.py'] = """
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
import app.models
from app.api import upload, scan, dashboard, alerts, accounts, blacklist, reports, platform_configs
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield

app = FastAPI(title="CasinoGuard API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(upload.router, prefix="/api/upload", tags=["Upload"])
app.include_router(scan.router, prefix="/api/scans", tags=["Scans"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["Dashboard"])
app.include_router(alerts.router, prefix="/api/alerts", tags=["Alerts"])
app.include_router(accounts.router, prefix="/api/accounts", tags=["Accounts"])
app.include_router(blacklist.router, prefix="/api/blacklist", tags=["Blacklist"])
app.include_router(reports.router, prefix="/api/reports", tags=["Reports"])
app.include_router(platform_configs.router, prefix="/api/platform-configs", tags=["Platform Configs"])
"""

files['app/models/__init__.py'] = """
from app.models.bet import Bet
from app.models.scan import Scan
from app.models.alert import Alert
from app.models.account import Account
from app.models.platform_config import PlatformConfig
"""

files['app/models/bet.py'] = """
import uuid
from sqlalchemy import Column, String, Numeric, DateTime, JSON, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base
from datetime import datetime

class Bet(Base):
    __tablename__ = "bets"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    scan_id = Column(String, ForeignKey("scans.id"), index=True)
    platform = Column(String)
    provider = Column(String)
    game_type = Column(String)
    table_id = Column(String)
    round_id = Column(String)
    player_id = Column(String, index=True)
    bet_choice = Column(String)
    bet_choice_normalized = Column(String)
    stake = Column(Numeric)
    valid_bet = Column(Numeric)
    payout = Column(Numeric)
    bet_timestamp = Column(DateTime)
    result = Column(String)
    raw_data = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index('idx_provider_game_round', 'provider', 'game_type', 'round_id'),
    )
"""

files['app/models/scan.py'] = """
import uuid
from sqlalchemy import Column, String, Integer, DateTime, JSON
from app.database import Base
from datetime import datetime

class Scan(Base):
    __tablename__ = "scans"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String)
    status = Column(String) # PENDING/PROCESSING/COMPLETED/FAILED
    platforms = Column(JSON)
    total_bets = Column(Integer, default=0)
    total_alerts = Column(Integer, default=0)
    summary = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
"""

files['app/models/alert.py'] = """
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
"""

files['app/models/account.py'] = """
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
"""

files['app/models/platform_config.py'] = """
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
"""

files['app/schemas/__init__.py'] = ""

files['app/schemas/bet.py'] = """
from pydantic import BaseModel
from typing import Optional, Any
from datetime import datetime
from decimal import Decimal

class BetBase(BaseModel):
    platform: str
    provider: str
    game_type: str
    table_id: str
    round_id: str
    player_id: str
    bet_choice: str
    stake: Decimal
    valid_bet: Decimal
    payout: Decimal
    bet_timestamp: datetime
    result: str

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
"""

files['app/schemas/scan.py'] = """
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
"""

files['app/schemas/alert.py'] = """
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
"""

files['app/schemas/account.py'] = """
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
"""

files['app/schemas/dashboard.py'] = """
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
"""

files['app/schemas/platform_config.py'] = """
from pydantic import BaseModel
from typing import Dict, Optional
from datetime import datetime

class PlatformConfigCreate(BaseModel):
    platform_name: str
    column_mapping: Dict[str, str]
    file_type: str
    notes: Optional[str] = None

class PlatformConfigResponse(PlatformConfigCreate):
    id: str
    created_at: datetime
    updated_at: datetime
    class Config:
        from_attributes = True
"""

files['app/services/__init__.py'] = ""
files['app/services/parser/__init__.py'] = ""

files['app/services/parser/base_parser.py'] = """
from abc import ABC, abstractmethod
from typing import List, Dict, Any

class BaseParser(ABC):
    @abstractmethod
    def parse(self, file_path: str, platform_config: dict) -> List[Dict[str, Any]]:
        pass
"""

files['app/services/parser/csv_parser.py'] = """
import pandas as pd
from typing import List, Dict, Any
from app.services.parser.base_parser import BaseParser

class CSVParser(BaseParser):
    def parse(self, file_path: str, platform_config: dict) -> List[Dict[str, Any]]:
        if file_path.endswith('.xlsx'):
            df = pd.read_excel(file_path)
        else:
            df = pd.read_csv(file_path)
        
        if platform_config and 'column_mapping' in platform_config:
            mapping = platform_config['column_mapping']
            # Reverse mapping to rename columns to standard names
            inv_map = {v: k for k, v in mapping.items()}
            df = df.rename(columns=inv_map)
            
        return df.to_dict(orient='records')
"""

files['app/services/parser/column_mapper.py'] = """
class ColumnMapper:
    KEYWORDS = {
        'round_id': ['round', 'ván', 'phiên', 'mã ván', 'game no', '游戏编号', 'round id', 'round no'],
        'player_id': ['user', 'player', 'username', 'tên', 'member', '会员', 'account', 'tài khoản'],
        'game_type': ['game', 'trò', 'loại game', 'game type', '游戏类型', 'product'],
        'bet_choice': ['bet', 'cửa', 'choice', 'selection', '下注', 'bet on', 'bet type'],
        'stake': ['stake', 'tiền', 'amount', 'bet amount', '下注金额', 'số tiền', 'cược'],
        'payout': ['payout', 'win', 'thắng', 'winloss', 'win/loss', '输赢', 'profit'],
        'bet_timestamp': ['time', 'date', 'thời gian', 'ngày', 'bet time', '下注时间', 'timestamp'],
        'result': ['result', 'kết quả', 'status', 'outcome', '结果'],
        'table_id': ['table', 'bàn', 'desk', '桌号', 'table name', 'table id'],
        'provider': ['provider', 'sảnh', 'platform', 'vendor', '平台']
    }

    def detect_mapping(self, columns: list[str]) -> dict[str, str]:
        mapping = {}
        for col in columns:
            col_lower = col.lower()
            for std_field, keywords in self.KEYWORDS.items():
                if std_field in mapping:
                    continue
                if any(kw in col_lower for kw in keywords):
                    mapping[std_field] = col
                    break
        return mapping
"""

files['app/services/parser/normalizer.py'] = """
GAME_TYPE_MAP = {
    '百家乐': 'BACCARAT', 'Baccarat': 'BACCARAT', 'BAC': 'BACCARAT', 'bac': 'BACCARAT',
    '骰宝': 'SICBO', 'Sic Bo': 'SICBO', 'Sicbo': 'SICBO', 'Tai Xiu': 'SICBO', 'Tài Xỉu': 'SICBO',
    '轮盘': 'ROULETTE', 'Roulette': 'ROULETTE', 'RLT': 'ROULETTE',
    '龙虎': 'DRAGON_TIGER', 'Dragon Tiger': 'DRAGON_TIGER', 'Rồng Hổ': 'DRAGON_TIGER',
    '番摊': 'FANTAN', 'Fan Tan': 'FANTAN',
    '牛牛': 'BULL_BULL', 'Bull Bull': 'BULL_BULL', 'Niu Niu': 'BULL_BULL'
}

BET_CHOICE_MAP = {
    '庄': 'BANKER', 'Banker': 'BANKER', 'B': 'BANKER', 'Cái': 'BANKER', 'BANK': 'BANKER',
    '闲': 'PLAYER', 'Player': 'PLAYER', 'P': 'PLAYER', 'Con': 'PLAYER', 'PLAY': 'PLAYER',
    '和': 'TIE', 'Tie': 'TIE', 'T': 'TIE', 'Hòa': 'TIE',
    '大': 'BIG', 'Big': 'BIG', 'Over': 'BIG', 'Tài': 'BIG', 'O': 'BIG',
    '小': 'SMALL', 'Small': 'SMALL', 'Under': 'SMALL', 'Xỉu': 'SMALL', 'U': 'SMALL',
    '单': 'ODD', 'Odd': 'ODD', 'Lẻ': 'ODD',
    '双': 'EVEN', 'Even': 'EVEN', 'Chẵn': 'EVEN',
    '龙': 'DRAGON', 'Dragon': 'DRAGON', 'Rồng': 'DRAGON',
    '虎': 'TIGER', 'Tiger': 'TIGER', 'Hổ': 'TIGER',
    '红': 'RED', 'Red': 'RED', 'Đỏ': 'RED', 'R': 'RED',
    '黑': 'BLACK', 'Black': 'BLACK', 'Đen': 'BLACK', 'BLK': 'BLACK'
}

def normalize_game_type(raw_type: str) -> str:
    return GAME_TYPE_MAP.get(raw_type, raw_type.upper())

def normalize_bet_choice(raw_choice: str) -> str:
    return BET_CHOICE_MAP.get(raw_choice, raw_choice.upper())
"""

files['app/services/detection/__init__.py'] = ""

files['app/services/detection/rules.py'] = """
OPPOSITE_BETS = {
    'BACCARAT': [('BANKER', 'PLAYER')],
    'SICBO': [('BIG', 'SMALL'), ('ODD', 'EVEN')],
    'ROULETTE': [('RED', 'BLACK'), ('ODD', 'EVEN'), ('BIG', 'SMALL')],
    'DRAGON_TIGER': [('DRAGON', 'TIGER')]
}

def is_opposite(game_type: str, choice_a: str, choice_b: str) -> bool:
    pairs = OPPOSITE_BETS.get(game_type, [])
    for p in pairs:
        if (choice_a == p[0] and choice_b == p[1]) or (choice_a == p[1] and choice_b == p[0]):
            return True
    return False
"""

files['app/services/detection/cross_hedging.py'] = """
from app.services.detection.rules import is_opposite

class CrossHedgingDetector:
    def detect(self, bets):
        alerts = []
        # Group by provider, game_type, round_id
        groups = {}
        for b in bets:
            key = (b.provider, b.game_type, b.round_id)
            groups.setdefault(key, []).append(b)
        
        for key, group_bets in groups.items():
            if len(group_bets) < 2:
                continue
            
            for i in range(len(group_bets)):
                for j in range(i+1, len(group_bets)):
                    a = group_bets[i]
                    b = group_bets[j]
                    
                    if a.player_id == b.player_id and a.platform == b.platform:
                        continue # Usually handled by platform itself, but still can flag. Let's look for cross.
                    
                    if is_opposite(a.game_type, a.bet_choice_normalized, b.bet_choice_normalized):
                        stake_a = float(a.stake)
                        stake_b = float(b.stake)
                        max_stake = max(stake_a, stake_b)
                        stake_diff_pct = abs(stake_a - stake_b) / max_stake if max_stake > 0 else 0
                        time_diff = abs((a.bet_timestamp - b.bet_timestamp).total_seconds())
                        
                        severity = "MEDIUM"
                        if stake_diff_pct <= 0.15 and time_diff <= 60:
                            severity = "CRITICAL"
                        elif stake_diff_pct <= 0.30 and time_diff <= 300:
                            severity = "HIGH"
                            
                        alerts.append({
                            "alert_type": "CROSS_HEDGE",
                            "severity": severity,
                            "risk_score": 90 if severity == "CRITICAL" else (70 if severity == "HIGH" else 40),
                            "bet_a_id": a.id,
                            "bet_b_id": b.id,
                            "time_diff_seconds": time_diff,
                            "stake_diff_pct": stake_diff_pct,
                            "description": f"Cross hedging detected between {a.player_id} and {b.player_id}",
                            "evidence": {"round_id": a.round_id, "game": a.game_type}
                        })
        return alerts
"""

files['app/services/detection/table_coverage.py'] = """
class TableCoverageDetector:
    def detect(self, bets):
        # Placeholder for table coverage logic
        return []
"""

files['app/services/detection/syndicate.py'] = """
class SyndicateDetector:
    def detect(self, bets):
        # Placeholder for syndicate detection logic
        return []
"""

files['app/services/detection/anomaly.py'] = """
class AnomalyDetector:
    def detect(self, bets):
        # Placeholder for anomaly detection logic
        return []
"""

files['app/services/detection/engine.py'] = """
from app.services.detection.cross_hedging import CrossHedgingDetector
from app.services.detection.table_coverage import TableCoverageDetector
from app.services.detection.syndicate import SyndicateDetector
from app.services.detection.anomaly import AnomalyDetector

class DetectionEngine:
    def __init__(self):
        self.detectors = [
            CrossHedgingDetector(),
            TableCoverageDetector(),
            SyndicateDetector(),
            AnomalyDetector()
        ]
        
    def run(self, scan_id, bets):
        all_alerts = []
        for d in self.detectors:
            alerts = d.detect(bets)
            for a in alerts:
                a['scan_id'] = scan_id
            all_alerts.extend(alerts)
        return all_alerts
"""

files['app/services/risk_scorer.py'] = """
class RiskScorer:
    def score(self, accounts, alerts):
        pass
"""

files['app/services/report_generator.py'] = """
class ReportGenerator:
    def generate_excel(self, scan_id):
        pass
"""

files['app/api/__init__.py'] = ""

files['app/api/upload.py'] = """
from fastapi import APIRouter, UploadFile, File, Form, Depends
from typing import Any
router = APIRouter()

@router.post("")
async def upload_file(file: UploadFile = File(...), platform_name: str = Form(...)):
    return {"message": "File uploaded", "filename": file.filename}

@router.post("/detect-columns")
async def detect_columns(file: UploadFile = File(...)):
    return {"mapping": {}}
"""

files['app/api/scan.py'] = """
from fastapi import APIRouter
router = APIRouter()

@router.post("")
async def create_scan():
    return {"scan_id": "test"}

@router.get("")
async def list_scans():
    return []

@router.get("/{scan_id}")
async def get_scan(scan_id: str):
    return {}

@router.get("/{scan_id}/alerts")
async def get_scan_alerts(scan_id: str):
    return []
"""

files['app/api/dashboard.py'] = """
from fastapi import APIRouter
router = APIRouter()

@router.get("/stats")
async def get_stats():
    return {}

@router.get("/trends")
async def get_trends():
    return []

@router.get("/risk-distribution")
async def get_risk_distribution():
    return []

@router.get("/recent-alerts")
async def get_recent_alerts():
    return []
"""

files['app/api/alerts.py'] = """
from fastapi import APIRouter
router = APIRouter()

@router.get("")
async def list_alerts():
    return []

@router.get("/{alert_id}")
async def get_alert(alert_id: str):
    return {}

@router.patch("/{alert_id}")
async def update_alert(alert_id: str):
    return {}
"""

files['app/api/accounts.py'] = """
from fastapi import APIRouter
router = APIRouter()

@router.get("")
async def list_accounts():
    return []

@router.get("/{player_id}")
async def get_account(player_id: str):
    return {}
"""

files['app/api/blacklist.py'] = """
from fastapi import APIRouter
router = APIRouter()

@router.get("")
async def list_blacklist():
    return []

@router.post("")
async def add_blacklist():
    return {}

@router.delete("/{player_id}")
async def remove_blacklist(player_id: str):
    return {}
"""

files['app/api/reports.py'] = """
from fastapi import APIRouter
router = APIRouter()

@router.get("/scan/{scan_id}/excel")
async def download_excel(scan_id: str):
    return {}
"""

files['app/api/platform_configs.py'] = """
from fastapi import APIRouter
router = APIRouter()

@router.get("")
async def list_configs():
    return []

@router.post("")
async def create_config():
    return {}

@router.put("/{id}")
async def update_config(id: str):
    return {}

@router.delete("/{id}")
async def delete_config(id: str):
    return {}
"""

files['app/utils/__init__.py'] = ""

files['app/utils/mock_data.py'] = """
import csv
import os
from datetime import datetime, timedelta
import random

def generate_mock_data():
    output_dir = os.path.join(os.path.dirname(__file__), '../../mock_data')
    os.makedirs(output_dir, exist_ok=True)
    
    platforms = ['platform_alpha', 'platform_beta', 'platform_gamma']
    
    for p in platforms:
        with open(os.path.join(output_dir, f"{p}.csv"), 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow(['round_id', 'player_id', 'game_type', 'bet_choice', 'stake', 'payout', 'bet_timestamp', 'result', 'table_id', 'provider'])
            # Generate dummy data
            for i in range(100):
                writer.writerow([
                    f"R{random.randint(1000, 2000)}",
                    f"Player_{random.randint(1, 15)}",
                    random.choice(['BACCARAT', 'SICBO', 'ROULETTE']),
                    random.choice(['BANKER', 'PLAYER', 'BIG', 'SMALL']),
                    random.randint(10, 1000),
                    0,
                    datetime.now().isoformat(),
                    'PENDING',
                    'T1',
                    'Evolution'
                ])
                
if __name__ == '__main__':
    generate_mock_data()
    print("Mock data generated")
"""

for path, content in files.items():
    full_path = os.path.join(base_dir, path)
    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    with open(full_path, 'w', encoding='utf-8') as f:
        f.write(content.strip() + '\\n')

print("All files created successfully!")
