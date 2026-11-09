"""Audit log schema."""

from typing import Optional
from pydantic import BaseModel


class AuditLogOut(BaseModel):
    id: str
    actor_username: Optional[str] = None
    actor_role: Optional[str] = None
    action: str
    entity: str
    entity_id: str
    timestamp: str
    ip_address: Optional[str] = None

    model_config = {"from_attributes": True}
