"""FR-05: Business Impact Analysis endpoints."""

from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user, get_client_ip
from app.models.user import User
from app.models.bia import BIAAssessment
from app.models.process import BusinessProcess
from app.schemas.bia import BIACreate, BIAOut
from app.schemas.common import PageResponse
from app.utils.audit import create_audit_log

router = APIRouter()


def _bia_to_out(b: BIAAssessment) -> BIAOut:
    return BIAOut(
        id=b.id,
        process=b.process_id,
        process_name=b.process.name if b.process else "",
        revision=b.revision,
        mtpd_hours=str(b.mtpd_hours),
        rto_hours=str(b.rto_hours),
        rpo_minutes=b.rpo_minutes,
        backup_interval_minutes=b.backup_interval_minutes,
        has_rpo_gap=b.has_rpo_gap,
        status=b.status,
        approved_by_name=f"{b.approved_by.first_name} {b.approved_by.last_name}".strip() if b.approved_by else None,
    )


@router.get("/bia/", response_model=PageResponse[BIAOut])
def list_bia(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    bias = (
        db.query(BIAAssessment)
        .filter(BIAAssessment.organization_id == current_user.organization_id, BIAAssessment.is_deleted == False)
        .order_by(BIAAssessment.id.desc())
        .all()
    )
    results = [_bia_to_out(b) for b in bias]
    return PageResponse(count=len(results), results=results)


@router.post("/bia/", response_model=BIAOut, status_code=status.HTTP_201_CREATED)
def create_bia(
    data: BIACreate, request: Request,
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user),
):
    # Validate RTO <= MTPD
    if data.rto_hours > data.mtpd_hours:
        raise HTTPException(
            status_code=400,
            detail={"rto_hours": f"RTO ({data.rto_hours} soat) MTPD dan ({data.mtpd_hours} soat) katta bo'lishi mumkin emas. (RTO <= MTPD talabi buzildi)."}
        )
    proc = db.query(BusinessProcess).filter(
        BusinessProcess.id == data.process,
        BusinessProcess.organization_id == current_user.organization_id,
    ).first()
    if not proc:
        raise HTTPException(status_code=404, detail="Jarayon topilmadi.")
    bia = BIAAssessment(
        organization_id=current_user.organization_id,
        process_id=data.process,
        mtpd_hours=data.mtpd_hours,
        rto_hours=data.rto_hours,
        rpo_minutes=data.rpo_minutes,
        backup_interval_minutes=data.backup_interval_minutes,
        comments=data.comments,
    )
    db.add(bia)
    db.flush()
    create_audit_log(db, actor=current_user, action="CREATE", entity="BIAAssessment", entity_id=str(bia.id), ip_address=get_client_ip(request))
    db.commit()
    db.refresh(bia)
    return _bia_to_out(bia)


@router.post("/bia/{bia_id}/approve/")
def approve_bia(
    bia_id: int, request: Request,
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user),
):
    if not current_user.is_approver:
        raise HTTPException(status_code=403, detail="Tasdiqlash uchun ADMIN yoki APPROVER roli kerak.")
    bia = db.query(BIAAssessment).filter(
        BIAAssessment.id == bia_id,
        BIAAssessment.organization_id == current_user.organization_id,
    ).first()
    if not bia:
        raise HTTPException(status_code=404, detail="BIA topilmadi.")
    bia.status = "APPROVED"
    bia.approved_by_id = current_user.id
    bia.approved_at = datetime.utcnow()
    create_audit_log(db, actor=current_user, action="APPROVE", entity="BIAAssessment", entity_id=str(bia.id), ip_address=get_client_ip(request))
    db.commit()
    return {"message": "BIA baholashi tasdiqlandi.", "status": "APPROVED"}
