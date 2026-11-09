"""Authentication endpoints — login, logout, me.

Frontend calls these WITHOUT trailing slash:
  POST /api/v1/auth/login
  POST /api/v1/auth/logout
  GET  /api/v1/auth/me
"""

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user, get_client_ip
from app.models.user import User
from app.schemas.auth import LoginRequest, LoginResponse, UserResponse, OrganizationDetail, MessageResponse
from app.utils.security import verify_password
from app.utils.audit import create_audit_log

router = APIRouter()


def _build_user_response(user: User) -> UserResponse:
    org_detail = None
    if user.organization:
        org_detail = OrganizationDetail(
            id=user.organization.id,
            name=user.organization.name,
            sector=user.organization.sector,
            timezone=user.organization.timezone,
            max_acceptable_loss=str(user.organization.max_acceptable_loss),
        )
    return UserResponse(
        id=user.id,
        username=user.username,
        email=user.email,
        first_name=user.first_name,
        last_name=user.last_name,
        role=user.role,
        role_display=user.role_display,
        organization=user.organization_id,
        organization_detail=org_detail,
    )


@router.post("/login", response_model=LoginResponse)
def login(data: LoginRequest, request: Request, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == data.username).first()
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Noto'g'ri foydalanuvchi nomi yoki parol.",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Hisob nofaol holatda.",
        )
    # Set session
    request.session["user_id"] = user.id
    # Audit log
    create_audit_log(
        db, actor=user, action="LOGIN", entity="User",
        entity_id=str(user.id), ip_address=get_client_ip(request),
    )
    db.commit()
    return LoginResponse(message="Muvaffaqiyatli kirish.", user=_build_user_response(user))


@router.post("/logout", response_model=MessageResponse)
def logout(request: Request, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    create_audit_log(
        db, actor=current_user, action="LOGOUT", entity="User",
        entity_id=str(current_user.id), ip_address=get_client_ip(request),
    )
    db.commit()
    request.session.clear()
    return MessageResponse(message="Tizimdan chiqildi.")


@router.get("/me", response_model=UserResponse)
def me(current_user: User = Depends(get_current_user)):
    return _build_user_response(current_user)
