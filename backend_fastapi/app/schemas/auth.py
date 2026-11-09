"""Auth request/response schemas."""

from typing import Optional
from pydantic import BaseModel


class LoginRequest(BaseModel):
    username: str
    password: str


class OrganizationDetail(BaseModel):
    id: int
    name: str
    sector: str
    timezone: str
    max_acceptable_loss: str

    model_config = {"from_attributes": True}


class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    first_name: str
    last_name: str
    role: str
    role_display: str
    organization: Optional[int] = None
    organization_detail: Optional[OrganizationDetail] = None

    model_config = {"from_attributes": True}


class LoginResponse(BaseModel):
    message: str
    user: UserResponse


class MessageResponse(BaseModel):
    message: str
