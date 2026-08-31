"""
Admin authentication and account management.

Replaces the old single shared `X-Admin-Key` header with real, per-person
organizer accounts: login issues a signed JWT session token, and
superadmins can create/manage other admin accounts from the dashboard.
"""
import datetime as dt

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..security import (
    create_access_token,
    get_current_admin,
    hash_password,
    require_superadmin,
    verify_password,
)
from ..utils import log_action

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _admin_out(admin: models.AdminUser) -> schemas.AdminUserOut:
    return schemas.AdminUserOut.model_validate(admin)


@router.post("/login", response_model=schemas.TokenResponse)
def login(payload: schemas.LoginRequest, db: Session = Depends(get_db)):
    admin = db.query(models.AdminUser).filter(models.AdminUser.username == payload.username).first()
    if not admin or not verify_password(payload.password, admin.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect username or password.")
    if not admin.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This admin account has been deactivated.")

    admin.last_login_at = dt.datetime.utcnow()
    db.commit()
    db.refresh(admin)

    token, expires_in = create_access_token(admin)
    log_action(db, admin.username, "auth.login", f"{admin.username} logged in.")
    return schemas.TokenResponse(access_token=token, expires_in=expires_in, admin=_admin_out(admin))


@router.get("/me", response_model=schemas.AdminUserOut)
def me(admin: models.AdminUser = Depends(get_current_admin)):
    return _admin_out(admin)


@router.post("/change-password", response_model=schemas.AdminUserOut)
def change_password(
    payload: schemas.ChangePasswordRequest,
    admin: models.AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    if not verify_password(payload.current_password, admin.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect.")
    admin.password_hash = hash_password(payload.new_password)
    db.commit()
    db.refresh(admin)
    log_action(db, admin.username, "auth.change_password", f"{admin.username} changed their password.")
    return _admin_out(admin)


# --- Admin account management (superadmin only) -------------------------

@router.get("/admins", response_model=list[schemas.AdminUserOut])
def list_admins(
    _: models.AdminUser = Depends(require_superadmin),
    db: Session = Depends(get_db),
):
    admins = db.query(models.AdminUser).order_by(models.AdminUser.id).all()
    return [_admin_out(a) for a in admins]


@router.post("/admins", response_model=schemas.AdminUserOut, status_code=201)
def create_admin(
    payload: schemas.AdminUserCreate,
    actor: models.AdminUser = Depends(require_superadmin),
    db: Session = Depends(get_db),
):
    if payload.role not in ("admin", "superadmin"):
        raise HTTPException(status_code=400, detail="role must be 'admin' or 'superadmin'.")
    if len(payload.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters.")
    existing = db.query(models.AdminUser).filter(models.AdminUser.username == payload.username).first()
    if existing:
        raise HTTPException(status_code=400, detail="That username is already taken.")

    new_admin = models.AdminUser(
        username=payload.username,
        display_name=payload.display_name or payload.username,
        password_hash=hash_password(payload.password),
        role=payload.role,
        is_active=True,
    )
    db.add(new_admin)
    db.commit()
    db.refresh(new_admin)
    log_action(db, actor.username, "admin.create", f"{actor.username} created admin '{new_admin.username}' ({new_admin.role}).")
    return _admin_out(new_admin)


@router.patch("/admins/{admin_id}", response_model=schemas.AdminUserOut)
def update_admin(
    admin_id: int,
    payload: schemas.AdminUserUpdate,
    actor: models.AdminUser = Depends(require_superadmin),
    db: Session = Depends(get_db),
):
    target = db.get(models.AdminUser, admin_id)
    if not target:
        raise HTTPException(status_code=404, detail="Admin not found.")

    if payload.role is not None:
        if payload.role not in ("admin", "superadmin"):
            raise HTTPException(status_code=400, detail="role must be 'admin' or 'superadmin'.")
        if target.id == actor.id and payload.role != "superadmin":
            raise HTTPException(status_code=400, detail="You can't demote your own account.")
        target.role = payload.role

    if payload.is_active is not None:
        if target.id == actor.id and not payload.is_active:
            raise HTTPException(status_code=400, detail="You can't deactivate your own account.")
        target.is_active = payload.is_active

    if payload.display_name is not None:
        target.display_name = payload.display_name

    db.commit()
    db.refresh(target)
    log_action(db, actor.username, "admin.update", f"{actor.username} updated admin '{target.username}'.")
    return _admin_out(target)


@router.delete("/admins/{admin_id}", status_code=200)
def delete_admin(
    admin_id: int,
    actor: models.AdminUser = Depends(require_superadmin),
    db: Session = Depends(get_db),
):
    target = db.get(models.AdminUser, admin_id)
    if not target:
        raise HTTPException(status_code=404, detail="Admin not found.")
    if target.id == actor.id:
        raise HTTPException(status_code=400, detail="You can't delete your own account.")

    remaining_superadmins = (
        db.query(models.AdminUser)
        .filter(models.AdminUser.role == "superadmin", models.AdminUser.id != target.id)
        .count()
    )
    if target.role == "superadmin" and remaining_superadmins == 0:
        raise HTTPException(status_code=400, detail="Can't delete the last superadmin account.")

    db.delete(target)
    db.commit()
    log_action(db, actor.username, "admin.delete", f"{actor.username} deleted admin '{target.username}'.")
    return {"ok": True}
