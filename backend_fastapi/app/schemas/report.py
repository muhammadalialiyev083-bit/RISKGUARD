"""Report / dashboard schemas."""

from pydantic import BaseModel


class DashboardSummary(BaseModel):
    total_processes: int
    critical_processes: int
    total_assets: int
    total_risks: int
    high_risks_count: int
    unplanned_processes_count: int
    rpo_gap_count: int
    approved_bias_count: int
    published_plans_count: int
    completed_exercises_count: int


class DashboardResponse(BaseModel):
    organization: str
    summary: DashboardSummary
