"""
AI/LLM explanation layer.

By default this runs in "template mode": no API key required, works
completely offline, and produces genuinely data-driven explanations
because every sentence is generated from the actual scores and skill
sets computed by matching.py / optimizer.py - nothing is hardcoded.

If you want real LLM-generated prose instead of templated prose, set the
ANTHROPIC_API_KEY environment variable. When present, `explain_team`
calls the Claude API with the same computed stats as context, so the
LLM is explaining real numbers rather than inventing them - this keeps
explanations grounded and prevents hallucinated claims about the team.
"""
import json
import os
from typing import Dict, List

from .matching import CORE_CATEGORIES, categorize_skills

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")

PROJECT_IDEAS_BY_DOMAIN = {
    "healthcare": [
        "AI symptom-checker chatbot with a doctor hand-off dashboard",
        "Wearable-data anomaly detector for early health-risk alerts",
        "Appointment no-show predictor for clinics",
    ],
    "fintech": [
        "Micro-savings app that rounds up purchases and auto-invests",
        "Fraud-pattern detector for peer-to-peer payments",
        "Explainable credit-scoring tool for underbanked users",
    ],
    "education": [
        "Adaptive quiz generator that targets each student's weak topics",
        "AI study-buddy that turns lecture notes into flashcards",
        "Classroom engagement dashboard for teachers",
    ],
    "climate": [
        "Household carbon-footprint tracker with personalized tips",
        "Crowdsourced flood/heat-risk map for a city",
        "Food-waste predictor for restaurants and grocers",
    ],
    "default": [
        "A community marketplace connecting a niche group of users",
        "An AI copilot that automates a tedious multi-step workflow",
        "A real-time dashboard that turns raw data into clear action items",
    ],
}


def _top_domain(members: List) -> str:
    counts: Dict[str, int] = {}
    for m in members:
        for d in m.domains:
            counts[d.lower()] = counts.get(d.lower(), 0) + 1
    if not counts:
        return "default"
    return max(counts, key=counts.get)


def _missing_categories(members: List) -> List[str]:
    covered = set()
    for m in members:
        covered |= categorize_skills(m.skills)
    return [c for c in CORE_CATEGORIES if c not in covered]


def _template_explanation(members: List, coverage: float, compatibility: float) -> Dict:
    names = [m.name for m in members]
    all_skills = sorted({s for m in members for s in m.skills})
    covered_cats = sorted({c for m in members for c in categorize_skills(m.skills)})
    missing = _missing_categories(members)
    domain = _top_domain(members)

    strengths = []
    if covered_cats:
        strengths.append(
            f"Covers {len(covered_cats)}/{len(CORE_CATEGORIES)} core skill areas: {', '.join(covered_cats)}."
        )
    exp_levels = [m.experience_level for m in members]
    if len(set(exp_levels)) > 1:
        strengths.append(f"Mixes experience levels ({', '.join(sorted(set(exp_levels)))}) for mentorship balance.")
    if compatibility > 0.6:
        strengths.append("Members share strong interest overlap based on their bios and preferred domains.")
    if not strengths:
        strengths.append("A workable starting lineup - skills are the main thing to shore up.")

    weaknesses = []
    if missing:
        weaknesses.append(f"No one explicitly covers: {', '.join(missing)}. Consider pairing up on this gap.")
    if len(set(exp_levels)) == 1 and len(members) > 1:
        weaknesses.append("Everyone is at the same experience level - decision-making could lack a tiebreaker.")
    roles = [m.preferred_role for m in members if m.preferred_role]
    if roles and len(set(roles)) < len(roles):
        weaknesses.append("Some role overlap - agree early on who owns what to avoid duplicated work.")
    if not weaknesses:
        weaknesses.append("No major gaps detected - focus on communication and scope discipline.")

    explanation = (
        f"{', '.join(names)} were grouped together because their skills are "
        f"{'highly complementary' if compatibility > 0.6 else 'reasonably complementary'} "
        f"(compatibility score {compatibility:.2f}) and together they reach "
        f"{coverage * 100:.0f}% coverage of core hackathon skill areas "
        f"({', '.join(covered_cats) if covered_cats else 'limited coverage'})."
    )

    ideas = PROJECT_IDEAS_BY_DOMAIN.get(domain, PROJECT_IDEAS_BY_DOMAIN["default"])
    suggested_project = (
        f"Given the team's combined skills ({', '.join(all_skills[:6])}{'...' if len(all_skills) > 6 else ''}) "
        f"and interest in {domain if domain != 'default' else 'a broad range of problems'}, "
        f"consider building: \"{ideas[0]}\". Alternatives: \"{ideas[1]}\" or \"{ideas[2]}\"."
    )

    return {
        "explanation": explanation,
        "strengths": strengths,
        "weaknesses": weaknesses,
        "suggested_project": suggested_project,
    }


def _llm_explanation(members: List, coverage: float, compatibility: float) -> Dict:
    """Calls the Anthropic API to turn the computed stats into prose.
    Falls back to the template explanation on any error so the app never
    breaks because of a network/API issue."""
    try:
        import urllib.request

        context = {
            "members": [
                {
                    "name": m.name,
                    "skills": m.skills,
                    "domains": m.domains,
                    "role": m.preferred_role,
                    "experience": m.experience_level,
                }
                for m in members
            ],
            "skill_coverage_score": round(coverage, 2),
            "compatibility_score": round(compatibility, 2),
            "missing_skill_categories": _missing_categories(members),
        }
        prompt = (
            "You are explaining why an algorithm grouped these hackathon "
            "participants into one team. Use ONLY the data given - do not "
            "invent facts. Respond as strict JSON with keys: explanation "
            "(1-2 sentences), strengths (list of short strings), "
            "weaknesses (list of short strings), suggested_project "
            "(1-2 sentences naming one concrete project idea).\n\n"
            f"DATA:\n{json.dumps(context)}"
        )
        body = json.dumps({
            "model": "claude-sonnet-4-6",
            "max_tokens": 500,
            "messages": [{"role": "user", "content": prompt}],
        }).encode()
        req = urllib.request.Request(
            "https://api.anthropic.com/v1/messages",
            data=body,
            headers={
                "Content-Type": "application/json",
                "x-api-key": ANTHROPIC_API_KEY,
                "anthropic-version": "2023-06-01",
            },
        )
        with urllib.request.urlopen(req, timeout=20) as resp:
            data = json.loads(resp.read())
        text = "".join(b.get("text", "") for b in data.get("content", []) if b.get("type") == "text")
        parsed = json.loads(text)
        return {
            "explanation": parsed.get("explanation", ""),
            "strengths": parsed.get("strengths", []),
            "weaknesses": parsed.get("weaknesses", []),
            "suggested_project": parsed.get("suggested_project", ""),
        }
    except Exception:
        return _template_explanation(members, coverage, compatibility)


def explain_team(members: List, coverage: float, compatibility: float) -> Dict:
    if ANTHROPIC_API_KEY:
        return _llm_explanation(members, coverage, compatibility)
    return _template_explanation(members, coverage, compatibility)
