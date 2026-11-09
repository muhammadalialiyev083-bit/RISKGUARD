"""FR-11: Dashboard aggregation service."""

from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.user import User
from app.models.process import BusinessProcess, Asset
from app.models.bia import BIAAssessment
from app.models.risk import Risk
from app.models.plan import ContinuityPlan
from app.models.simulation import Exercise
from app.schemas.report import DashboardResponse, DashboardSummary


def build_dashboard(db: Session, user: User) -> DashboardResponse:
    org_id = user.organization_id
    org_name = user.organization.name if user.organization else "N/A"

    total_processes = db.query(BusinessProcess).filter(
        BusinessProcess.organization_id == org_id, BusinessProcess.is_deleted == False
    ).count()

    critical_processes = db.query(BusinessProcess).filter(
        BusinessProcess.organization_id == org_id,
        BusinessProcess.is_deleted == False,
        BusinessProcess.criticality == "CRITICAL",
    ).count()

    total_assets = db.query(Asset).filter(
        Asset.organization_id == org_id, Asset.is_deleted == False
    ).count()

    all_risks = db.query(Risk).filter(
        Risk.organization_id == org_id, Risk.is_deleted == False
    ).all()
    total_risks = len(all_risks)
    high_risks_count = sum(1 for r in all_risks if r.risk_score >= 15)

    # Processes without published plans
    proc_ids_with_plans = {
        pid for (pid,) in db.query(ContinuityPlan.process_id).filter(
            ContinuityPlan.organization_id == org_id,
            ContinuityPlan.status == "PUBLISHED",
            ContinuityPlan.is_deleted == False,
        ).distinct().all()
    }
    all_proc_ids = {
        pid for (pid,) in db.query(BusinessProcess.id).filter(
            BusinessProcess.organization_id == org_id,
            BusinessProcess.is_deleted == False,
        ).all()
    }
    unplanned_processes_count = len(all_proc_ids - proc_ids_with_plans)

    # RPO gaps
    bias = db.query(BIAAssessment).filter(
        BIAAssessment.organization_id == org_id, BIAAssessment.is_deleted == False
    ).all()
    rpo_gap_count = sum(1 for b in bias if b.has_rpo_gap)

    approved_bias_count = sum(1 for b in bias if b.status == "APPROVED")

    published_plans_count = db.query(ContinuityPlan).filter(
        ContinuityPlan.organization_id == org_id,
        ContinuityPlan.status == "PUBLISHED",
        ContinuityPlan.is_deleted == False,
    ).count()

    completed_exercises_count = db.query(Exercise).filter(
        Exercise.organization_id == org_id, Exercise.is_deleted == False
    ).count()

    return DashboardResponse(
        organization=org_name,
        summary=DashboardSummary(
            total_processes=total_processes,
            critical_processes=critical_processes,
            total_assets=total_assets,
            total_risks=total_risks,
            high_risks_count=high_risks_count,
            unplanned_processes_count=unplanned_processes_count,
            rpo_gap_count=rpo_gap_count,
            approved_bias_count=approved_bias_count,
            published_plans_count=published_plans_count,
            completed_exercises_count=completed_exercises_count,
        ),
    )
