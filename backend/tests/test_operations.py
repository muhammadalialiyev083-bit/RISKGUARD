"""Tenant isolation and full provider → simulation → improvement/incident workflows."""
import pytest
from django.urls import reverse
from rest_framework.test import APIClient
from apps.authentication.models import User
from apps.organizations.models import Organization, Service
from apps.processes.models import Asset, BusinessProcess, Dependency
from apps.operations.models import Provider, Incident, ImprovementTask, SimulationRun, IncidentEvent
from apps.core.models import AuditLog


@pytest.fixture
def setup_ops(db):
    org = Organization.objects.create(name='UzHi tashkiloti', sector='Ta’lim')
    other_org = Organization.objects.create(name='Boshqa tashkilot', sector='Bank')
    manager = User.objects.create_user(username='ops_manager', password='SecureTesting123!', role='BCMS_MANAGER', organization=org)
    auditor = User.objects.create_user(username='ops_auditor', role='AUDITOR', organization=org)
    owner = User.objects.create_user(username='ops_owner', role='PROCESS_OWNER', organization=org)
    other = User.objects.create_user(username='ops_other', role='ADMIN', organization=other_org)
    service = Service.objects.create(organization=org, name='Asosiy xizmat')
    asset = Asset.objects.create(organization=org, name='Asosiy server', type='SERVER')
    process = BusinessProcess.objects.create(organization=org, service=service, name='Muhim jarayon')
    Dependency.objects.create(organization=org, from_type='PROCESS', from_id=process.pk, to_type='ASSET', to_id=asset.pk)
    client = APIClient()
    client.force_authenticate(manager)
    return dict(org=org, other_org=other_org, manager=manager, auditor=auditor, owner=owner,
                other=other, service=service, asset=asset, process=process, client=client)


@pytest.mark.django_db
def test_provider_disruption_saved_simulation_improvement_and_audit(setup_ops):
    s = setup_ops
    c = s['client']
    created = c.post(reverse('provider-list'), {'name': 'Internet hamkori', 'assets': [s['asset'].pk],
                     'services': [s['service'].pk], 'risk_rating': 'HIGH', 'next_review_date': '2027-02-01'}, format='json')
    assert created.status_code == 201, created.data
    provider_id = created.data['id']
    simulated = c.post(reverse('provider-disruption', args=[provider_id]),
                        {'title': 'Internet uzilishi', 'estimated_outage_hours': 30}, format='json')
    assert simulated.status_code == 201, simulated.data
    assert simulated.data['result']['affected_processes_count'] == 1
    assert simulated.data['result']['rto_breaches_count'] == 1
    run_id = simulated.data['id']
    assert SimulationRun.objects.get(pk=run_id).result == simulated.data['result']
    task = c.post(reverse('simulation-run-improvements', args=[run_id]),
                  {'title': 'Zaxira kanal tayyorlash', 'owner': s['owner'].pk, 'process': s['process'].pk}, format='json')
    assert task.status_code == 201, task.data
    assert task.data['simulation_run'] == run_id
    assert task.data['scenario'] == simulated.data['scenario']
    assert c.get(reverse('simulation-run-detail', args=[run_id])).data['result']['affected_processes_count'] == 1
    assert AuditLog.objects.filter(entity='Provider', entity_id=provider_id, action='CREATE').exists()
    assert AuditLog.objects.filter(entity='ImprovementTask', entity_id=task.data['id'], action='CREATE').exists()


