from datetime import timedelta

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from apps.authentication.models import User
from apps.bia.models import BIAAssessment
from apps.core.models import AuditLog
from apps.operations.models import ContinuityMap, ImprovementTask
from apps.organizations.models import Organization, Service
from apps.plans.models import ContinuityPlan, PlanStep
from apps.processes.models import Asset, BusinessProcess, Dependency
from apps.simulation.models import Scenario


@pytest.fixture
def pilot(db):
    org = Organization.objects.create(name='Universitet piloti', sector='Ta’lim')
    service = Service.objects.create(organization=org, name='Elektron ta’lim xizmati')
    admin = User.objects.create_user(username='pilot-admin', organization=org, role='ADMIN')
    process = BusinessProcess.objects.create(
        organization=org, service=service, name='Elektron ta’lim platformasi',
        owner=admin, criticality='CRITICAL',
    )
    client = APIClient()
    client.force_authenticate(admin)
    return org, service, process, admin, client


def create_bia(pilot, **options):
    org, _, process, _, _ = pilot
    return BIAAssessment.objects.create(organization=org, process=process, status='APPROVED',
                                        rto_hours=options.pop('rto_hours', 2), mtpd_hours=20, **options)


def create_plan(pilot):
    org, _, process, _, _ = pilot
    return ContinuityPlan.objects.create(organization=org, process=process, title='Tiklanish rejasi')


def publish(pilot, plan):
    return pilot[-1].post(f'/api/v1/plans/{plan.pk}/publish/')


def test_published_readiness_requires_evidence_and_preserves_legacy(pilot):
    org, _, process, admin, client = pilot
    assessment = create_bia(pilot)
    plan = create_plan(pilot)
    assert publish(pilot, plan).status_code == 400
    assert client.get('/api/v1/reports/organization').data['summary']['unplanned_processes_count'] == 1
    legacy = ContinuityPlan.objects.create(organization=org, process=process, title='Oldingi reja', status='PUBLISHED')
    assert client.get(f'/api/v1/plans/{legacy.pk}/').data['readiness']['needs_review']
    assert client.get('/api/v1/reports/organization').data['summary']['unplanned_processes_count'] == 1
    step = PlanStep.objects.create(plan=plan, title='Xizmatni tiklash')
    assert publish(pilot, plan).status_code == 400
    step.assigned_to = admin
    step.save()
    response = publish(pilot, plan)
    assert response.status_code == 200, response.data
    assert response.data['plan']['readiness']['bia_basis'] == {
        'id': assessment.pk, 'revision': 1, 'rto_hours': '2.00', 'mtpd_hours': '20.00', 'rpo_minutes': 60,
    }
    assert client.get('/api/v1/reports/organization').data['summary']['unplanned_processes_count'] == 0


def test_provider_outage_uses_approved_bia_and_tracks_paths(pilot):
    org, service, process, admin, client = pilot
    approved = create_bia(pilot)
    BIAAssessment.objects.create(organization=org, process=process, rto_hours=12, mtpd_hours=20, revision=2)
    plan = create_plan(pilot)
    PlanStep.objects.create(plan=plan, title='Zaxiraga o‘tish', assigned_to=admin)
    assert publish(pilot, plan).status_code == 200
    asset = Asset.objects.create(organization=org, name='Internet kanali', type='SERVER')
    unassessed = BusinessProcess.objects.create(organization=org, service=service, name='Video darslar')
    for record in (process, unassessed):
        Dependency.objects.create(organization=org, from_type='PROCESS', from_id=record.pk,
                                  to_type='ASSET', to_id=asset.pk)
    provider = client.post('/api/v1/providers/', {'name': 'Universitet interneti', 'assets': [asset.pk]}, format='json')
    assert provider.status_code == 201, provider.data
    run = client.post(f'/api/v1/providers/{provider.data["id"]}/disruption/',
                      {'title': 'Internet uzilishi', 'estimated_outage_hours': 8}, format='json')
    assert run.status_code == 201, run.data
    result = run.data['result']
    assert (result['rto_breaches_count'], result['unassessed_count']) == (1, 1)
    impact, unknown = result['affected_processes']
    assert impact['bia_id'] == approved.pk and impact['rto_breached'] is True
    assert impact['plan_id'] == plan.pk and impact['has_published_plan']
    assert impact['dependency_paths'] == [[f'ASSET:{asset.pk}', f'PROCESS:{process.pk}']]
    assert unknown['assessment_status'] == 'UNASSESSED' and unknown['rto_breached'] is None
    task = client.post(f'/api/v1/simulation-runs/{run.data["id"]}/improvements/',
                       {'title': 'Zaxirani sinash', 'process': process.pk, 'owner': admin.pk,
                        'due_date': str(timezone.localdate() + timedelta(days=1))}, format='json')
    assert task.status_code == 201
    card = client.get(f'/api/v1/services/{service.pk}/continuity/').data['processes']
    assert card[0]['plan']['id'] == plan.pk and card[0]['tasks'][0]['id'] == task.data['id']


