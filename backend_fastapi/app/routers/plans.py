"""FR-08, FR-09: Strategies and Continuity Plans."""

import io
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user, get_client_ip
from app.models.user import User
from app.models.plan import Strategy, ContinuityPlan, PlanStep
from app.schemas.plan import StrategyOut, PlanOut, PlanStepOut
from app.schemas.common import PageResponse
from app.utils.audit import create_audit_log

router = APIRouter()

STATUS_DISPLAY = {
    "DRAFT": "Qoralama", "IN_REVIEW": "Ko'rib chiqilmoqda",
    "APPROVED": "Tasdiqlangan", "PUBLISHED": "E'lon qilingan", "ARCHIVED": "Arxivlangan",
}


def _plan_to_out(p: ContinuityPlan) -> PlanOut:
    steps = []
    for s in (p.steps or []):
        steps.append(PlanStepOut(
            id=s.id, sequence=s.sequence, title=s.title,
            description=s.description,
            assigned_name=f"{s.assigned_to.first_name} {s.assigned_to.last_name}".strip() if s.assigned_to else None,
            expected_duration_minutes=s.expected_duration_minutes,
        ))
    return PlanOut(
        id=p.id,
        process_name=p.process.name if p.process else "",
        title=p.title,
        version=p.version,
        status=p.status,
        status_display=STATUS_DISPLAY.get(p.status, p.status),
        approved_by_name=f"{p.approved_by.first_name} {p.approved_by.last_name}".strip() if p.approved_by else None,
        steps=steps,
    )


@router.get("/strategies/", response_model=PageResponse[StrategyOut])
def list_strategies(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    strats = db.query(Strategy).filter(Strategy.organization_id == current_user.organization_id, Strategy.is_deleted == False).all()
    results = [
        StrategyOut(
            id=s.id, process_id=s.process_id, name=s.name, description=s.description,
            estimated_rto_hours=str(s.estimated_rto_hours), estimated_rpo_minutes=s.estimated_rpo_minutes,
            estimated_cost=str(s.estimated_cost), is_selected=s.is_selected,
        )
        for s in strats
    ]
    return PageResponse(count=len(results), results=results)


@router.get("/plans/", response_model=PageResponse[PlanOut])
def list_plans(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    plans = (
        db.query(ContinuityPlan)
        .filter(ContinuityPlan.organization_id == current_user.organization_id, ContinuityPlan.is_deleted == False)
        .order_by(ContinuityPlan.id.desc())
        .all()
    )
    results = [_plan_to_out(p) for p in plans]
    return PageResponse(count=len(results), results=results)


@router.post("/plans/{plan_id}/publish/")
def publish_plan(
    plan_id: int, request: Request,
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user),
):
    if not current_user.is_approver:
        raise HTTPException(status_code=403, detail="E'lon qilish uchun ADMIN yoki APPROVER roli kerak.")
    plan = db.query(ContinuityPlan).filter(
        ContinuityPlan.id == plan_id,
        ContinuityPlan.organization_id == current_user.organization_id,
    ).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Reja topilmadi.")
    plan.status = "PUBLISHED"
    plan.approved_by_id = current_user.id
    plan.approved_at = datetime.utcnow()
    create_audit_log(db, actor=current_user, action="APPROVE", entity="ContinuityPlan", entity_id=str(plan.id), ip_address=get_client_ip(request))
    db.commit()
    return {"message": "Reja rasmiy e'lon qilindi.", "status": "PUBLISHED"}


@router.get("/plans/{plan_id}/export_pdf/")
def export_plan_pdf(
    plan_id: int,
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user),
):
    plan = db.query(ContinuityPlan).filter(
        ContinuityPlan.id == plan_id,
        ContinuityPlan.organization_id == current_user.organization_id,
    ).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Reja topilmadi.")
    from app.services.export import generate_plan_pdf
    pdf_bytes = generate_plan_pdf(plan)
    create_audit_log(db, actor=current_user, action="EXPORT", entity="ContinuityPlan", entity_id=str(plan.id))
    db.commit()
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="BCP_{plan.id}_{plan.version}.pdf"'},
    )


@router.get("/plans/{plan_id}/export_excel/")
def export_plan_excel(
    plan_id: int,
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user),
):
    plan = db.query(ContinuityPlan).filter(
        ContinuityPlan.id == plan_id,
        ContinuityPlan.organization_id == current_user.organization_id,
    ).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Reja topilmadi.")
    from app.services.export import generate_plan_excel
    excel_bytes = generate_plan_excel(plan)
    create_audit_log(db, actor=current_user, action="EXPORT", entity="ContinuityPlan", entity_id=str(plan.id))
    db.commit()
    return StreamingResponse(
        io.BytesIO(excel_bytes),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="BCP_{plan.id}_{plan.version}.xlsx"'},
    )

