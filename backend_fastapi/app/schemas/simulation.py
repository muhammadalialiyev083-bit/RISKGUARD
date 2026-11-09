"""Simulation schemas."""

from typing import Optional, List
from pydantic import BaseModel


class ScenarioOut(BaseModel):
    id: int
    title: str
    description: str
    disrupted_asset_ids: list
    estimated_outage_hours: str

    model_config = {"from_attributes": True}


class ExerciseOut(BaseModel):
    id: int
    plan_id: int
    scenario_id: Optional[int] = None
    exercise_date: str
    actual_recovery_hours: str
    outcome: str
    findings: str

    model_config = {"from_attributes": True}


class AffectedProcess(BaseModel):
    process_id: int
    process_name: str
    service_name: str
    target_rto_hours: float
    rto_breached: bool
    has_published_plan: bool


class SimulationResult(BaseModel):
    scenario_id: int
    estimated_outage_hours: float
    affected_processes_count: int
    rto_breaches_count: int
    missing_plans_count: int
    affected_processes: List[AffectedProcess]
