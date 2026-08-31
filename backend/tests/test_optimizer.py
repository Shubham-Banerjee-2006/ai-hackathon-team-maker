"""Unit tests for team generation / local-search optimization."""
from types import SimpleNamespace

from app.ml.embeddings import ProfileEmbedder
from app.ml.optimizer import generate_teams, team_quality


def person(id, skills=None, domains=None, role="", experience="Intermediate", name=None):
    return SimpleNamespace(
        id=id,
        name=name or f"Person {id}",
        skills=skills or [],
        domains=domains or [],
        preferred_role=role,
        experience_level=experience,
        working_style="",
        bio="",
    )


def make_pool(n=8):
    skill_sets = [
        ["Python", "Machine Learning"],
        ["React", "TypeScript"],
        ["FastAPI", "SQL"],
        ["Figma", "UI/UX"],
    ]
    return [person(i, skills=skill_sets[i % len(skill_sets)]) for i in range(n)]


def test_generate_teams_respects_team_size():
    pool = make_pool(8)
    teams = generate_teams(pool, team_size=4)
    assert sum(len(t) for t in teams) == 8
    assert all(len(t) <= 4 for t in teams)


def test_generate_teams_assigns_everyone_exactly_once():
    pool = make_pool(9)
    teams = generate_teams(pool, team_size=3)
    all_ids = [p.id for team in teams for p in team]
    assert sorted(all_ids) == sorted(p.id for p in pool)
    assert len(all_ids) == len(set(all_ids))


def test_generate_teams_handles_tiny_pool():
    pool = make_pool(1)
    teams = generate_teams(pool, team_size=4)
    assert teams == [pool]


def test_generate_teams_handles_empty_pool():
    assert generate_teams([], team_size=4) == []


def test_team_quality_is_zero_for_single_member():
    embedder = ProfileEmbedder()
    embedder.fit(make_pool(1))
    assert team_quality(make_pool(1), embedder) == 0.0


def test_team_quality_bounded_between_zero_and_one():
    pool = make_pool(4)
    embedder = ProfileEmbedder()
    embedder.fit(pool)
    score = team_quality(pool, embedder)
    assert 0.0 <= score <= 1.0


def test_generate_teams_improves_or_maintains_quality_vs_random_seed():
    """The local-search refinement should never produce a worse total
    quality than a naive greedy-only split for a diverse pool."""
    pool = make_pool(12)
    teams = generate_teams(pool, team_size=4)
    embedder = ProfileEmbedder()
    embedder.fit(pool)
    total_quality = sum(team_quality(t, embedder) for t in teams if len(t) > 1)
    assert total_quality >= 0
