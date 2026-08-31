"""
Organizer dashboard endpoints: roster/team analytics, the audit trail,
bulk CSV import, and a quick "clear all teams" reset. Everything here
requires a logged-in admin.
"""
import csv
import io
from collections import Counter
from typing import List

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..security import get_current_admin
from ..utils import csv_to_list, list_to_csv, log_action, participant_to_out

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.get("/stats", response_model=schemas.StatsOut)
def get_stats(
    _: models.AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    participants = db.query(models.Participant).all()
    teams = db.query(models.Team).all()

    skill_counter: Counter = Counter()
    role_counter: Counter = Counter()
    domain_counter: Counter = Counter()
    experience_counter: Counter = Counter()

    for p in participants:
        skill_counter.update(csv_to_list(p.skills))
        domain_counter.update(csv_to_list(p.domains))
        if p.preferred_role:
            role_counter[p.preferred_role] += 1
        if p.experience_level:
            experience_counter[p.experience_level] += 1

    def top(counter: Counter, n: int = 8) -> List[schemas.DistributionEntry]:
        return [schemas.DistributionEntry(label=label, count=count) for label, count in counter.most_common(n)]

    avg_coverage = sum(t.skill_coverage_score for t in teams) / len(teams) if teams else 0.0
    avg_compat = sum(t.compatibility_score for t in teams) / len(teams) if teams else 0.0

    recent = (
        db.query(models.AuditLog)
        .order_by(models.AuditLog.created_at.desc(), models.AuditLog.id.desc())
        .limit(10)
        .all()
    )

    return schemas.StatsOut(
        total_participants=len(participants),
        unassigned_participants=sum(1 for p in participants if p.team_id is None),
        total_teams=len(teams),
        avg_skill_coverage=round(avg_coverage, 3),
        avg_compatibility=round(avg_compat, 3),
        top_skills=top(skill_counter),
        role_distribution=top(role_counter, n=12),
        domain_distribution=top(domain_counter, n=12),
        experience_distribution=top(experience_counter, n=6),
        admin_count=db.query(models.AdminUser).count(),
        recent_actions=[schemas.AuditLogOut.model_validate(a) for a in recent],
    )


@router.get("/audit-log", response_model=List[schemas.AuditLogOut])
def get_audit_log(
    _: models.AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    entries = (
        db.query(models.AuditLog)
        .order_by(models.AuditLog.created_at.desc(), models.AuditLog.id.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    return [schemas.AuditLogOut.model_validate(e) for e in entries]


@router.post("/teams/reset")
def reset_teams(
    admin: models.AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Clears every team and un-assigns all participants, without running
    the optimizer again -- useful when an organizer wants a clean slate
    before re-registering people or changing team size."""
    count = db.query(models.Team).count()
    db.query(models.Participant).update({models.Participant.team_id: None})
    db.query(models.Team).delete()
    db.commit()
    log_action(db, admin.username, "teams.reset", f"{admin.username} cleared {count} team(s).")
    return {"ok": True, "teams_cleared": count}


@router.post("/participants/import-csv", response_model=schemas.CsvImportResult)
def import_participants_csv(
    admin: models.AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
    file: UploadFile = File(...),
):
    """Bulk-registers participants from a CSV with columns:
    name,email,skills,domains,preferred_role,experience_level,
    working_style,availability,bio -- skills/domains are pipe- or
    comma-separated within their cell (e.g. "Python|React").
    Rows with a duplicate email are skipped, not overwritten.
    """
    raw = file.file.read().decode("utf-8-sig", errors="replace")
    reader = csv.DictReader(io.StringIO(raw))

    required_cols = {"name", "email"}
    if not reader.fieldnames or not required_cols.issubset({c.strip().lower() for c in reader.fieldnames}):
        raise HTTPException(status_code=400, detail="CSV must include at least 'name' and 'email' columns.")

    normalized_rows = []
    for row in reader:
        normalized_rows.append({(k or "").strip().lower(): (v or "").strip() for k, v in row.items()})

    created, skipped, errors = 0, 0, []
    existing_emails = {e for (e,) in db.query(models.Participant.email).all()}

    def split_multi(value: str) -> list[str]:
        for sep in ("|", ";"):
            if sep in value:
                return [v.strip() for v in value.split(sep) if v.strip()]
        return [v.strip() for v in value.split(",") if v.strip()]

    for i, row in enumerate(normalized_rows, start=2):  # header is row 1
        name = row.get("name", "")
        email = row.get("email", "")
        if not name or not email:
            errors.append(f"Row {i}: missing name or email, skipped.")
            continue
        if email in existing_emails:
            skipped += 1
            continue
        try:
            participant = models.Participant(
                name=name,
                email=email,
                skills=list_to_csv(split_multi(row.get("skills", ""))),
                domains=list_to_csv(split_multi(row.get("domains", ""))),
                preferred_role=row.get("preferred_role", ""),
                experience_level=row.get("experience_level", "") or "Intermediate",
                working_style=row.get("working_style", ""),
                availability=row.get("availability", "") or "Full-time",
                bio=row.get("bio", ""),
            )
            db.add(participant)
            existing_emails.add(email)
            created += 1
        except Exception as exc:  # defensive: one bad row shouldn't abort the batch
            errors.append(f"Row {i}: {exc}")

    db.commit()
    log_action(
        db, admin.username, "participants.import_csv",
        f"{admin.username} imported {created} participant(s) via CSV ({skipped} duplicates skipped).",
    )
    return schemas.CsvImportResult(created=created, skipped_duplicates=skipped, errors=errors)
