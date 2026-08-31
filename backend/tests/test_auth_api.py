"""Integration tests for the /api/auth (admin login) and /api/admin
(dashboard) endpoints."""
from .conftest import SAMPLE_PARTICIPANTS


def test_login_success(client):
    res = client.post("/api/auth/login", json={"username": "admin", "password": "test-admin-password"})
    assert res.status_code == 200
    body = res.json()
    assert body["access_token"]
    assert body["admin"]["username"] == "admin"
    assert body["admin"]["role"] == "superadmin"


def test_login_wrong_password_rejected(client):
    res = client.post("/api/auth/login", json={"username": "admin", "password": "wrong"})
    assert res.status_code == 401


def test_login_unknown_user_rejected(client):
    res = client.post("/api/auth/login", json={"username": "nobody", "password": "x"})
    assert res.status_code == 401


def test_protected_route_requires_token(client):
    res = client.delete("/api/participants/1")
    assert res.status_code == 401


def test_protected_route_rejects_garbage_token(client):
    res = client.delete("/api/participants/1", headers={"Authorization": "Bearer not-a-real-token"})
    assert res.status_code == 401


def test_me_returns_current_admin(client, admin_headers):
    res = client.get("/api/auth/me", headers=admin_headers)
    assert res.status_code == 200
    assert res.json()["username"] == "admin"


def test_change_password_then_login_with_new_password(client, admin_headers):
    res = client.post(
        "/api/auth/change-password",
        json={"current_password": "test-admin-password", "new_password": "brand-new-pass"},
        headers=admin_headers,
    )
    assert res.status_code == 200

    old = client.post("/api/auth/login", json={"username": "admin", "password": "test-admin-password"})
    assert old.status_code == 401

    fresh = client.post("/api/auth/login", json={"username": "admin", "password": "brand-new-pass"})
    assert fresh.status_code == 200


def test_superadmin_can_create_and_list_admins(client, admin_headers):
    res = client.post(
        "/api/auth/admins",
        json={"username": "organizer2", "password": "organizer-pass", "role": "admin"},
        headers=admin_headers,
    )
    assert res.status_code == 201
    assert res.json()["role"] == "admin"

    listed = client.get("/api/auth/admins", headers=admin_headers)
    usernames = [a["username"] for a in listed.json()]
    assert "organizer2" in usernames


def test_plain_admin_cannot_manage_admins(client, admin_headers):
    client.post(
        "/api/auth/admins",
        json={"username": "organizer3", "password": "organizer-pass", "role": "admin"},
        headers=admin_headers,
    )
    login = client.post("/api/auth/login", json={"username": "organizer3", "password": "organizer-pass"})
    organizer_headers = {"Authorization": f"Bearer {login.json()['access_token']}"}

    res = client.get("/api/auth/admins", headers=organizer_headers)
    assert res.status_code == 403

    # But a plain admin *can* still delete participants / generate teams.
    created = client.post("/api/participants", json=SAMPLE_PARTICIPANTS[0]).json()
    res = client.delete(f"/api/participants/{created['id']}", headers=organizer_headers)
    assert res.status_code == 200


def test_cannot_delete_last_superadmin(client, admin_headers):
    me = client.get("/api/auth/me", headers=admin_headers).json()
    res = client.delete(f"/api/auth/admins/{me['id']}", headers=admin_headers)
    assert res.status_code == 400


def test_admin_stats_endpoint(client, admin_headers):
    for p in SAMPLE_PARTICIPANTS:
        client.post("/api/participants", json=p)
    res = client.get("/api/admin/stats", headers=admin_headers)
    assert res.status_code == 200
    body = res.json()
    assert body["total_participants"] == 4
    assert body["total_teams"] == 0


def test_admin_reset_teams(client, admin_headers):
    for p in SAMPLE_PARTICIPANTS:
        client.post("/api/participants", json=p)
    client.post("/api/teams/generate", json={"team_size": 4}, headers=admin_headers)
    res = client.post("/api/admin/teams/reset", headers=admin_headers)
    assert res.status_code == 200
    assert res.json()["teams_cleared"] == 1
    assert client.get("/api/teams").json() == []


def test_audit_log_records_actions(client, admin_headers):
    created = client.post("/api/participants", json=SAMPLE_PARTICIPANTS[0]).json()
    client.delete(f"/api/participants/{created['id']}", headers=admin_headers)
    res = client.get("/api/admin/audit-log", headers=admin_headers)
    assert res.status_code == 200
    actions = [entry["action"] for entry in res.json()]
    assert "participant.delete" in actions
    assert "auth.login" in actions
