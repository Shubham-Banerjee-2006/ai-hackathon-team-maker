"""Shared pytest fixtures: an isolated in-memory SQLite DB per test and a
FastAPI TestClient wired up to use it, so tests never touch a real DB
file and can run fully in parallel/CI with no setup."""
import os

os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")
os.environ.setdefault("ADMIN_BOOTSTRAP_USERNAME", "admin")
os.environ.setdefault("ADMIN_BOOTSTRAP_PASSWORD", "test-admin-password")
os.environ.setdefault("JWT_SECRET", "test-jwt-secret-not-for-production")
os.environ.setdefault("ANTHROPIC_API_KEY", "")

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, ensure_default_admin, get_db
from app.main import app

TEST_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture()
def db_session():
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture()
def client(db_session, monkeypatch):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    # Point the app's own SessionLocal (used by ensure_default_admin, which
    # opens its own session outside of the request-scoped dependency) at
    # the same in-memory engine/session used by the test.
    import app.database as database_module

    monkeypatch.setattr(database_module, "SessionLocal", TestingSessionLocal)

    app.dependency_overrides[get_db] = override_get_db
    ensure_default_admin()
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture()
def admin_token(client):
    res = client.post("/api/auth/login", json={"username": "admin", "password": "test-admin-password"})
    assert res.status_code == 200, res.text
    return res.json()["access_token"]


@pytest.fixture()
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


SAMPLE_PARTICIPANTS = [
    {
        "name": "Ada Lovelace",
        "email": "ada@example.com",
        "skills": ["Python", "Machine Learning", "NLP"],
        "domains": ["Healthcare"],
        "preferred_role": "ML",
        "experience_level": "Advanced",
        "bio": "Loves turning research papers into working prototypes.",
    },
    {
        "name": "Grace Hopper",
        "email": "grace@example.com",
        "skills": ["React", "TypeScript", "UI/UX"],
        "domains": ["Healthcare"],
        "preferred_role": "Frontend",
        "experience_level": "Intermediate",
        "bio": "Cares a lot about accessible, fast interfaces.",
    },
    {
        "name": "Alan Turing",
        "email": "alan@example.com",
        "skills": ["FastAPI", "SQL", "Cloud"],
        "domains": ["FinTech"],
        "preferred_role": "Backend",
        "experience_level": "Advanced",
        "bio": "Enjoys designing clean APIs and infra.",
    },
    {
        "name": "Katherine Johnson",
        "email": "katherine@example.com",
        "skills": ["Figma", "Product Management"],
        "domains": ["Education"],
        "preferred_role": "PM",
        "experience_level": "Beginner",
        "bio": "Keeps teams focused on the user problem.",
    },
]
