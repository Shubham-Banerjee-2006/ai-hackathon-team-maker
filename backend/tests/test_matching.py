"""Unit tests for the skill-complementarity / coverage scoring logic."""
from types import SimpleNamespace

from app.ml.matching import (
    CORE_CATEGORIES,
    categorize_skills,
    experience_balance,
    pairwise_complementarity,
    role_diversity,
    team_skill_coverage,
)


def person(skills=None, domains=None, role="", experience="Intermediate"):
    return SimpleNamespace(
        skills=skills or [],
        domains=domains or [],
        preferred_role=role,
        experience_level=experience,
    )


def test_categorize_skills_maps_known_keywords():
    cats = categorize_skills(["Python", "React", "Figma"])
    assert "backend" in cats
    assert "frontend" in cats
    assert "design" in cats


def test_categorize_skills_ignores_unknown_terms():
    cats = categorize_skills(["Underwater Basket Weaving"])
    assert cats == set()


def test_pairwise_complementarity_is_higher_for_disjoint_skillsets():
    a = person(skills=["Python", "Machine Learning"], domains=["Healthcare"])
    b = person(skills=["React", "Figma"], domains=["Healthcare"])
    c = person(skills=["Python", "Machine Learning"], domains=["Healthcare"])

    complementary_score = pairwise_complementarity(a, b)
    overlapping_score = pairwise_complementarity(a, c)

    assert complementary_score > overlapping_score


def test_pairwise_complementarity_rewards_shared_domain():
    a = person(skills=["Python"], domains=["Healthcare"])
    b_same_domain = person(skills=["React"], domains=["Healthcare"])
    b_diff_domain = person(skills=["React"], domains=["FinTech"])

    assert pairwise_complementarity(a, b_same_domain) > pairwise_complementarity(a, b_diff_domain)


def test_pairwise_complementarity_is_bounded():
    a = person(skills=["Python"], domains=["Healthcare"])
    b = person(skills=["React"], domains=["FinTech"])
    score = pairwise_complementarity(a, b)
    assert 0.0 <= score <= 1.0


def test_team_skill_coverage_full_team_covers_more_categories():
    members = [
        person(skills=["Python", "FastAPI"]),
        person(skills=["React", "CSS"]),
        person(skills=["Machine Learning", "PyTorch"]),
        person(skills=["Figma", "UI/UX"]),
    ]
    coverage = team_skill_coverage(members)
    assert coverage > 0
    assert coverage <= 1.0


def test_team_skill_coverage_is_fraction_of_all_categories():
    members = [person(skills=["Python"])]
    coverage = team_skill_coverage(members)
    assert coverage == 1 / len(CORE_CATEGORIES)


def test_experience_balance_penalizes_uniform_levels():
    uniform = [person(experience="Beginner"), person(experience="Beginner")]
    mixed = [person(experience="Beginner"), person(experience="Advanced")]
    assert experience_balance(mixed) > experience_balance(uniform)


def test_role_diversity_rewards_distinct_roles():
    distinct = [person(role="Frontend"), person(role="Backend")]
    duplicate = [person(role="Frontend"), person(role="Frontend")]
    assert role_diversity(distinct) > role_diversity(duplicate)


def test_role_diversity_handles_no_roles_gracefully():
    members = [person(role=""), person(role="")]
    assert role_diversity(members) == 0.5
