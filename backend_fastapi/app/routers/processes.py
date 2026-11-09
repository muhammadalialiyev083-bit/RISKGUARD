"""FR-03, FR-04: Processes, Assets, Dependencies."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user, get_client_ip
from app.models.user import User
from app.models.process import BusinessProcess, Asset, Dependency
from app.models.organization import Service
from app.schemas.process import ProcessCreate, ProcessOut, AssetOut, DependencyOut
from app.schemas.common import PageResponse
from app.utils.audit import create_audit_log
from fastapi import Request

router = APIRouter()


@router.get("/processes/", response_model=PageResponse[ProcessOut])
def list_processes(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    procs = (
        db.query(BusinessProcess)
        .filter(BusinessProcess.organization_id == current_user.organization_id, BusinessProcess.is_deleted == False)
        .order_by(BusinessProcess.name)
        .all()
    )
    results = []
    for p in procs:
        results.append(ProcessOut(
            id=p.id,
            name=p.name,
            service_name=p.service.name if p.service else None,
            owner_name=f"{p.owner.first_name} {p.owner.last_name}".strip() if p.owner else None,
            criticality=p.criticality,
            criticality_display=p.criticality_display,
            status=p.status,
        ))
    return PageResponse(count=len(results), results=results)


@router.post("/processes/", response_model=ProcessOut, status_code=status.HTTP_201_CREATED)
def create_process(
    data: ProcessCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Verify service belongs to the same org
    svc = db.query(Service).filter(Service.id == data.service, Service.organization_id == current_user.organization_id).first()
    if not svc:
        raise HTTPException(status_code=404, detail="Xizmat topilmadi.")
    proc = BusinessProcess(
        organization_id=current_user.organization_id,
        service_id=data.service,
        name=data.name,
        criticality=data.criticality,
        description=data.description,
        owner_id=current_user.id,
    )
    db.add(proc)
    db.flush()
    create_audit_log(db, actor=current_user, action="CREATE", entity="BusinessProcess", entity_id=str(proc.id), ip_address=get_client_ip(request))
    db.commit()
    db.refresh(proc)
    return ProcessOut(
        id=proc.id, name=proc.name,
        service_name=svc.name,
        owner_name=f"{current_user.first_name} {current_user.last_name}".strip(),
        criticality=proc.criticality,
        criticality_display=proc.criticality_display,
        status=proc.status,
    )


@router.get("/assets/", response_model=PageResponse[AssetOut])
def list_assets(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    assets = (
        db.query(Asset)
        .filter(Asset.organization_id == current_user.organization_id, Asset.is_deleted == False)
        .order_by(Asset.name)
        .all()
    )
    results = [
        AssetOut(
            id=a.id, name=a.name, type=a.type, type_display=a.type_display,
            description=a.description,
            owner_name=f"{a.owner.first_name} {a.owner.last_name}".strip() if a.owner else None,
        )
        for a in assets
    ]
    return PageResponse(count=len(results), results=results)


@router.get("/dependencies/", response_model=PageResponse[DependencyOut])
def list_dependencies(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    deps = (
        db.query(Dependency)
        .filter(Dependency.organization_id == current_user.organization_id, Dependency.is_deleted == False)
        .all()
    )
    results = [
        DependencyOut(
            id=d.id, from_type=d.from_type, from_id=d.from_id,
            to_type=d.to_type, to_id=d.to_id,
            dependency_criticality=d.dependency_criticality, notes=d.notes,
        )
        for d in deps
    ]
    return PageResponse(count=len(results), results=results)
