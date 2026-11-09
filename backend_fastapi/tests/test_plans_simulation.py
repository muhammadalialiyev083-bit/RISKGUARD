"""Test plans, simulation, reports, and export (FR-09, FR-10, FR-11, FR-12)."""

def test_list_plans_and_export(auth_client, approver_client):
    res = auth_client.get("/api/v1/plans/")
    assert res.status_code == 200
    data = res.json()
    assert len(data["results"]) >= 1

    # Publish plan
    res_pub = approver_client.post("/api/v1/plans/1/publish/")
    assert res_pub.status_code == 200
    assert res_pub.json()["status"] == "PUBLISHED"

    # Export PDF
    res_pdf = auth_client.get("/api/v1/plans/1/export_pdf/")
    assert res_pdf.status_code == 200
    assert res_pdf.headers["content-type"] == "application/pdf"
    assert len(res_pdf.content) > 100

    # Export Excel
    res_xlsx = auth_client.get("/api/v1/plans/1/export_excel/")
    assert res_xlsx.status_code == 200
    assert "openxmlformats" in res_xlsx.headers["content-type"]
    assert len(res_xlsx.content) > 100


def test_simulation(auth_client):
    res = auth_client.post("/api/v1/scenarios/1/simulate/")
    assert res.status_code == 200
    data = res.json()
    assert "affected_processes" in data
    assert data["scenario_id"] == 1


def test_dashboard_report_and_excel(auth_client):
    res = auth_client.get("/api/v1/reports/organization")
    assert res.status_code == 200
    data = res.json()
    assert "summary" in data
    assert data["summary"]["total_processes"] >= 2

    # Export Organization Excel Report
    res_excel = auth_client.get("/api/v1/reports/organization/export_excel")
    assert res_excel.status_code == 200
    assert "openxmlformats" in res_excel.headers["content-type"]
    assert len(res_excel.content) > 100


def test_audit_logs(auth_client):
    res = auth_client.get("/api/v1/audit-logs/")
    assert res.status_code == 200
    data = res.json()
    assert "results" in data
    assert len(data["results"]) > 0
