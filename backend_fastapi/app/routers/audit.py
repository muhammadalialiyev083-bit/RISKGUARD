"""FR-12: Immutable audit log — read-only."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.audit import AuditLog
from app.schemas.audit import AuditLogOut
from app.schemas.common import PageResponse

router = APIRouter()


@router.get("/audit-logs/", response_model=PageResponse[AuditLogOut])
def list_audit_logs(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    logs = (
        db.query(AuditLog)
        .filter(AuditLog.organization_id == current_user.organization_id)
        .order_by(AuditLog.timestamp.desc())
        .limit(200)
        .all()
    )
    results = [
        AuditLogOut(
            id=str(log.id),
            actor_username=log.actor.username if log.actor else None,
            actor_role=log.actor.role if log.actor else None,
            action=log.action,
            entity=log.entity,
            entity_id=log.entity_id,
            timestamp=log.timestamp.isoformat() if log.timestamp else "",
            ip_address=log.ip_address,
        )
        for log in logs
    ]
    return PageResponse(count=len(results), results=results)
