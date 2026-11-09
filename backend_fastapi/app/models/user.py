"""FR-01: User model with RBAC roles."""

from datetime import datetime
from sqlalchemy import String, Integer, Boolean, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class User(Base):
    __tablename__ = "users"

    ROLE_ADMIN = "ADMIN"
    ROLE_BCMS_MANAGER = "BCMS_MANAGER"
    ROLE_PROCESS_OWNER = "PROCESS_OWNER"
    ROLE_RISK_ANALYST = "RISK_ANALYST"
    ROLE_APPROVER = "APPROVER"
    ROLE_AUDITOR = "AUDITOR"

    ROLE_DISPLAY = {
        "ADMIN": "Administrator",
        "BCMS_MANAGER": "BCMS menejeri",
        "PROCESS_OWNER": "Jarayon egasi",
        "RISK_ANALYST": "Risk tahlilchisi",
        "APPROVER": "Rahbariyat / Tasdiqlovchi",
        "AUDITOR": "Auditor / Kuzatuvchi",
    }

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    username: Mapped[str] = mapped_column(String(150), unique=True, nullable=False)
    email: Mapped[str] = mapped_column(String(254), default="")
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    first_name: Mapped[str] = mapped_column(String(150), default="")
    last_name: Mapped[str] = mapped_column(String(150), default="")
    role: Mapped[str] = mapped_column(String(20), default="PROCESS_OWNER")
    organization_id: Mapped[int | None] = mapped_column(ForeignKey("organizations.id", ondelete="CASCADE"), nullable=True)
    department_id: Mapped[int | None] = mapped_column(ForeignKey("departments.id", ondelete="SET NULL"), nullable=True)
    phone: Mapped[str] = mapped_column(String(30), default="")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_superuser: Mapped[bool] = mapped_column(Boolean, default=False)
    date_joined: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    last_login: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    organization: Mapped["Organization | None"] = relationship(back_populates="users")
    department: Mapped["Department | None"] = relationship(back_populates="users")

    @property
    def role_display(self) -> str:
        return self.ROLE_DISPLAY.get(self.role, self.role)

    @property
    def is_org_admin(self) -> bool:
        return self.role == self.ROLE_ADMIN or self.is_superuser

    @property
    def is_bcms_manager(self) -> bool:
        return self.role in (self.ROLE_ADMIN, self.ROLE_BCMS_MANAGER) or self.is_superuser

    @property
    def is_approver(self) -> bool:
        return self.role in (self.ROLE_ADMIN, self.ROLE_APPROVER) or self.is_superuser

    @property
    def is_auditor(self) -> bool:
        return self.role == self.ROLE_AUDITOR

    def __repr__(self) -> str:
        return f"<User(id={self.id}, username='{self.username}', role='{self.role}')>"
