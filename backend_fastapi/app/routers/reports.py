"""FR-11: Organization dashboard report.

NOTE: This endpoint has NO trailing slash.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.report import DashboardResponse

router = APIRouter()


@router.get("/organization", response_model=DashboardResponse)
def organization_dashboard(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user),
):
    from app.services.reports import build_dashboard
    return build_dashboard(db, current_user)


@router.get("/organization/export_excel")
def export_organization_excel(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user),
):
    from fastapi.responses import StreamingResponse
    import io
    from app.services.export import generate_organization_report_excel
    from app.utils.audit import create_audit_log

    excel_bytes = generate_organization_report_excel(db, current_user.organization_id)
    create_audit_log(
        db, actor=current_user, action="EXPORT", entity="OrganizationReport",
        entity_id=str(current_user.organization_id),
    )
    db.commit()
    return StreamingResponse(
        io.BytesIO(excel_bytes),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": 'attachment; filename="BCMS_Organization_Report.xlsx"'},
    )

