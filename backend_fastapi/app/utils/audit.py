"""Audit log creation helper."""

from typing import Optional, Any, Dict
from sqlalchemy.orm import Session

from app.models.audit import AuditLog
from app.models.user import User


def create_audit_log(
    db: Session,
    *,
    actor: Optional[User],
    action: str,
    entity: str,
    entity_id: str = "",
    before_state: Optional[Dict[str, Any]] = None,
    after_state: Optional[Dict[str, Any]] = None,
    ip_address: Optional[str] = None,
) -> AuditLog:
    """Create an immutable audit log entry."""
    log = AuditLog(
        organization_id=actor.organization_id if actor else None,
        actor_id=actor.id if actor else None,
        action=action,
        entity=entity,
        entity_id=str(entity_id),
        before_state=before_state or {},
        after_state=after_state or {},
        ip_address=ip_address,
    )
    db.add(log)
    db.flush()
    return log