@pytest.mark.django_db
def test_incident_tasks_owner_progress_closure_and_immutable_timeline(setup_ops):
    s = setup_ops
    c = s['client']
    response = c.post(reverse('incident-list'), {'title': 'Server uzilishi', 'severity': 'CRITICAL',
                     'owner': s['manager'].pk, 'asset': s['asset'].pk}, format='json')
    assert response.status_code == 201, response.data
    incident_id = response.data['id']
    task = c.post(reverse('improvement-task-list'), {'title': 'Serverni tiklash', 'incident': incident_id,
                  'owner': s['owner'].pk}, format='json')
    assert task.status_code == 201, task.data
    incident_url = reverse('incident-detail', args=[incident_id])
    assert c.patch(incident_url, {'status': 'RESOLVED', 'conclusion': 'Tiklandi.'}, format='json').status_code == 400
    c.force_authenticate(s['owner'])
    task_url = reverse('improvement-task-detail', args=[task.data['id']])
    assert c.patch(task_url, {'owner': s['manager'].pk}, format='json').status_code == 403
    assert c.patch(task_url, {'status': 'DONE'}, format='json').status_code == 200
    c.force_authenticate(s['manager'])
    assert c.patch(incident_url, {'status': 'RESOLVED'}, format='json').status_code == 400
    closed = c.patch(incident_url, {'status': 'CLOSED', 'conclusion': 'Server tiklandi; zaxira kanal tekshirildi.'}, format='json')
    assert closed.status_code == 200, closed.data
    assert closed.data['resolved_at']
    note = c.post(reverse('incident-timeline', args=[incident_id]), {'message': 'Navbatchi tasdiqladi.'}, format='json')
    assert note.status_code == 201
    timeline = c.get(reverse('incident-timeline', args=[incident_id]))
    assert len(timeline.data) >= 5
    assert timeline.data[-1]['message'] == 'Navbatchi tasdiqladi.'
    event = IncidentEvent.objects.get(pk=note.data['id'])
    from django.core.exceptions import PermissionDenied
    with pytest.raises(PermissionDenied):
        event.delete()
    assert c.post(reverse('improvement-task-list'), {'title': 'Kech vazifa', 'incident': incident_id}, format='json').status_code == 400


@pytest.mark.django_db
def test_cross_tenant_object_foreign_keys_and_auditor_write_blocked(setup_ops):
    s = setup_ops
    c = s['client']
    foreign = Provider.objects.create(organization=s['other_org'], name='Begona provayder')
    incident = Incident.objects.create(organization=s['other_org'], title='Begona hodisa')
    assert c.get(reverse('provider-detail', args=[foreign.pk])).status_code == 404
    assert c.patch(reverse('incident-detail', args=[incident.pk]), {'title': 'Xato'}, format='json').status_code == 404
    assert c.post(reverse('provider-list'), {'name': 'Xato owner', 'owner': s['other'].pk}, format='json').status_code == 400
    assert c.post(reverse('incident-list'), {'title': 'Xato bog‘lanish', 'provider': foreign.pk}, format='json').status_code == 400
    assert c.post(reverse('improvement-task-list'), {'title': 'Xato bog‘lanish', 'incident': incident.pk}, format='json').status_code == 400
    assert c.get(reverse('provider-list')).data['results'] == []
    c.force_authenticate(s['auditor'])
    assert c.get(reverse('incident-list')).status_code == 200
    assert c.post(reverse('incident-list'), {'title': 'Auditor yozuvi'}, format='json').status_code == 403
    assert c.post(reverse('provider-list'), {'name': 'Auditor provayderi'}, format='json').status_code == 403
    assert c.post(reverse('simulation-run-list'), {}, format='json').status_code == 403


@pytest.mark.django_db
def test_missing_provider_assets_invalid_task_process_and_no_run_edit(setup_ops):
    s = setup_ops
    c = s['client']
    provider = Provider.objects.create(organization=s['org'], name='Hali bog‘lanmagan')
    result = c.post(reverse('provider-disruption', args=[provider.pk]), {'title': 'Uzilish', 'estimated_outage_hours': 2}, format='json')
    assert result.status_code == 400
    assert not SimulationRun.objects.exists()
    provider.assets.add(s['asset'])
    run = c.post(reverse('provider-disruption', args=[provider.pk]), {'title': 'Uzilish', 'estimated_outage_hours': 2}, format='json').data
    unrelated = BusinessProcess.objects.create(organization=s['org'], name='Bog‘liq emas', service=s['service'])
    assert c.post(reverse('simulation-run-improvements', args=[run['id']]),
                  {'title': 'Xato tavsiya', 'process': unrelated.pk}, format='json').status_code == 400
    assert c.patch(reverse('simulation-run-detail', args=[run['id']]), {'result': {}}, format='json').status_code == 405
    assert c.delete(reverse('simulation-run-detail', args=[run['id']])).status_code == 405


