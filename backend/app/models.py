import datetime as dt

from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from .database import Base

# Association table: which team a participant belongs to (many-to-one is
# enough since a participant is only ever on one active team, but we model
# it as a simple FK for clarity and easy re-runs).


class Participant(Base):
    __tablename__ = "participants"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False)

    # Comma-separated lists kept simple on purpose (SQLite-friendly, no
    # extra join tables needed for a hackathon-scale dataset).
    skills = Column(String, default="")            # "Python,React,UI/UX"
    domains = Column(String, default="")            # "Healthcare,FinTech"
    preferred_role = Column(String, default="")     # "Frontend","Backend","ML","Design","PM"
    experience_level = Column(String, default="Intermediate")  # Beginner/Intermediate/Advanced
    working_style = Column(String, default="")       # "Morning person, likes planning"
    availability = Column(String, default="Full-time")  # Full-time / Part-time / Evenings
    bio = Column(Text, default="")                   # free text -> embedded with TF-IDF

    team_id = Column(Integer, ForeignKey("teams.id"), nullable=True)
    team = relationship("Team", back_populates="members")


class Team(Base):
    __tablename__ = "teams"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, default="")
    run_id = Column(String, index=True)  # groups teams generated together
    skill_coverage_score = Column(Float, default=0.0)
    compatibility_score = Column(Float, default=0.0)
    explanation = Column(Text, default="")
    strengths = Column(Text, default="")
    weaknesses = Column(Text, default="")
    suggested_project = Column(Text, default="")

    members = relationship("Participant", back_populates="team")


class AdminUser(Base):
    """A real organizer account -- replaces the old shared X-Admin-Key
    header with proper per-person login and audit trail."""

    __tablename__ = "admin_users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, nullable=False, index=True)
    display_name = Column(String, default="")
    password_hash = Column(String, nullable=False)
    role = Column(String, default="admin")  # "admin" | "superadmin"
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=dt.datetime.utcnow)
    last_login_at = Column(DateTime, nullable=True)


class AuditLog(Base):
    """Append-only record of admin actions -- who did what, and when.
    Gives organizers accountability once more than one person holds
    admin access."""

    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    actor = Column(String, default="")       # admin username, or "system"
    action = Column(String, nullable=False)  # short machine-readable tag
    detail = Column(Text, default="")        # human-readable description
    created_at = Column(DateTime, default=dt.datetime.utcnow)
