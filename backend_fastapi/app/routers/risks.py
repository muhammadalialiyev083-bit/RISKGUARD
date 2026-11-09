"""FR-06: Risk register endpoints."""

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user, get_client_ip
from app.models.user import User
from app.models.risk import Risk, Control
from app.models.process import BusinessProcess
from app.schemas.risk import RiskCreate, RiskOut, ControlOut
from app.schemas.common import PageResponse
from app.utils.audit import create_audit_log

router = APIRouter()


def _risk_to_out(r: Risk) -> RiskOut:
    return RiskOut(
        id=r.id,
        process_name=r.process.name if r.process else "",
        asset_name=r.asset.name if r.asset else None,
        threat=r.threat,
        likelihood=r.likelihood,
        impact=r.impact,
        likelihood_residual=r.likelihood_residual,
        impact_residual=r.impact_residual,
        risk_score=r.risk_score,
        residual_risk_score=r.residual_risk_score,
        risk_reduction=r.risk_reduction,
        risk_class=r.get_risk_class(),
        status=r.status,
    )


@router.get("/risks/", response_model=PageResponse[RiskOut])
def list_risks(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    risks = (
        db.query(Risk)
        .filter(Risk.organization_id == current_user.organization_id, Risk.is_deleted == False)
        .order_by(Risk.id.desc())
        .all()
    )
    results = [_risk_to_out(r) for r in risks]
    return PageResponse(count=len(results), results=results)


@router.post("/risks/", response_model=RiskOut, status_code=status.HTTP_201_CREATED)
def create_risk(
    data: RiskCreate, request: Request,
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user),
):
    for field_name, val in [("likelihood", data.likelihood), ("impact", data.impact)]:
        if val < 1 or val > 5:
            raise HTTPException(status_code=400, detail={field_name: "Qiymat 1 dan 5 gacha bo'lishi shart."})
    proc = db.query(BusinessProcess).filter(
        BusinessProcess.id == data.process,
        BusinessProcess.organization_id == current_user.organization_id,
    ).first()
    if not proc:
        raise HTTPException(status_code=404, detail="Jarayon topilmadi.")
    risk = Risk(
        organization_id=current_user.organization_id,
        process_id=data.process,
        asset_id=data.asset,
        threat=data.threat,
        vulnerability=data.vulnerability,
        likelihood=data.likelihood,
        impact=data.impact,
        likelihood_residual=data.likelihood_residual,
        impact_residual=data.impact_residual,
        owner_id=current_user.id,
    )
    db.add(risk)
    db.flush()
    create_audit_log(db, actor=current_user, action="CREATE", entity="Risk", entity_id=str(risk.id), ip_address=get_client_ip(request))
    db.commit()
    db.refresh(risk)
    return _risk_to_out(risk)


@router.get("/controls/", response_model=PageResponse[ControlOut])
def list_controls(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    controls = (
        db.query(Control)
        .join(Risk)
        .filter(Risk.organization_id == current_user.organization_id)
        .all()
    )
    results = [
        ControlOut(id=c.id, risk_id=c.risk_id, title=c.title, description=c.description, status=c.status, effectiveness_evidence=c.effectiveness_evidence)
        for c in controls
    ]
    return PageResponse(count=len(results), results=results)
