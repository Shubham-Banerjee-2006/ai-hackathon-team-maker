"""Integration tests for the /api/participants endpoints."""
from .conftest import SAMPLE_PARTICIPANTS


def register_all(client):
    for p in SAMPLE_PARTICIPANTS:
        res = client.post("/api/participants", json=p)
        assert res.status_code == 201, res.text
    return client


def test_health_check(client):
    res = client.get("/api/health")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"


def test_create_participant_success(client):
    res = client.post("/api/participants", json=SAMPLE_PARTICIPANTS[0])
    assert res.status_code == 201
    body = res.json()
    assert body["name"] == "Ada Lovelace"
    assert "Python" in body["skills"]
    assert body["team_id"] is None


def test_create_participant_duplicate_email_rejected(client):
    client.post("/api/participants", json=SAMPLE_PARTICIPANTS[0])
    res = client.post("/api/participants", json=SAMPLE_PARTICIPANTS[0])
    assert res.status_code == 400
    assert "already exists" in res.json()["error"]["detail"]


def test_create_participant_invalid_email_rejected(client):
    payload = dict(SAMPLE_PARTICIPANTS[0], email="not-an-email")
    res = client.post("/api/participants", json=payload)
    assert res.status_code == 422


def test_list_participants(client):
    register_all(client)
    res = client.get("/api/participants")
    assert res.status_code == 200
    assert len(res.json()) == 4


def test_search_filters_by_name(client):
    register_all(client)
    res = client.get("/api/participants", params={"search": "Ada"})
    names = [p["name"] for p in res.json()]
    assert names == ["Ada Lovelace"]


def test_filter_by_skill(client):
    register_all(client)
    res = client.get("/api/participants", params={"skill": "React"})
    names = [p["name"] for p in res.json()]
    assert names == ["Grace Hopper"]


def test_filter_by_role(client):
    register_all(client)
    res = client.get("/api/participants", params={"role": "PM"})
    names = [p["name"] for p in res.json()]
    assert names == ["Katherine Johnson"]


def test_get_single_participant(client):
    created = client.post("/api/participants", json=SAMPLE_PARTICIPANTS[0]).json()
    res = client.get(f"/api/participants/{created['id']}")
    assert res.status_code == 200
    assert res.json()["email"] == "ada@example.com"


def test_get_missing_participant_404s(client):
    res = client.get("/api/participants/9999")
    assert res.status_code == 404


def test_delete_requires_admin_key_when_configured(client):
    created = client.post("/api/participants", json=SAMPLE_PARTICIPANTS[0]).json()
    res = client.delete(f"/api/participants/{created['id']}")
    assert res.status_code == 401


def test_delete_with_valid_admin_key_succeeds(client, admin_headers):
    created = client.post("/api/participants", json=SAMPLE_PARTICIPANTS[0]).json()
    res = client.delete(f"/api/participants/{created['id']}", headers=admin_headers)
    assert res.status_code == 200
    assert client.get(f"/api/participants/{created['id']}").status_code == 404


def test_export_csv(client):
    register_all(client)
    res = client.get("/api/participants/export.csv")
    assert res.status_code == 200
    assert res.headers["content-type"].startswith("text/csv")
    assert "Ada Lovelace" in res.text
