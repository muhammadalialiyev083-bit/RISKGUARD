"""FR-10, FR-13: Scenarios and exercises."""

from datetime import date, datetime
from decimal import Decimal
from sqlalchemy import String, Text, Integer, SmallInteger, Numeric, Date, DateTime, ForeignKey, func, JSON
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseTenantModel


class Scenario(BaseTenantModel):
    __tablename__ = "scenarios"

    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, default="")
    disrupted_asset_ids: Mapped[list] = mapped_column(JSON().with_variant(JSONB, "postgresql"), default=list)
    estimated_outage_hours: Mapped[Decimal] = mapped_column(Numeric(6, 2), default=8.0)

    exercises: Mapped[list["Exercise"]] = relationship(back_populates="scenario")


class Exercise(BaseTenantModel):
    __tablename__ = "exercises"

    plan_id: Mapped[int] = mapped_column(ForeignKey("continuity_plans.id", ondelete="CASCADE"), nullable=False)
    scenario_id: Mapped[int | None] = mapped_column(ForeignKey("scenarios.id", ondelete="SET NULL"), nullable=True)
    exercise_date: Mapped[date] = mapped_column(Date, nullable=False)
    actual_recovery_hours: Mapped[Decimal] = mapped_column(Numeric(6, 2), nullable=False)
    outcome: Mapped[str] = mapped_column(String(20), default="SUCCESS")
    findings: Mapped[str] = mapped_column(Text, default="")

    plan: Mapped["ContinuityPlan"] = relationship(back_populates="exercises")
    scenario: Mapped["Scenario | None"] = relationship(back_populates="exercises")
