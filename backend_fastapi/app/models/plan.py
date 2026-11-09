"""FR-08, FR-09: Strategies and continuity plans."""

from datetime import datetime
from decimal import Decimal
from sqlalchemy import String, Text, Integer, SmallInteger, Numeric, DateTime, Boolean, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, BaseTenantModel


class Strategy(BaseTenantModel):
    __tablename__ = "strategies"

    process_id: Mapped[int] = mapped_column(ForeignKey("business_processes.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, default="")
    estimated_rto_hours: Mapped[Decimal] = mapped_column(Numeric(6, 2), nullable=False)
    estimated_rpo_minutes: Mapped[int] = mapped_column(Integer, nullable=False)
    estimated_cost: Mapped[Decimal] = mapped_column(Numeric(18, 2), default=0)
    is_selected: Mapped[bool] = mapped_column(Boolean, default=False)

    process: Mapped["BusinessProcess"] = relationship(back_populates="strategies")


class ContinuityPlan(BaseTenantModel):
    __tablename__ = "continuity_plans"

    process_id: Mapped[int] = mapped_column(ForeignKey("business_processes.id", ondelete="CASCADE"), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    version: Mapped[str] = mapped_column(String(20), default="1.0")
    scope: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String(20), default="DRAFT")
    approved_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    approved_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    process: Mapped["BusinessProcess"] = relationship(back_populates="continuity_plans")
    approved_by: Mapped["User | None"] = relationship(foreign_keys=[approved_by_id])
    steps: Mapped[list["PlanStep"]] = relationship(back_populates="plan", cascade="all, delete-orphan", order_by="PlanStep.sequence")
    exercises: Mapped[list["Exercise"]] = relationship(back_populates="plan")


class PlanStep(Base):
    __tablename__ = "plan_steps"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    plan_id: Mapped[int] = mapped_column(ForeignKey("continuity_plans.id", ondelete="CASCADE"), nullable=False)
    sequence: Mapped[int] = mapped_column(SmallInteger, default=1)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, default="")
    assigned_to_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    expected_duration_minutes: Mapped[int] = mapped_column(Integer, default=30)

    plan: Mapped["ContinuityPlan"] = relationship(back_populates="steps")
    assigned_to: Mapped["User | None"] = relationship(foreign_keys=[assigned_to_id])
