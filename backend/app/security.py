"""
Admin authentication: real accounts with hashed passwords and JWT
session tokens -- not a single shared secret key.

Design goals:
  - No extra native dependencies (bcrypt/passlib) required to install --
    passwords are hashed with PBKDF2-HMAC-SHA256 from the standard
    library, which is secure and dependency-free.
  - Stateless sessions via signed JWTs (PyJWT), so no server-side
    session store is needed.
  - Two roles: "admin" (day-to-day organizer actions) and "superadmin"
    (everything an admin can do, plus managing other admin accounts).
  - Zero-setup local/demo experience: a default admin account is
    auto-created on first startup (see database.ensure_default_admin),
    instead of the app silently running with auth disabled.
"""

import datetime as dt
import hashlib
import hmac
import secrets
from typing import Optional

import jwt
from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from . import models
from .config import get_settings
from .database import get_db

PBKDF2_ITERATIONS = 260_000
PBKDF2_ALGO = "sha256"


# ---------------------------------------------------------------------------
# Password hashing
# ---------------------------------------------------------------------------

def hash_password(password: str) -> str:
    """Returns a self-describing hash string:
    algo$iterations$salt$hash

    All values are stored as hex where appropriate, so the iteration count
    can change later without breaking existing stored hashes.
    """
    salt = secrets.token_hex(16)

    digest = hashlib.pbkdf2_hmac(
        PBKDF2_ALGO,
        password.encode("utf-8"),
        bytes.fromhex(salt),
        PBKDF2_ITERATIONS,
    )

    return (
        f"pbkdf2_{PBKDF2_ALGO}"
        f"${PBKDF2_ITERATIONS}"
        f"${salt}"
        f"${digest.hex()}"
    )


def verify_password(password: str, stored_hash: str) -> bool:
    """Verify a password against a stored PBKDF2 hash."""
    try:
        algo_label, iterations_str, salt, hex_digest = stored_hash.split("$")
        algo = algo_label.replace("pbkdf2_", "")
        iterations = int(iterations_str)
    except (ValueError, AttributeError):
        return False

    candidate = hashlib.pbkdf2_hmac(
        algo,
        password.encode("utf-8"),
        bytes.fromhex(salt),
        iterations,
    )

    return hmac.compare_digest(candidate.hex(), hex_digest)


# ---------------------------------------------------------------------------
# JWT session tokens
# ---------------------------------------------------------------------------

def create_access_token(admin: models.AdminUser) -> tuple[str, int]:
    """Create a signed JWT access token for an admin user."""
    settings = get_settings()

    expires_delta = dt.timedelta(
        minutes=settings.jwt_expires_minutes
    )

    expires_at = dt.datetime.now(dt.timezone.utc) + expires_delta

    payload = {
        "sub": str(admin.id),
        "username": admin.username,
        "role": admin.role,
        "exp": expires_at,
        "iat": dt.datetime.now(dt.timezone.utc),
    }

    token = jwt.encode(
        payload,
        settings.jwt_secret,
        algorithm=settings.jwt_algorithm,
    )

    return token, settings.jwt_expires_minutes * 60


def decode_access_token(token: str) -> dict:
    """Decode and validate a JWT access token."""
    settings = get_settings()

    try:
        return jwt.decode(
            token,
            settings.jwt_secret,
            algorithms=[settings.jwt_algorithm],
        )

    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Admin session expired. Please log in again.",
        ) from None

    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid admin session token.",
        ) from None


def _extract_bearer_token(request: Request) -> Optional[str]:
    """Extract a Bearer token from the Authorization header."""
    auth_header = request.headers.get("Authorization", "")

    if not auth_header.lower().startswith("bearer "):
        return None

    return auth_header[7:].strip()


# ---------------------------------------------------------------------------
# FastAPI dependencies
# ---------------------------------------------------------------------------

def get_current_admin(
    request: Request,
    db: Session = Depends(get_db),
) -> models.AdminUser:
    """Resolve the logged-in admin from the Authorization header.

    Requires:
        Authorization: Bearer <jwt>

    Use this as a route dependency to require admin authentication.
    """

    token = _extract_bearer_token(request)

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=(
                "Admin login required. "
                "Include 'Authorization: Bearer <token>'."
            ),
        )

    payload = decode_access_token(token)

    admin_id = payload.get("sub")

    admin = (
        db.get(models.AdminUser, int(admin_id))
        if admin_id
        else None
    )

    if not admin or not admin.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=(
                "This admin account is no longer active. "
                "Please log in again."
            ),
        )

    return admin


# Backwards-compatible alias:
# Existing routers depend on `require_admin`.
require_admin = get_current_admin


def require_superadmin(
    admin: models.AdminUser = Depends(get_current_admin),
) -> models.AdminUser:
    """Require a superadmin account.

    Use this for endpoints that manage other admin accounts.
    """

    if admin.role != "superadmin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This action requires a superadmin account.",
        )

    return admin


def get_optional_admin(
    request: Request,
    db: Session = Depends(get_db),
) -> Optional[models.AdminUser]:
    """Resolve the current admin if a valid session exists.

    Unlike get_current_admin(), this returns None when there is no
    valid session instead of raising an authentication error.

    Useful for endpoints that behave differently for logged-in
    organizers without requiring authentication.
    """

    token = _extract_bearer_token(request)

    if not token:
        return None

    try:
        payload = decode_access_token(token)
    except HTTPException:
        return None

    admin_id = payload.get("sub")

    admin = (
        db.get(models.AdminUser, int(admin_id))
        if admin_id
        else None
    )

    return admin if (admin and admin.is_active) else None