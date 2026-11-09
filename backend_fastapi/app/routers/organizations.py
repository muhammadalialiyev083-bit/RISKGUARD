"""Organization, Department, Service endpoints."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.organization import Organization, Department, Service
from app.schemas.organization import OrganizationOut, DepartmentOut, ServiceOut
from app.schemas.common import PageResponse

router = APIRouter()


@router.get("/organizations/", response_model=PageResponse[OrganizationOut])
def list_organizations(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    orgs = db.query(Organization).filter(Organization.id == current_user.organization_id).all()
    results = [
        OrganizationOut(
            id=o.id, name=o.name, sector=o.sector, timezone=o.timezone,
            max_acceptable_loss=str(o.max_acceptable_loss),
            risk_low_threshold=o.risk_low_threshold,
            risk_medium_threshold=o.risk_medium_threshold,
        )
        for o in orgs
    ]
    return PageResponse(count=len(results), results=results)


@router.get("/departments/", response_model=PageResponse[DepartmentOut])
def list_departments(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    depts = db.query(Department).filter(Department.organization_id == current_user.organization_id).order_by(Department.name).all()
    results = [
        DepartmentOut(id=d.id, organization=d.organization_id, name=d.name, head_name=d.head_name)
        for d in depts
    ]
    return PageResponse(count=len(results), results=results)


@router.get("/services/", response_model=PageResponse[ServiceOut])
def list_services(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    svcs = db.query(Service).filter(Service.organization_id == current_user.organization_id).order_by(Service.name).all()
    results = [
        ServiceOut(
            id=s.id, organization=s.organization_id, name=s.name,
            description=s.description,
            owner_name=f"{s.owner.first_name} {s.owner.last_name}".strip() if s.owner else None,
        )
        for s in svcs
    ]
    return PageResponse(count=len(results), results=results)
