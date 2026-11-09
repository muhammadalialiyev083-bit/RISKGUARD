"""Process and Asset schemas."""

from typing import Optional
from pydantic import BaseModel


class ProcessCreate(BaseModel):
    name: str
    criticality: str = "HIGH"
    service: int
    description: str = ""


class ProcessOut(BaseModel):
    id: int
    name: str
    service_name: Optional[str] = None
    owner_name: Optional[str] = None
    criticality: str
    criticality_display: str
    status: str

    model_config = {"from_attributes": True}


class AssetCreate(BaseModel):
    name: str
    type: str
    description: str = ""


class AssetOut(BaseModel):
    id: int
    name: str
    type: str
    type_display: str
    description: str
    owner_name: Optional[str] = None

    model_config = {"from_attributes": True}


class DependencyOut(BaseModel):
    id: int
    from_type: str
    from_id: int
    to_type: str
    to_id: int
    dependency_criticality: str
    notes: str

    model_config = {"from_attributes": True}
