"""
Database configuration.

Uses SQLite by default so the project runs with zero setup.
To switch to PostgreSQL for production, just change DATABASE_URL, e.g.:

    DATABASE_URL = "postgresql://user:password@localhost:5432/hackteam"

and add `psycopg2-binary` to requirements.txt. Nothing else in the
codebase needs to change because we go through SQLAlchemy's ORM.
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from .config import get_settings

DATABASE_URL = get_settings().database_url

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def ensure_default_admin(logger=None) -> None:
    """Creates a first superadmin account if none exists yet, so the app
    is usable immediately after a fresh install without any manual setup
    step (mirrors the old "works with zero config" promise of the plain
    admin-key approach, but with a real, per-person login instead).

    Credentials come from ADMIN_BOOTSTRAP_USERNAME / ADMIN_BOOTSTRAP_PASSWORD
    when set; otherwise a username of "admin" and a random password are
    used, and that generated password is logged once so it isn't lost.
    """
    # Imported lazily to avoid a circular import (models -> database).
    from . import models
    from .config import get_settings
    from .security import hash_password

    settings = get_settings()
    db = SessionLocal()
    try:
        if db.query(models.AdminUser).first():
            return  # an admin already exists -- nothing to bootstrap

        username = settings.admin_bootstrap_username or "admin"
        password = settings.admin_bootstrap_password
        generated = False
        if not password:
            import secrets

            password = secrets.token_urlsafe(9)
            generated = True

        admin = models.AdminUser(
            username=username,
            display_name="Default Admin",
            password_hash=hash_password(password),
            role="superadmin",
            is_active=True,
        )
        db.add(admin)
        db.add(
            models.AuditLog(
                actor="system",
                action="admin.bootstrap",
                detail=f"Created default superadmin account '{username}'.",
            )
        )
        db.commit()

        if logger:
            if generated:
                logger.warning(
                    "No admin account existed -- created '%s' with a generated password: %s "
                    "(log in and change it immediately, or set ADMIN_BOOTSTRAP_PASSWORD).",
                    username,
                    password,
                )
            else:
                logger.info("Created default admin account '%s' from ADMIN_BOOTSTRAP_PASSWORD.", username)
    finally:
        db.close()
