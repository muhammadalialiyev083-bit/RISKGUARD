"""Test calculation engine: risk evaluation, priority scores (FR-07, FR-08)."""

def test_evaluate_risk_algo_high_risk(auth_client):
    payload = {
        "process_id": 1,
        "likelihood": 4,
        "impact": 5,
        "rto_hours": 4.0,
        "rpo_minutes": 60,
        "backup_interval_minutes": 180,  # 180 > 60 -> RPO gap
    }
    res = auth_client.post("/api/v1/analyses/evaluate-risk", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["risk_score"] == 20
    assert data["risk_class"] == "high"
    assert data["rpo_gap"] is True
    assert len(data["observations"]) > 0


def test_evaluate_risk_algo_low_risk(auth_client):
    payload = {
        "process_id": 1,
        "likelihood": 2,
        "impact": 2,
        "rto_hours": 2.0,
        "rpo_minutes": 60,
        "backup_interval_minutes": 30,  # 30 < 60 -> No gap
    }
    res = auth_client.post("/api/v1/analyses/evaluate-risk", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["risk_score"] == 4
    assert data["risk_class"] == "low"
    assert data["rpo_gap"] is False


def test_priority_analysis(auth_client):
    res = auth_client.post("/api/v1/analyses/priority", json={})
    assert res.status_code == 200
    data = res.json()
    assert "ranked_processes" in data
    assert len(data["ranked_processes"]) >= 2
    # Verify score is between 0 and 1
    for p in data["ranked_processes"]:
        assert 0.0 <= p["priority_score"] <= 1.0
        assert "operands" in p
