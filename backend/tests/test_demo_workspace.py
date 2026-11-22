import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from apps.authentication.models import User
from apps.core.demo_data import DEMO_ORGANIZATION
from apps.core.models import AuditLog
from apps.organizations.models import Organization, Service
from apps.processes.models import BusinessProcess


def csrf(client):
    return {'HTTP_X_CSRFTOKEN': client.get(reverse('auth-csrf')).data['csrfToken']}


@pytest.mark.django_db
def test_demo_is_read_only_and_does_not_replace_an_existing_tenant_session():
    client = APIClient(enforce_csrf_checks=True)
    real_org = Organization.objects.create(name='Amaldagi tashkilot', sector='IT')
    real_user = User.objects.create_user(username='real-admin', organization=real_org, role=User.ROLE_ADMIN)
    real_service = Service.objects.create(organization=real_org, name='Ichki xizmat')
    client.force_login(real_user)
    assert client.post(reverse('auth-demo'), {}, format='json', **csrf(client)).status_code == 409
    assert client.get(reverse('auth-me')).data['id'] == real_user.pk
    assert not Organization.objects.filter(is_demo=True).exists()

    client = APIClient(enforce_csrf_checks=True)
    assert client.post(reverse('auth-demo'), {}, format='json').status_code == 403
    assert not Organization.objects.filter(is_demo=True).exists()
    response = client.post(reverse('auth-demo'), {}, format='json', **csrf(client))
    assert response.status_code == 200, response.data
    assert 'no-store' in response['Cache-Control']
    demo = response.data['user']
    assert demo['is_demo_viewer'] and demo['role'] == User.ROLE_AUDITOR
    assert demo['organization'] != real_org.pk
    assert not User.objects.get(pk=demo['id']).has_usable_password()
    assert client.get(reverse('auth-me')).data['id'] == demo['id']
    assert client.get(f'/api/v1/services/{real_service.pk}/').status_code == 404

    token = {'HTTP_X_CSRFTOKEN': response.data['csrfToken']}
    assert client.post('/api/v1/services/', {'name': 'Yangi yozuv'}, format='json', **token).status_code == 403
    assert client.patch(reverse('auth-me'), {'first_name': 'Yangi ism'}, format='json', **token).status_code == 403
    assert client.get(reverse('auth-me')).data['first_name'] == 'Demo'
    assert client.post(reverse('auth-logout'), {}, format='json', **token).status_code == 200
    assert client.get(reverse('auth-me')).status_code == 403


@pytest.mark.django_db
def test_demo_has_linked_samples_and_keeps_one_workspace():
    client = APIClient()
    first = client.post(reverse('auth-demo'))
    assert first.status_code == 200, first.data
    user = first.data['user']
    for resource in (
        'organizations', 'departments', 'services', 'users', 'processes', 'assets',
        'dependencies', 'providers', 'bia', 'risks', 'controls', 'strategies', 'plans',
        'scenarios', 'exercises', 'simulation-runs', 'incidents', 'improvement-tasks', 'audit-logs',
    ):
        response = client.get(f'/api/v1/{resource}/')
        assert response.status_code == 200, resource
        assert response.data['results'], resource

    report = client.get('/api/v1/reports/organization').data['summary']
    assert report['total_processes'] == 3
    assert report['verified_plans_count'] == 1
    assert report['rpo_gap_count'] == 1
    ranking = client.get('/api/v1/analyses/priority').data['ranked_processes']
    assert len(ranking) == 3
    result = client.get('/api/v1/simulation-runs/').data['results'][0]['result']
    assert result['affected_processes_count'] == 2
    assert result['rto_breaches_count'] == 1 and result['unassessed_count'] == 1
    assert any(row['has_published_plan'] for row in result['affected_processes'])
    assert client.get('/api/v1/reports/iso22301').data['records']

    assert client.post(reverse('auth-logout')).status_code == 200
    second = APIClient().post(reverse('auth-demo'))
    assert second.status_code == 200 and second.data['user']['id'] == user['id']
    assert Organization.objects.filter(is_demo=True).count() == 1
    assert BusinessProcess.objects.filter(organization_id=user['organization']).count() == 3
    assert AuditLog.objects.filter(organization_id=user['organization'], ip_address__isnull=False).count() == 0


@pytest.mark.django_db
def test_demo_never_uses_a_real_organization_with_the_reserved_name():
    real_org = Organization.objects.create(name=DEMO_ORGANIZATION, sector='IT')
    response = APIClient().post(reverse('auth-demo'))
    assert response.status_code == 503
    real_org.refresh_from_db()
    assert not real_org.is_demo and not real_org.users.exists()
