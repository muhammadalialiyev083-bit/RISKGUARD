"""BIA schemas."""

from typing import Optional
from pydantic import BaseModel


class BIACreate(BaseModel):
    process: int
    mtpd_hours: float
    rto_hours: float
    rpo_minutes: int = 60
    backup_interval_minutes: int = 60
    comments: str = ""


class BIAOut(BaseModel):
    id: int
    process: int
    process_name: str
    revision: int
    mtpd_hours: str
    rto_hours: str
    rpo_minutes: int
    backup_interval_minutes: int
    has_rpo_gap: bool
    status: str
    approved_by_name: Optional[str] = None

    model_config = {"from_attributes": True}
