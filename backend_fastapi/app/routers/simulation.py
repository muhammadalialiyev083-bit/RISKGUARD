"""FR-10: Scenario simulation endpoints."""

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user, get_client_ip
from app.models.user import User
from app.models.simulation import Scenario, Exercise
from app.schemas.simulation import ScenarioOut, ExerciseOut, SimulationResult
from app.schemas.common import PageResponse
from app.utils.audit import create_audit_log

router = APIRouter()


@router.get("/scenarios/", response_model=PageResponse[ScenarioOut])
def list_scenarios(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    scenarios = (
        db.query(Scenario)
        .filter(Scenario.organization_id == current_user.organization_id, Scenario.is_deleted == False)
        .order_by(Scenario.title)
        .all()
    )
    results = [
        ScenarioOut(
            id=s.id, title=s.title, description=s.description,
            disrupted_asset_ids=s.disrupted_asset_ids or [],
            estimated_outage_hours=str(s.estimated_outage_hours),
        )
        for s in scenarios
    ]
    return PageResponse(count=len(results), results=results)


@router.post("/scenarios/{scenario_id}/simulate/", response_model=SimulationResult)
def run_simulation(
    scenario_id: int, request: Request,
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user),
):
    scenario = db.query(Scenario).filter(
        Scenario.id == scenario_id,
        Scenario.organization_id == current_user.organization_id,
    ).first()
    if not scenario:
        raise HTTPException(status_code=404, detail="Ssenariy topilmadi.")
    from app.services.simulation import run_cascade_simulation
    result = run_cascade_simulation(db, scenario, current_user.organization_id)
    create_audit_log(
        db, actor=current_user, action="SIMULATE", entity="Scenario",
        entity_id=str(scenario.id), ip_address=get_client_ip(request),
    )
    db.commit()
    return result


@router.get("/exercises/", response_model=PageResponse[ExerciseOut])
def list_exercises(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    exercises = (
        db.query(Exercise)
        .filter(Exercise.organization_id == current_user.organization_id, Exercise.is_deleted == False)
        .order_by(Exercise.exercise_date.desc())
        .all()
    )
    results = [
        ExerciseOut(
            id=e.id, plan_id=e.plan_id, scenario_id=e.scenario_id,
            exercise_date=str(e.exercise_date), actual_recovery_hours=str(e.actual_recovery_hours),
            outcome=e.outcome, findings=e.findings,
        )
        for e in exercises
    ]
    return PageResponse(count=len(results), results=results)
