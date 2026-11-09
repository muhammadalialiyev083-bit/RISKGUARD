"""Plan and Strategy schemas."""

from typing import Optional, List
from pydantic import BaseModel


class StrategyOut(BaseModel):
    id: int
    process_id: int
    name: str
    description: str
    estimated_rto_hours: str
    estimated_rpo_minutes: int
    estimated_cost: str
    is_selected: bool

    model_config = {"from_attributes": True}


class PlanStepOut(BaseModel):
    id: int
    sequence: int
    title: str
    description: str
    assigned_name: Optional[str] = None
    expected_duration_minutes: int

    model_config = {"from_attributes": True}


class PlanOut(BaseModel):
    id: int
    process_name: str
    title: str
    version: str
    status: str
    status_display: str
    approved_by_name: Optional[str] = None
    steps: List[PlanStepOut] = []

    model_config = {"from_attributes": True}
