"""Test authentication and session endpoints (FR-01)."""

def test_login_success(client):
    res = client.post("/api/v1/auth/login", json={"username": "bcms_manager", "password": "Admin123!"})
    assert res.status_code == 200
    data = res.json()
    assert "user" in data
    assert data["user"]["username"] == "bcms_manager"
    assert data["user"]["role"] == "BCMS_MANAGER"


def test_login_invalid_password_fails(client):
    res = client.post("/api/v1/auth/login", json={"username": "bcms_manager", "password": "WrongPassword"})
    assert res.status_code == 401


def test_login_nonexistent_user_fails(client):
    res = client.post("/api/v1/auth/login", json={"username": "unknown_user", "password": "Password123!"})
    assert res.status_code == 401


def test_me_authenticated(auth_client):
    res = auth_client.get("/api/v1/auth/me")
    assert res.status_code == 200
    data = res.json()
    assert data["username"] == "bcms_manager"
    assert "organization_detail" in data


def test_me_unauthenticated_fails(client):
    res = client.get("/api/v1/auth/me")
    assert res.status_code == 401


def test_logout(auth_client):
    res = auth_client.post("/api/v1/auth/logout")
    assert res.status_code == 200
    # Next call without session fails
    res2 = auth_client.get("/api/v1/auth/me")
    assert res2.status_code == 401