def test_backup_must_be_explicit_available_and_tenant_owned(pilot):
    org, _, process, _, client = pilot
    primary, backup = [Asset.objects.create(organization=org, name=name, type='SERVER')
                       for name in ('Internet', 'Zaxira')]
    Dependency.objects.create(organization=org, from_type='PROCESS', from_id=process.pk,
                              to_type='ASSET', to_id=primary.pk)
    response = client.post('/api/v1/scenarios/', {
        'title': 'Internet', 'disrupted_asset_ids': [primary.pk], 'estimated_outage_hours': 8,
        'backup_assets': {str(primary.pk): backup.pk},
    }, format='json')
    assert response.status_code == 201, response.data
    url = f'/api/v1/scenarios/{response.data["id"]}/simulate/'
    assert client.post(url).data['affected_processes_count'] == 0
    Dependency.objects.create(organization=org, from_type='ASSET', from_id=backup.pk,
                              to_type='ASSET', to_id=primary.pk)
    assert client.post(url).data['affected_processes_count'] == 1
    assert client.post(url, {'backup_assets': {str(primary.pk): 999999}}, format='json').status_code == 400


def test_review_tasks_and_exercise_evidence_are_idempotent(pilot):
    org, service, process, admin, client = pilot
    create_bia(pilot)
    plan = create_plan(pilot)
    PlanStep.objects.create(plan=plan, title='Tiklash', assigned_to=admin)
    assert publish(pilot, plan).status_code == 200
    payload = {'plan': plan.pk, 'exercise_date': str(timezone.localdate()), 'actual_recovery_hours': 1,
               'outcome': 'SUCCESS', 'findings': 'Zaxira sinovini takrorlash'}
    exercise = client.post('/api/v1/exercises/', payload, format='json')
    assert exercise.status_code == 201, exercise.data
    assert client.get(f'/api/v1/plans/{plan.pk}/').data['readiness']['exercise_verified']
    endpoint = f'/api/v1/exercises/{exercise.data["id"]}/improvements/'
    task = {'title': 'Kamchilikni bartaraf etish', 'owner': admin.pk, 'due_date': str(timezone.localdate())}
    first = client.post(endpoint, task, format='json')
    second = client.post(endpoint, task, format='json')
    assert (first.status_code, second.status_code) == (201, 200)
    assert first.data['id'] == second.data['id'] and first.data['plan'] == plan.pk
    newer = BIAAssessment.objects.create(organization=org, process=process, rto_hours=3, mtpd_hours=8, revision=2)
    assert client.post(f'/api/v1/bia/{newer.pk}/approve/').status_code == 200
    assert client.post(f'/api/v1/bia/{newer.pk}/approve/').status_code == 400
    assert ImprovementTask.objects.filter(plan=plan, exercise__isnull=True).count() == 1
    state = client.get(f'/api/v1/plans/{plan.pk}/').data['readiness']
    assert state['needs_review'] and not state['exercise_verified'] and state['bia_basis']['revision'] == 1
    evidence = client.get('/api/v1/reports/iso22301').data['records']
    assert any(row['clause'] == '8.4' and row['record_id'] == plan.pk and row['missing'] for row in evidence)
    assert AuditLog.objects.filter(entity='ImprovementTask', action='CREATE').count() == 2


def test_service_evidence_tenant_scope(pilot):
    org, service, _, _, client = pilot
    outsider_org = Organization.objects.create(name='Boshqa tashkilot', sector='IT')
    foreign_service = Service.objects.create(organization=outsider_org, name='Boshqa xizmat')
    assert client.get(f'/api/v1/services/{foreign_service.pk}/continuity/').status_code == 404
    auditor = User.objects.create_user(username='pilot-audit', organization=org, role='AUDITOR')
    client.force_authenticate(auditor)
    assert client.get(f'/api/v1/services/{service.pk}/continuity/').status_code == 200


def test_regional_map_route_is_retired_without_dropping_saved_plans(pilot):
    org, _, _, _, client = pilot
    stops = [{'id': 'pilot', 'name': 'Universitet', 'latitude': 41.3, 'longitude': 69.24}]
    old_plan = ContinuityMap.objects.create(organization=org, stops=stops, revision=2)
    assert client.get('/api/v1/continuity-map').status_code == 404
    assert client.put('/api/v1/continuity-map', {'stops': []}, format='json').status_code == 404
    old_plan.refresh_from_db()
    assert old_plan.stops == stops and old_plan.revision == 2
