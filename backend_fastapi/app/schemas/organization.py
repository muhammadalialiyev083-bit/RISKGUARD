"""Organization, Department, Service schemas."""

from typing import Optional
from pydantic import BaseModel


class OrganizationOut(BaseModel):
    id: int
    name: str
    sector: str
    timezone: str
    max_acceptable_loss: str
    risk_low_threshold: int
    risk_medium_threshold: int

    model_config = {"from_attributes": True}


class DepartmentOut(BaseModel):
    id: int
    organization: int
    name: str
    head_name: str

    model_config = {"from_attributes": True}


class ServiceOut(BaseModel):
    id: int
    organization: int
    name: str
    description: str
    owner_name: Optional[str] = None

    model_config = {"from_attributes": True}


class UserOut(BaseModel):
    id: int
    username: str
    email: str
    first_name: str
    last_name: str
    role: str
    role_display: str
    organization: Optional[int] = None

    model_config = {"from_attributes": True}
