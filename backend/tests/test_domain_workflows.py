import csv
import io
import pytest
from rest_framework.test import APIClient
from apps.authentication.models import User
from apps.organizations.models import Organization, Service
from apps.processes.models import BusinessProcess, Asset
from apps.bia.models import BIAAssessment
from apps.plans.models import ContinuityPlan
from apps.core.models import AuditLog


@pytest.fixture
def domain(db):
    org = Organization.objects.create(name='UzHi workflow', sector='IT')
    foreign = Organization.objects.create(name='Other workflow', sector='IT')
    admin = User.objects.create_user(username='workflow-admin', password='Strong!Pass123', organization=org, role='ADMIN')
    outsider = User.objects.create_user(username='outsider', organization=foreign)
    service = Service.objects.create(name='Ta’lim', organization=org)
    process = BusinessProcess.objects.create(name='Ta’lim jarayoni', organization=org, service=service)
    other_service = Service.objects.create(name='Secret service', organization=foreign)
    other_process = BusinessProcess.objects.create(name='Secret process', organization=foreign, service=other_service)
    asset = Asset.objects.create(name='Server', organization=org, type='SERVER')
    other_asset = Asset.objects.create(name='Secret server', organization=foreign, type='SERVER')
    client = APIClient()
    client.force_authenticate(admin)
    return locals()


@pytest.mark.django_db
def test_related_foreign_tenant_records_rejected(domain):
    c, p = domain['client'], domain['process']
    assert c.post('/api/v1/processes/', {'name': 'Attack', 'service': domain['other_service'].pk}, format='json').status_code == 400
    assert c.patch(f'/api/v1/processes/{p.pk}/', {'owner': domain['outsider'].pk}, format='json').status_code == 400
    assert c.post('/api/v1/risks/', {'process': domain['other_process'].pk, 'threat': 'Attack', 'likelihood': 3, 'impact': 4}, format='json').status_code == 400
    assert c.get(f'/api/v1/processes/{domain["other_process"].pk}/').status_code == 404


@pytest.mark.django_db
def test_dependency_and_scenario_validate_tenant_ids(domain):
    c = domain['client']
    payload = {'from_type': 'PROCESS', 'from_id': domain['process'].pk, 'to_type': 'ASSET', 'to_id': domain['other_asset'].pk}
    assert c.post('/api/v1/dependencies/', payload, format='json').status_code == 400
    payload['to_id'] = domain['asset'].pk
    assert c.post('/api/v1/dependencies/', payload, format='json').status_code == 201
    assert c.post('/api/v1/scenarios/', {'title': 'Attack', 'disrupted_asset_ids': [domain['other_asset'].pk]}, format='json').status_code == 400


@pytest.mark.django_db
def test_bia_nested_update_submit_approval_cannot_be_spoofed(domain):
    c = domain['client']
    payload = {'process': domain['process'].pk, 'mtpd_hours': 8, 'rto_hours': 2,
               'impacts': [{'horizon_hours': 2, 'financial_loss': 20, 'operational_score': 4}]}
    response = c.post('/api/v1/bia/', payload, format='json')
    assert response.status_code == 201, response.data
    url = f'/api/v1/bia/{response.data["id"]}/'
    assert c.patch(url, {'status': 'APPROVED'}, format='json').status_code == 400
    response = c.patch(url, {'impacts': [{'horizon_hours': 4, 'financial_loss': 40}]}, format='json')
    assert response.status_code == 200, response.data
    assert len(response.data['impacts']) == 1
    assert c.post(url + 'submit/').data['status'] == 'SUBMITTED'
    assert c.post(url + 'approve/').status_code == 200
    assert c.patch(url, {'rto_hours': 1}, format='json').status_code == 400
    assert c.patch(url, {'status': 'DRAFT', 'rto_hours': 1}, format='json').status_code == 200
    assert BIAAssessment.objects.get(pk=response.data['id']).approved_by_id is None


@pytest.mark.django_db
def test_plan_nested_steps_tenant_approval_and_pdf(domain):
    c = domain['client']
    payload = {'process': domain['process'].pk, 'title': 'O‘zbekcha tiklanish',
               'steps': [{'sequence': 1, 'title': 'Bog‘lanishni tiklash', 'assigned_to': domain['admin'].pk}]}
    response = c.post('/api/v1/plans/', payload, format='json')
    assert response.status_code == 201, response.data
    url = f'/api/v1/plans/{response.data["id"]}/'
    assert len(response.data['steps']) == 1
    assert c.patch(url, {'steps': [{'title': 'Foreign owner', 'assigned_to': domain['outsider'].pk}]}, format='json').status_code == 400
    assert c.patch(url, {'status': 'PUBLISHED'}, format='json').status_code == 400
    assert c.post(url + 'submit/').data['status'] == 'IN_REVIEW'
    assert c.post(url + 'publish/').status_code == 200
    pdf = c.get(url + 'export_pdf/')
    assert pdf.status_code == 200 and pdf.content.startswith(b'%PDF-')
    assert b'/FontFile2' in pdf.content  # Embedded Unicode font, not Helvetica fallback.
    assert AuditLog.objects.filter(entity='ContinuityPlan', action='EXPORT').exists()


