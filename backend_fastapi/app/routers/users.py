"""User listing endpoint."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.organization import UserOut
from app.schemas.common import PageResponse

router = APIRouter()


@router.get("/users/", response_model=PageResponse[UserOut])
def list_users(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    users = db.query(User).filter(User.organization_id == current_user.organization_id).order_by(User.username).all()
    results = [
        UserOut(
            id=u.id,
            username=u.username,
            email=u.email,
            first_name=u.first_name,
            last_name=u.last_name,
            role=u.role,
            role_display=u.role_display,
            organization=u.organization_id,
        )
        for u in users
    ]
    return PageResponse(count=len(results), results=results)
