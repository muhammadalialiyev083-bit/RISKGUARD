"""FR-06: Risk register and controls."""

from datetime import datetime
from sqlalchemy import String, Text, Integer, SmallInteger, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, BaseTenantModel


class Risk(BaseTenantModel):
    __tablename__ = "risks"

    process_id: Mapped[int] = mapped_column(ForeignKey("business_processes.id", ondelete="CASCADE"), nullable=False)
    asset_id: Mapped[int | None] = mapped_column(ForeignKey("assets.id", ondelete="SET NULL"), nullable=True)
    threat: Mapped[str] = mapped_column(String(255), nullable=False)
    vulnerability: Mapped[str] = mapped_column(Text, default="")
    likelihood: Mapped[int] = mapped_column(SmallInteger, default=3)
    impact: Mapped[int] = mapped_column(SmallInteger, default=3)
    likelihood_residual: Mapped[int | None] = mapped_column(SmallInteger, nullable=True)
    impact_residual: Mapped[int | None] = mapped_column(SmallInteger, nullable=True)
    owner_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="IDENTIFIED")

    # Relationships
    process: Mapped["BusinessProcess"] = relationship(back_populates="risks")
    asset: Mapped["Asset | None"] = relationship(back_populates="risks")
    owner: Mapped["User | None"] = relationship(foreign_keys=[owner_id])
    controls: Mapped[list["Control"]] = relationship(back_populates="risk", cascade="all, delete-orphan")

    @property
    def risk_score(self) -> int:
        return self.likelihood * self.impact

    @property
    def residual_risk_score(self) -> int | None:
        if self.likelihood_residual is not None and self.impact_residual is not None:
            return self.likelihood_residual * self.impact_residual
        return None

    @property
    def risk_reduction(self) -> int:
        res = self.residual_risk_score
        if res is not None:
            return self.risk_score - res
        return 0

    def get_risk_class(self, low_thresh: int = 6, med_thresh: int = 14) -> str:
        score = self.risk_score
        if score <= low_thresh:
            return "low"
        elif score <= med_thresh:
            return "medium"
        return "high"


class Control(Base):
    __tablename__ = "controls"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    risk_id: Mapped[int] = mapped_column(ForeignKey("risks.id", ondelete="CASCADE"), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String(20), default="PLANNED")
    effectiveness_evidence: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    risk: Mapped["Risk"] = relationship(back_populates="controls")