@pytest.mark.django_db
def test_existing_simulation_endpoint_persists_separate_snapshots(setup_ops):
    s = setup_ops
    c = s['client']
    from apps.simulation.models import Scenario
    scenario = Scenario.objects.create(organization=s['org'], title='Kaskad sinov',
                                       disrupted_asset_ids=[s['asset'].pk], estimated_outage_hours=30)
    endpoint = reverse('scenario-simulate', args=[scenario.pk])
    first = c.post(endpoint, {}, format='json')
    assert first.status_code == 200, first.data
    assert first.data['affected_processes_count'] == 1
    first_run = SimulationRun.objects.get(pk=first.data['simulation_run_id'])
    scenario.estimated_outage_hours = 1
    scenario.save()
    second = c.post(endpoint, {}, format='json')
    assert second.status_code == 200
    assert first.data['simulation_run_id'] != second.data['simulation_run_id']
    first_run.refresh_from_db()
    assert first_run.result['estimated_outage_hours'] == 30
    assert second.data['estimated_outage_hours'] == 1
    assert second.data['rto_breaches_count'] == 0
    c.force_authenticate(s['other'])
    assert c.get(reverse('simulation-run-detail', args=[first_run.pk])).status_code == 404


@pytest.mark.django_db
def test_process_owner_cannot_create_or_update_other_users_tasks(setup_ops):
    s = setup_ops
    task = ImprovementTask.objects.create(organization=s['org'], title='Menejer vazifasi', owner=s['manager'])
    c = s['client']
    c.force_authenticate(s['owner'])
    assert c.post(reverse('improvement-task-list'), {'title': 'Ruxsatsiz yaratish'}, format='json').status_code == 403
    assert c.patch(reverse('improvement-task-detail', args=[task.pk]), {'status': 'DONE'}, format='json').status_code == 403
    assert c.delete(reverse('improvement-task-detail', args=[task.pk])).status_code == 403
    assert c.post(reverse('incident-list'), {'title': 'Ruxsatsiz hodisa'}, format='json').status_code == 403
    assert c.post(reverse('provider-list'), {'name': 'Ruxsatsiz provayder'}, format='json').status_code == 403
    task.refresh_from_db()
    assert task.status == 'OPEN'


@pytest.mark.django_db
def test_incident_escalation_is_audited_and_rejects_closed_lower_or_unprivileged(setup_ops):
    s = setup_ops
    c = s['client']
    incident = Incident.objects.create(organization=s['org'], title='Kuchayayotgan uzilish', severity='LOW')
    endpoint = reverse('incident-escalate', args=[incident.pk])
    assert c.post(endpoint, {'severity': 'HIGH', 'reason': ''}, format='json').status_code == 400
    success = c.post(endpoint, {'severity': 'HIGH', 'reason': 'Qo‘shimcha xizmatlarga ta’sir aniqlandi.'}, format='json')
    assert success.status_code == 200, success.data
    assert success.data['incident']['severity'] == 'HIGH'
    assert success.data['event']['event'] == 'ESCALATE'
    audit = AuditLog.objects.get(entity='Incident', entity_id=incident.pk, action='UPDATE')
    assert audit.before_state['severity'] == 'LOW'
    assert audit.after_state['severity'] == 'HIGH'
    assert c.post(endpoint, {'severity': 'MEDIUM', 'reason': 'Pasaytirish'}, format='json').status_code == 400
    assert c.post(endpoint, {'severity': 'HIGH', 'reason': 'Takrorlash'}, format='json').status_code == 400
    c.force_authenticate(s['owner'])
    assert c.post(endpoint, {'severity': 'CRITICAL', 'reason': 'Ruxsatsiz'}, format='json').status_code == 403
    c.force_authenticate(s['auditor'])
    assert c.post(endpoint, {'severity': 'CRITICAL', 'reason': 'Auditor'}, format='json').status_code == 403
    c.force_authenticate(s['manager'])
    incident.status, incident.conclusion = 'CLOSED', 'Tiklandi'
    incident.save()
    assert c.post(endpoint, {'severity': 'CRITICAL', 'reason': 'Yakunlangan'}, format='json').status_code == 400
    assert IncidentEvent.objects.filter(incident=incident, event='ESCALATE').count() == 1
