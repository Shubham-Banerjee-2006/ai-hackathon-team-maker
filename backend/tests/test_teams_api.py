"""Integration tests for the /api/teams and /api/find-teammates endpoints."""
from .conftest import SAMPLE_PARTICIPANTS


def register_all(client):
    ids = []
    for p in SAMPLE_PARTICIPANTS:
        res = client.post("/api/participants", json=p)
        ids.append(res.json()["id"])
    return ids


def test_generate_requires_admin_key(client):
    register_all(client)
    res = client.post("/api/teams/generate", json={"team_size": 4})
    assert res.status_code == 401


def test_generate_teams_success(client, admin_headers):
    register_all(client)
    res = client.post("/api/teams/generate", json={"team_size": 4}, headers=admin_headers)
    assert res.status_code == 200
    teams = res.json()
    assert len(teams) == 1
    team = teams[0]
    assert len(team["members"]) == 4
    assert 0.0 <= team["skill_coverage_score"] <= 1.0
    assert 0.0 <= team["compatibility_score"] <= 1.0
    assert team["explanation"]
    assert team["suggested_project"]


def test_generate_teams_insufficient_participants(client, admin_headers):
    client.post("/api/participants", json=SAMPLE_PARTICIPANTS[0])
    res = client.post("/api/teams/generate", json={"team_size": 4}, headers=admin_headers)
    assert res.status_code == 400


def test_list_teams_after_generation(client, admin_headers):
    register_all(client)
    client.post("/api/teams/generate", json={"team_size": 4}, headers=admin_headers)
    res = client.get("/api/teams")
    assert res.status_code == 200
    assert len(res.json()) == 1


def test_regenerate_clears_previous_teams(client, admin_headers):
    register_all(client)
    client.post("/api/teams/generate", json={"team_size": 4}, headers=admin_headers)
    client.post("/api/teams/generate", json={"team_size": 2}, headers=admin_headers)
    res = client.get("/api/teams")
    teams = res.json()
    assert sum(len(t["members"]) for t in teams) == 4
    assert all(len(t["members"]) == 2 for t in teams)


def test_get_missing_team_404s(client):
    res = client.get("/api/teams/9999")
    assert res.status_code == 404


def test_teams_export_csv(client, admin_headers):
    register_all(client)
    client.post("/api/teams/generate", json={"team_size": 4}, headers=admin_headers)
    res = client.get("/api/teams/export.csv")
    assert res.status_code == 200
    assert res.headers["content-type"].startswith("text/csv")


def test_find_teammates_ranks_and_explains(client):
    ids = register_all(client)
    ada_id = ids[0]
    res = client.get(f"/api/find-teammates/{ada_id}", params={"top_n": 3})
    assert res.status_code == 200
    matches = res.json()
    assert len(matches) == 3
    assert all("reason" in m and m["reason"] for m in matches)
    scores = [m["compatibility_score"] for m in matches]
    assert scores == sorted(scores, reverse=True)


def test_find_teammates_missing_participant_404s(client):
    res = client.get("/api/find-teammates/9999")
    assert res.status_code == 404


def test_find_teammates_alone_returns_empty(client):
    created = client.post("/api/participants", json=SAMPLE_PARTICIPANTS[0]).json()
    res = client.get(f"/api/find-teammates/{created['id']}")
    assert res.status_code == 200
    assert res.json() == []
