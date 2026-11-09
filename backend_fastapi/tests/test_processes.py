"""Test Business Processes and Assets (FR-03, FR-04)."""

def test_list_processes(auth_client):
    res = auth_client.get("/api/v1/processes/")
    assert res.status_code == 200
    data = res.json()
    assert "results" in data
    assert len(data["results"]) >= 2
    names = [p["name"] for p in data["results"]]
    assert "Online ta'lim platformasi" in names


def test_create_process(auth_client):
    payload = {
        "name": "Imtihonlarni monitoring qilish",
        "criticality": "HIGH",
        "service": 1,
        "description": "Sinov jarayoni",
    }
    res = auth_client.post("/api/v1/processes/", json=payload)
    assert res.status_code == 201
    data = res.json()
    assert data["name"] == "Imtihonlarni monitoring qilish"
    assert data["criticality"] == "HIGH"


def test_list_assets(auth_client):
    res = auth_client.get("/api/v1/assets/")
    assert res.status_code == 200
    data = res.json()
    assert "results" in data
    assert len(data["results"]) >= 2


def test_list_dependencies(auth_client):
    res = auth_client.get("/api/v1/dependencies/")
    assert res.status_code == 200
    data = res.json()
    assert "results" in data
    assert len(data["results"]) >= 1
