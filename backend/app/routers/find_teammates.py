from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..ml.embeddings import ProfileEmbedder
from ..ml.matching import categorize_skills, pairwise_complementarity
from ..utils import ParticipantView, participant_to_out

router = APIRouter(prefix="/api/find-teammates", tags=["find-teammates"])


@router.get("/{participant_id}", response_model=List[schemas.TeammateMatch])
def find_teammates(participant_id: int, top_n: int = Query(5, ge=1, le=50), db: Session = Depends(get_db)):
    target = db.get(models.Participant, participant_id)
    if not target:
        raise HTTPException(status_code=404, detail="Participant not found")

    others = db.query(models.Participant).filter(models.Participant.id != participant_id).all()
    if not others:
        return []

    all_views = [ParticipantView(target)] + [ParticipantView(o) for o in others]
    embedder = ProfileEmbedder()
    embedder.fit(all_views)
    target_view = all_views[0]

    results = []
    for o, view in zip(others, all_views[1:], strict=False):
        complementarity = pairwise_complementarity(target_view, view)
        interest_overlap = embedder.similarity(target_view.id, view.id)
        score = 0.6 * complementarity + 0.4 * interest_overlap

        their_cats = categorize_skills(view.skills)
        my_cats = categorize_skills(target_view.skills)
        fills_gaps = their_cats - my_cats
        shared_domains = set(d.lower() for d in target_view.domains) & set(d.lower() for d in view.domains)

        reason_parts = []
        if fills_gaps:
            reason_parts.append(f"covers {', '.join(sorted(fills_gaps))}, which you don't list")
        if shared_domains:
            reason_parts.append(f"shares your interest in {', '.join(sorted(shared_domains))}")
        if not reason_parts:
            reason_parts.append("has an overlapping but slightly different skill set")
        reason = f"{view.name} " + " and ".join(reason_parts) + "."

        results.append(
            schemas.TeammateMatch(
                participant=participant_to_out(o),
                compatibility_score=round(float(score), 3),
                reason=reason,
            )
        )

    results.sort(key=lambda r: r.compatibility_score, reverse=True)
    return results[:top_n]
