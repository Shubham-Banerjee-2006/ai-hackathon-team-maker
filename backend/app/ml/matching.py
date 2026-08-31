"""
Skill-complementarity + compatibility scoring.

Two participants are "complementary" when their skill sets don't fully
overlap - each brings something the other lacks. A well-rounded hackathon
team needs coverage across roles (frontend, backend, ML, design, PM)
without everyone stacked in the same lane.
"""
from typing import Dict, List

import numpy as np

# The role/skill taxonomy the optimizer tries to cover per team.
CORE_CATEGORIES: Dict[str, List[str]] = {
    "frontend": ["react", "vue", "angular", "javascript", "typescript", "css", "html", "frontend"],
    "backend": ["python", "node", "java", "go", "django", "fastapi", "backend", "api", "sql"],
    "ml": ["machine learning", "ml", "nlp", "deep learning", "pytorch", "tensorflow", "data science", "ai"],
    "design": ["ui/ux", "ui", "ux", "design", "figma", "product design"],
    "cloud_devops": ["cloud", "aws", "gcp", "azure", "devops", "docker", "kubernetes"],
    "pm": ["product management", "pm", "project management", "business"],
}


def categorize_skills(skills: List[str]) -> set:
    """Map a participant's raw skills onto the coarse category taxonomy."""
    cats = set()
    lowered = [s.lower().strip() for s in skills]
    for cat, keywords in CORE_CATEGORIES.items():
        if any(any(kw in s for kw in keywords) for s in lowered):
            cats.add(cat)
    return cats


def pairwise_complementarity(p1, p2) -> float:
    """0..1 score: higher when two participants' skill categories differ
    (they fill each other's gaps) but isn't purely opposite - some shared
    ground (domain interest, role) keeps collaboration smooth."""
    cats1, cats2 = categorize_skills(p1.skills), categorize_skills(p2.skills)
    if not cats1 or not cats2:
        gap_score = 0.5
    else:
        union = cats1 | cats2
        overlap = cats1 & cats2
        gap_score = 1 - (len(overlap) / len(union)) if union else 0.0

    domains1, domains2 = set(d.lower() for d in p1.domains), set(d.lower() for d in p2.domains)
    shared_domain = 1.0 if (domains1 & domains2) else 0.0

    # Weighted blend: skill gap matters most, shared domain interest helps
    # collaboration and motivation.
    return 0.75 * gap_score + 0.25 * shared_domain


def team_skill_coverage(members: List) -> float:
    """Fraction of the core categories a team collectively covers."""
    covered = set()
    for m in members:
        covered |= categorize_skills(m.skills)
    return len(covered) / len(CORE_CATEGORIES)


def experience_balance(members: List) -> float:
    """Reward teams that aren't all-beginner or all-advanced."""
    levels = {"Beginner": 0, "Intermediate": 1, "Advanced": 2}
    scores = [levels.get(m.experience_level, 1) for m in members]
    if len(set(scores)) == 1 and len(scores) > 1:
        return 0.4  # everyone identical level -> weaker balance
    spread = np.std(scores)
    return float(min(1.0, 0.5 + spread / 2))


def role_diversity(members: List) -> float:
    roles = [m.preferred_role for m in members if m.preferred_role]
    if not roles:
        return 0.5
    return len(set(roles)) / len(roles)
