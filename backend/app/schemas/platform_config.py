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
