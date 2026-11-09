"""Engine / analysis schemas."""

from typing import Optional, List, Dict, Any
from pydantic import BaseModel


class EvaluateRiskRequest(BaseModel):
    process_id: int
    likelihood: int
    impact: int
    rto_hours: float
    rpo_minutes: int
    backup_interval_minutes: int


class EvaluateRiskResponse(BaseModel):
    risk_score: int
    risk_class: str
    rpo_gap: bool
    observations: List[str]


class EvaluateStrategyRequest(BaseModel):
    process_id: int
    strategy_id: Optional[int] = None


class PriorityOperands(BaseModel):
    impact_norm: float
    urgency_norm: float
    risk_norm: float
    dependency_norm: float


class RankedProcess(BaseModel):
    process_id: int
    process_name: str
    priority_score: float
    operands: PriorityOperands


class PriorityResponse(BaseModel):
    ranked_processes: List[RankedProcess]
