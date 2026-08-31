import csv
import io
import uuid
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..ml.explainer import explain_team
from ..ml.matching import team_skill_coverage
from ..ml.optimizer import generate_teams
from ..security import get_current_admin
from ..utils import ParticipantView, log_action, participant_to_out

router = APIRouter(prefix="/api/teams", tags=["teams"])


def _team_to_out(team: models.Team) -> schemas.TeamOut:
    return schemas.TeamOut(
        id=team.id,
        name=team.name,
        members=[participant_to_out(m) for m in team.members],
        skill_coverage_score=team.skill_coverage_score,
        compatibility_score=team.compatibility_score,
        explanation=team.explanation,
        strengths=team.strengths.split("||") if team.strengths else [],
        weaknesses=team.weaknesses.split("||") if team.weaknesses else [],
        suggested_project=team.suggested_project,
    )


@router.post("/generate", response_model=List[schemas.TeamOut])
def generate(
    payload: schemas.GenerateTeamsRequest,
    admin: models.AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    participants = db.query(models.Participant).all()
    if len(participants) < payload.team_size:
        raise HTTPException(
            status_code=400,
            detail=f"Need at least {payload.team_size} registered participants to form a team.",
        )

    # Clear any previous team assignments so re-generation starts fresh.
    db.query(models.Team).delete()
    for p in participants:
        p.team_id = None
    db.commit()

    views = [ParticipantView(p) for p in participants]
    id_to_model = {p.id: p for p in participants}

    grouped = generate_teams(views, team_size=payload.team_size)
    run_id = str(uuid.uuid4())[:8]

    created_teams = []
    for idx, group in enumerate(grouped, start=1):
        member_models = [id_to_model[v.id] for v in group]
        from ..ml.embeddings import ProfileEmbedder
        from ..ml.optimizer import team_quality

        embedder = ProfileEmbedder()
        embedder.fit(group)
        compatibility = team_quality(group, embedder)
        coverage = team_skill_coverage(group)

        ai = explain_team(group, coverage, compatibility)

        team = models.Team(
            name=f"Team {idx}",
            run_id=run_id,
            skill_coverage_score=round(coverage, 3),
            compatibility_score=round(compatibility, 3),
            explanation=ai["explanation"],
            strengths="||".join(ai["strengths"]),
            weaknesses="||".join(ai["weaknesses"]),
            suggested_project=ai["suggested_project"],
        )
        db.add(team)
        db.flush()  # get team.id before assigning members

        for m in member_models:
            m.team_id = team.id

        created_teams.append(team)

    db.commit()
    for t in created_teams:
        db.refresh(t)

    log_action(
        db, admin.username, "teams.generate",
        f"{admin.username} generated {len(created_teams)} team(s) of size {payload.team_size} (run {run_id}).",
    )
    return [_team_to_out(t) for t in created_teams]


@router.get("", response_model=List[schemas.TeamOut])
def list_teams(db: Session = Depends(get_db)):
    teams = db.query(models.Team).all()
    return [_team_to_out(t) for t in teams]


@router.get("/export.csv", response_class=StreamingResponse)
def export_teams_csv(db: Session = Depends(get_db)):
    """Downloadable CSV of the current team roster -- one row per member,
    with team-level scores repeated for easy spreadsheet pivoting."""
    teams = db.query(models.Team).order_by(models.Team.id).all()

    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow([
        "team_id", "team_name", "skill_coverage_score", "compatibility_score",
        "suggested_project", "member_name", "member_email", "member_role",
    ])
    for t in teams:
        for m in t.members:
            writer.writerow([
                t.id, t.name, t.skill_coverage_score, t.compatibility_score,
                t.suggested_project, m.name, m.email, m.preferred_role,
            ])
    buffer.seek(0)
    return StreamingResponse(
        iter([buffer.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=teams.csv"},
    )


@router.get("/{team_id}", response_model=schemas.TeamOut)
def get_team(team_id: int, db: Session = Depends(get_db)):
    team = db.get(models.Team, team_id)
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    return _team_to_out(team)


@router.patch("/{team_id}/rename", response_model=schemas.TeamOut)
def rename_team(
    team_id: int,
    name: str,
    admin: models.AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    team = db.get(models.Team, team_id)
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    old_name = team.name
    team.name = name.strip() or team.name
    db.commit()
    db.refresh(team)
    log_action(db, admin.username, "team.rename", f"{admin.username} renamed team '{old_name}' to '{team.name}'.")
    return _team_to_out(team)
