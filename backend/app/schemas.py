import datetime as dt
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class ParticipantCreate(BaseModel):
    name: str
    email: EmailStr
    skills: List[str] = Field(default_factory=list)
    domains: List[str] = Field(default_factory=list)
    preferred_role: str = ""
    experience_level: str = "Intermediate"
    working_style: str = ""
    availability: str = "Full-time"
    bio: str = ""


class ParticipantUpdate(BaseModel):
    """All fields optional -- an admin editing a roster entry only sends
    what changed."""

    name: Optional[str] = None
    email: Optional[EmailStr] = None
    skills: Optional[List[str]] = None
    domains: Optional[List[str]] = None
    preferred_role: Optional[str] = None
    experience_level: Optional[str] = None
    working_style: Optional[str] = None
    availability: Optional[str] = None
    bio: Optional[str] = None


class ParticipantOut(BaseModel):
    id: int
    name: str
    email: str
    skills: List[str]
    domains: List[str]
    preferred_role: str
    experience_level: str
    working_style: str
    availability: str
    bio: str
    team_id: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)


class TeammateMatch(BaseModel):
    participant: ParticipantOut
    compatibility_score: float
    reason: str


class TeamOut(BaseModel):
    id: int
    name: str
    members: List[ParticipantOut]
    skill_coverage_score: float
    compatibility_score: float
    explanation: str
    strengths: List[str]
    weaknesses: List[str]
    suggested_project: str

    model_config = ConfigDict(from_attributes=True)


class GenerateTeamsRequest(BaseModel):
    team_size: int = 4


# --- Admin auth ---------------------------------------------------------

class LoginRequest(BaseModel):
    username: str
    password: str


class AdminUserOut(BaseModel):
    id: int
    username: str
    display_name: str
    role: str
    is_active: bool
    created_at: dt.datetime
    last_login_at: Optional[dt.datetime] = None

    model_config = ConfigDict(from_attributes=True)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    admin: AdminUserOut


class AdminUserCreate(BaseModel):
    username: str
    password: str
    display_name: str = ""
    role: str = "admin"  # "admin" | "superadmin"


class AdminUserUpdate(BaseModel):
    display_name: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(min_length=6)


# --- Admin dashboard -----------------------------------------------------

class AuditLogOut(BaseModel):
    id: int
    actor: str
    action: str
    detail: str
    created_at: dt.datetime

    model_config = ConfigDict(from_attributes=True)


class DistributionEntry(BaseModel):
    label: str
    count: int


class StatsOut(BaseModel):
    total_participants: int
    unassigned_participants: int
    total_teams: int
    avg_skill_coverage: float
    avg_compatibility: float
    top_skills: List[DistributionEntry]
    role_distribution: List[DistributionEntry]
    domain_distribution: List[DistributionEntry]
    experience_distribution: List[DistributionEntry]
    admin_count: int
    recent_actions: List[AuditLogOut]


class CsvImportResult(BaseModel):
    created: int
    skipped_duplicates: int
    errors: List[str]
