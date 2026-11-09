"""Test BIA assessment and domain invariants (FR-05)."""

def test_list_bia(auth_client):
    res = auth_client.get("/api/v1/bia/")
    assert res.status_code == 200
    data = res.json()
    assert "results" in data
    assert len(data["results"]) >= 1


def test_create_bia_valid(auth_client):
    payload = {
        "process": 2,
        "mtpd_hours": 12.0,
        "rto_hours": 6.0,
        "rpo_minutes": 60,
        "backup_interval_minutes": 120,
    }
    res = auth_client.post("/api/v1/bia/", json=payload)
    assert res.status_code == 201
    data = res.json()
    assert data["has_rpo_gap"] is True  # 120 > 60


def test_create_bia_rto_greater_than_mtpd_fails(auth_client):
    """Domain Invariant: RTO must be <= MTPD."""
    payload = {
        "process": 2,
        "mtpd_hours": 4.0,
        "rto_hours": 8.0,  # 8 > 4 -> MUST FAIL with 400
        "rpo_minutes": 60,
        "backup_interval_minutes": 60,
    }
    res = auth_client.post("/api/v1/bia/", json=payload)
    assert res.status_code == 400


def test_approve_bia_permission(auth_client, approver_client):
    # BCMS_MANAGER cannot approve (requires ADMIN or APPROVER)
    res_forbidden = auth_client.post("/api/v1/bia/1/approve/")
    assert res_forbidden.status_code == 403

    # APPROVER can approve
    res_ok = approver_client.post("/api/v1/bia/1/approve/")
    assert res_ok.status_code == 200
    assert res_ok.json()["status"] == "APPROVED"
