"""Test Risk register and calculations (FR-06)."""

def test_list_risks(auth_client):
    res = auth_client.get("/api/v1/risks/")
    assert res.status_code == 200
    data = res.json()
    assert "results" in data
    assert len(data["results"]) >= 1
    # Check score calculation: 3 * 5 = 15
    first_risk = data["results"][0]
    assert first_risk["risk_score"] == 15
    assert first_risk["risk_class"] == "high"


def test_create_risk_valid(auth_client):
    payload = {
        "process": 1,
        "threat": "Dasturiy xatolik",
        "likelihood": 2,
        "impact": 3,
    }
    res = auth_client.post("/api/v1/risks/", json=payload)
    assert res.status_code == 201
    data = res.json()
    assert data["risk_score"] == 6  # 2 * 3
    assert data["risk_class"] == "low"


def test_create_risk_invalid_range_fails(auth_client):
    # Likelihood > 5 must fail with 400
    payload = {
        "process": 1,
        "threat": "Noto'g'ri qiymat",
        "likelihood": 10,
        "impact": 3,
    }
    res = auth_client.post("/api/v1/risks/", json=payload)
    assert res.status_code == 400
