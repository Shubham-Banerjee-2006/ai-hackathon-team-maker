import csv
import io
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..security import get_current_admin
from ..utils import csv_to_list, list_to_csv, log_action, participant_to_out

router = APIRouter(prefix="/api/participants", tags=["participants"])


@router.post("", response_model=schemas.ParticipantOut, status_code=201)
def create_participant(
    payload: schemas.ParticipantCreate,
    db: Session = Depends(get_db),
):
    existing = db.query(models.Participant).filter(models.Participant.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="A participant with this email already exists.")

    participant = models.Participant(
        name=payload.name,
        email=payload.email,
        skills=list_to_csv(payload.skills),
        domains=list_to_csv(payload.domains),
        preferred_role=payload.preferred_role,
        experience_level=payload.experience_level,
        working_style=payload.working_style,
        availability=payload.availability,
        bio=payload.bio,
    )
    db.add(participant)
    db.commit()
    db.refresh(participant)
    return participant_to_out(participant)


@router.get("", response_model=List[schemas.ParticipantOut])
def list_participants(
    db: Session = Depends(get_db),
    search: Optional[str] = Query(None, description="Match against name or email"),
    skill: Optional[str] = Query(None, description="Filter to participants who list this skill"),
    domain: Optional[str] = Query(None, description="Filter to participants interested in this domain"),
    role: Optional[str] = Query(None, description="Filter to participants preferring this role"),
    unassigned_only: bool = Query(False, description="Only return participants with no team yet"),
    limit: int = Query(200, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    q = db.query(models.Participant)
    if search:
        like = f"%{search.strip()}%"
        q = q.filter((models.Participant.name.ilike(like)) | (models.Participant.email.ilike(like)))
    if role:
        q = q.filter(models.Participant.preferred_role.ilike(role))
    if unassigned_only:
        q = q.filter(models.Participant.team_id.is_(None))

    participants = q.order_by(models.Participant.id).offset(offset).limit(limit).all()

    if skill:
        skill_lower = skill.lower()
        participants = [p for p in participants if skill_lower in [s.lower() for s in csv_to_list(p.skills)]]
    if domain:
        domain_lower = domain.lower()
        participants = [p for p in participants if domain_lower in [d.lower() for d in csv_to_list(p.domains)]]

    return [participant_to_out(p) for p in participants]


@router.get("/export.csv", response_class=StreamingResponse)
def export_participants_csv(db: Session = Depends(get_db)):
    """Downloadable CSV of the full roster -- handy for organizers to
    archive a run or import into a spreadsheet."""
    participants = db.query(models.Participant).order_by(models.Participant.id).all()

    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow([
        "id", "name", "email", "skills", "domains", "preferred_role",
        "experience_level", "availability", "working_style", "bio", "team_id",
    ])
    for p in participants:
        writer.writerow([
            p.id, p.name, p.email, p.skills, p.domains, p.preferred_role,
            p.experience_level, p.availability, p.working_style, p.bio, p.team_id or "",
        ])
    buffer.seek(0)
    return StreamingResponse(
        iter([buffer.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=participants.csv"},
    )


@router.get("/{participant_id}", response_model=schemas.ParticipantOut)
def get_participant(participant_id: int, db: Session = Depends(get_db)):
    p = db.get(models.Participant, participant_id)
    if not p:
        raise HTTPException(status_code=404, detail="Participant not found")
    return participant_to_out(p)


@router.patch("/{participant_id}", response_model=schemas.ParticipantOut)
def update_participant(
    participant_id: int,
    payload: schemas.ParticipantUpdate,
    admin: models.AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Admin-only edit of a roster entry -- for fixing typos or updating
    a participant's info on their behalf without deleting/re-registering."""
    p = db.get(models.Participant, participant_id)
    if not p:
        raise HTTPException(status_code=404, detail="Participant not found")

    data = payload.model_dump(exclude_unset=True)

    if "email" in data and data["email"] != p.email:
        clash = db.query(models.Participant).filter(models.Participant.email == data["email"]).first()
        if clash:
            raise HTTPException(status_code=400, detail="Another participant already uses that email.")

    for field in ("name", "email", "preferred_role", "experience_level", "working_style", "availability", "bio"):
        if field in data and data[field] is not None:
            setattr(p, field, data[field])
    if "skills" in data and data["skills"] is not None:
        p.skills = list_to_csv(data["skills"])
    if "domains" in data and data["domains"] is not None:
        p.domains = list_to_csv(data["domains"])

    db.commit()
    db.refresh(p)
    log_action(db, admin.username, "participant.update", f"{admin.username} updated participant #{p.id} ({p.name}).")
    return participant_to_out(p)


@router.delete("/{participant_id}", status_code=200)
def delete_participant(
    participant_id: int,
    admin: models.AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    p = db.get(models.Participant, participant_id)
    if not p:
        raise HTTPException(status_code=404, detail="Participant not found")
    name = p.name
    db.delete(p)
    db.commit()
    log_action(db, admin.username, "participant.delete", f"{admin.username} removed participant '{name}' (#{participant_id}).")
    return {"ok": True}
