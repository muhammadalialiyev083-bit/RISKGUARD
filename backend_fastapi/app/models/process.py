"""FR-03, FR-04: Business processes, assets, dependencies."""

from sqlalchemy import String, Text, Integer, SmallInteger, ForeignKey, UniqueConstraint, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseTenantModel


class BusinessProcess(BaseTenantModel):
    __tablename__ = "business_processes"
    __table_args__ = (UniqueConstraint("organization_id", "name"),)

    CRITICALITY_CHOICES = ["CRITICAL", "HIGH", "MEDIUM", "LOW"]
    CRITICALITY_DISPLAY = {
        "CRITICAL": "Kritik (Juda yuqori)",
        "HIGH": "Yuqori",
        "MEDIUM": "O'rta",
        "LOW": "Past",
    }
    STATUS_CHOICES = ["ACTIVE", "UNDER_REVIEW", "INACTIVE"]

    service_id: Mapped[int] = mapped_column(ForeignKey("services.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, default="")
    owner_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    criticality: Mapped[str] = mapped_column(String(20), default="HIGH")
    status: Mapped[str] = mapped_column(String(20), default="ACTIVE")

    # Relationships
    service: Mapped["Service"] = relationship(back_populates="processes")
    owner: Mapped["User | None"] = relationship(foreign_keys=[owner_id])
    organization: Mapped["Organization"] = relationship(foreign_keys="[BusinessProcess.organization_id]")
    bia_assessments: Mapped[list["BIAAssessment"]] = relationship(back_populates="process")
    risks: Mapped[list["Risk"]] = relationship(back_populates="process")
    strategies: Mapped[list["Strategy"]] = relationship(back_populates="process")
    continuity_plans: Mapped[list["ContinuityPlan"]] = relationship(back_populates="process")

    @property
    def criticality_display(self) -> str:
        return self.CRITICALITY_DISPLAY.get(self.criticality, self.criticality)


class Asset(BaseTenantModel):
    __tablename__ = "assets"
    __table_args__ = (UniqueConstraint("organization_id", "name"),)

    TYPE_CHOICES = ["SYSTEM", "SERVER", "PERSONNEL", "VENDOR", "FACILITY"]
    TYPE_DISPLAY = {
        "SYSTEM": "Dasturiy tizim",
        "SERVER": "Server / Apparat",
        "PERSONNEL": "Xodim / Mutaxassis",
        "VENDOR": "Uchinchi tomon / Provayder",
        "FACILITY": "Infratuzilma / Bino",
    }

    name: Mapped[str] = mapped_column(String(200), nullable=False)
    type: Mapped[str] = mapped_column(String(20), nullable=False)
    description: Mapped[str] = mapped_column(Text, default="")
    owner_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    owner: Mapped["User | None"] = relationship(foreign_keys=[owner_id])
    risks: Mapped[list["Risk"]] = relationship(back_populates="asset")

    @property
    def type_display(self) -> str:
        return self.TYPE_DISPLAY.get(self.type, self.type)


class Dependency(BaseTenantModel):
    __tablename__ = "dependencies"
    __table_args__ = (
        Index("ix_dep_from", "organization_id", "from_type", "from_id"),
        Index("ix_dep_to", "organization_id", "to_type", "to_id"),
    )

    from_type: Mapped[str] = mapped_column(String(20), nullable=False)  # PROCESS or ASSET
    from_id: Mapped[int] = mapped_column(Integer, nullable=False)
    to_type: Mapped[str] = mapped_column(String(20), nullable=False)
    to_id: Mapped[int] = mapped_column(Integer, nullable=False)
    dependency_criticality: Mapped[str] = mapped_column(String(20), default="MANDATORY")
    notes: Mapped[str] = mapped_column(Text, default="")
