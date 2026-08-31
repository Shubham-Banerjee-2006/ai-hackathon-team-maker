from typing import List, Optional

from sqlalchemy.orm import Session

from . import models, schemas


def csv_to_list(value: str) -> List[str]:
    return [v.strip() for v in (value or "").split(",") if v.strip()]


def list_to_csv(value: List[str]) -> str:
    return ",".join(v.strip() for v in value if v.strip())


def participant_to_out(p: models.Participant) -> schemas.ParticipantOut:
    return schemas.ParticipantOut(
        id=p.id,
        name=p.name,
        email=p.email,
        skills=csv_to_list(p.skills),
        domains=csv_to_list(p.domains),
        preferred_role=p.preferred_role,
        experience_level=p.experience_level,
        working_style=p.working_style,
        availability=p.availability,
        bio=p.bio,
        team_id=p.team_id,
    )


def log_action(db: Session, actor: Optional[str], action: str, detail: str = "") -> None:
    """Records an entry in the audit log. Best-effort: never raises, so a
    logging hiccup can't break the request that triggered it."""
    try:
        db.add(models.AuditLog(actor=actor or "system", action=action, detail=detail))
        db.commit()
    except Exception:
        db.rollback()


class ParticipantView:
    """Lightweight adapter so ML modules can work with plain attributes
    (lists, not CSV strings) without caring whether the source was a DB
    row or an in-memory object."""

    def __init__(self, p: models.Participant):
        self.id = p.id
        self.name = p.name
        self.email = p.email
        self.skills = csv_to_list(p.skills)
        self.domains = csv_to_list(p.domains)
        self.preferred_role = p.preferred_role
        self.experience_level = p.experience_level
        self.working_style = p.working_style
        self.availability = p.availability
        self.bio = p.bio
