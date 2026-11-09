"""FR-05: Business Impact Analysis models."""

from datetime import datetime
from decimal import Decimal
from sqlalchemy import String, Text, Integer, SmallInteger, Numeric, DateTime, ForeignKey, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship, validates

from app.models.base import Base, BaseTenantModel


class BIAAssessment(BaseTenantModel):
    __tablename__ = "bia_assessments"

    process_id: Mapped[int] = mapped_column(ForeignKey("business_processes.id", ondelete="CASCADE"), nullable=False)
    revision: Mapped[int] = mapped_column(Integer, default=1)
    mtpd_hours: Mapped[Decimal] = mapped_column(Numeric(6, 2), nullable=False)
    rto_hours: Mapped[Decimal] = mapped_column(Numeric(6, 2), nullable=False)
    rpo_minutes: Mapped[int] = mapped_column(Integer, default=60)
    backup_interval_minutes: Mapped[int] = mapped_column(Integer, default=60)
    status: Mapped[str] = mapped_column(String(20), default="DRAFT")
    approved_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    approved_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    comments: Mapped[str] = mapped_column(Text, default="")

    # Relationships
    process: Mapped["BusinessProcess"] = relationship(back_populates="bia_assessments")
    approved_by: Mapped["User | None"] = relationship(foreign_keys=[approved_by_id])
    impacts: Mapped[list["BIAImpact"]] = relationship(back_populates="bia", cascade="all, delete-orphan")

    @property
    def has_rpo_gap(self) -> bool:
        return self.backup_interval_minutes > self.rpo_minutes


class BIAImpact(Base):
    __tablename__ = "bia_impacts"
    __table_args__ = (UniqueConstraint("bia_id", "horizon_hours"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    bia_id: Mapped[int] = mapped_column(ForeignKey("bia_assessments.id", ondelete="CASCADE"), nullable=False)
    horizon_hours: Mapped[Decimal] = mapped_column(Numeric(6, 2), nullable=False)
    financial_loss: Mapped[Decimal] = mapped_column(Numeric(18, 2), default=0)
    operational_score: Mapped[int] = mapped_column(SmallInteger, default=1)
    legal_score: Mapped[int] = mapped_column(SmallInteger, default=1)
    reputational_score: Mapped[int] = mapped_column(SmallInteger, default=1)

    bia: Mapped["BIAAssessment"] = relationship(back_populates="impacts")
