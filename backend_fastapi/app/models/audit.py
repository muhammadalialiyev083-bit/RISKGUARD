"""FR-12: Immutable audit log."""

import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, ForeignKey, Index, func, JSON, Uuid
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"
    __table_args__ = (
        Index("ix_audit_org_ts", "organization_id", "timestamp"),
        Index("ix_audit_entity", "entity", "entity_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id: Mapped[int | None] = mapped_column(ForeignKey("organizations.id", ondelete="SET NULL"), nullable=True)
    actor_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    action: Mapped[str] = mapped_column(String(20), nullable=False)
    entity: Mapped[str] = mapped_column(String(100), nullable=False)
    entity_id: Mapped[str] = mapped_column(String(100), default="")
    before_state: Mapped[dict] = mapped_column(JSON().with_variant(JSONB, "postgresql"), default=dict)
    after_state: Mapped[dict] = mapped_column(JSON().with_variant(JSONB, "postgresql"), default=dict)
    timestamp: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), index=True)
    ip_address: Mapped[str | None] = mapped_column(String(45), nullable=True)

    organization: Mapped["Organization | None"] = relationship(back_populates="audit_logs")
    actor: Mapped["User | None"] = relationship(foreign_keys=[actor_id])