@pytest.mark.django_db
def test_controls_safe_update_delete_audited(domain):
    c = domain['client']
    risk = c.post('/api/v1/risks/', {'process': domain['process'].pk, 'threat': 'Uzilish', 'likelihood': 4, 'impact': 5}, format='json')
    assert risk.status_code == 201, risk.data
    control = c.post('/api/v1/controls/', {'risk': risk.data['id'], 'title': 'Replika'}, format='json')
    assert control.status_code == 201, control.data
    url = f'/api/v1/controls/{control.data["id"]}/'
    assert c.patch(url, {'status': 'IMPLEMENTED'}, format='json').status_code == 200
    assert c.delete(url).status_code == 204
    assert set(AuditLog.objects.filter(entity='Control').values_list('action', flat=True)) == {'CREATE', 'UPDATE', 'DELETE'}


@pytest.mark.django_db
def test_dashboard_filtered_csv_and_audit_filter(domain):
    c = domain['client']
    report = c.get('/api/v1/reports/organization')
    assert report.status_code == 200
    assert report.data['summary']['total_processes'] == 1
    assert report.data['criticality_distribution'] == {'HIGH': 1}
    response = c.get('/api/v1/reports/organization?format=csv')
    assert response.status_code == 200
    rows = list(csv.reader(io.StringIO(response.content.decode('utf-8-sig'))))
    assert ['Ta’lim jarayoni', 'HIGH', 'ACTIVE'] in rows
    assert 'Secret process' not in response.content.decode()
    audit = c.get('/api/v1/audit-logs/?action=EXPORT&entity=OrganizationReport')
    assert audit.data['count'] == 1
    assert c.get('/api/v1/reports/organization?from=not-date').status_code == 400


@pytest.mark.django_db
def test_consolidated_report_pdf_preserves_unicode_and_filters(domain):
    c = domain['client']
    response = c.get('/api/v1/reports/organization?export=pdf')
    assert response.status_code == 200
    assert response['Content-Type'] == 'application/pdf'
    assert response.content.startswith(b'%PDF-')
    assert b'/FontFile2' in response.content
    assert b'Uzluksiz Himoya' in response.content
    assert b'Secret process' not in response.content
    assert AuditLog.objects.filter(entity='OrganizationReport', action='EXPORT', after_state__export_type='PDF').count() == 1
    empty = c.get('/api/v1/reports/organization?export=pdf&from=2099-01-01')
    assert empty.status_code == 200
    assert b'2099-01-01' in empty.content
    assert c.get('/api/v1/reports/organization?export=pdf&from=2026-02-31').status_code == 400


@pytest.mark.django_db
def test_numeric_algorithm_input_errors_and_auditor_readonly(domain):
    c = domain['client']
    for payload in ({'likelihood': 9}, {'impact': 'text'}, {'rpo_minutes': -1}):
        assert c.post('/api/v1/analyses/evaluate-risk', payload, format='json').status_code == 400
    assert c.post('/api/v1/analyses/priority', {'process_id': 'text'}, format='json').status_code == 400
    assert c.post('/api/v1/risks/', {'process': domain['process'].pk, 'threat': 'Invalid', 'likelihood': 0, 'impact': 3}, format='json').status_code == 400
    auditor = User.objects.create_user(username='domain-auditor', organization=domain['org'], role='AUDITOR')
    c.force_authenticate(auditor)
    assert c.post('/api/v1/processes/', {'name': 'Forbidden'}, format='json').status_code == 403
    assert c.post('/api/v1/analyses/evaluate-risk', {}, format='json').status_code == 403


@pytest.mark.django_db
def test_saved_simulation_prevents_destructive_scenario_delete(domain):
    from apps.operations.models import SimulationRun
    from apps.simulation.models import Scenario
    c = domain['client']
    scenario = Scenario.objects.create(organization=domain['org'], title='Historical run',
                                       disrupted_asset_ids=[domain['asset'].pk])
    run = SimulationRun.objects.create(organization=domain['org'], scenario=scenario,
                                       created_by=domain['admin'], result={'historical': True})
    response = c.delete(f'/api/v1/scenarios/{scenario.pk}/')
    assert response.status_code == 400
    assert 'tarix' in response.data['detail']
    assert Scenario.objects.filter(pk=scenario.pk).exists()
    assert SimulationRun.objects.get(pk=run.pk).result == {'historical': True}
    assert not AuditLog.objects.filter(entity='Scenario', entity_id=str(scenario.pk), action='DELETE').exists()
