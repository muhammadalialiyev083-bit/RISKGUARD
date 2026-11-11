import secrets
import time
from urllib.parse import parse_qs, urlparse

import pytest
from django.contrib.auth.tokens import default_token_generator
from django.test import Client, override_settings

from apps.authentication.models import User
from apps.organizations.models import Organization

URL = '/api/v1/ops/owner-account-recovery'


@pytest.fixture
def owner_key(monkeypatch):
    key = secrets.token_urlsafe(40)
    monkeypatch.setenv('UZHI_OWNER_RECOVERY_KEY', key)
    monkeypatch.setenv('UZHI_OWNER_RECOVERY_EXPIRES', str(int(time.time()) + 600))
    return key


@pytest.fixture
def retained_account(db):
    organization = Organization.objects.create(name='Recovery synthetic tenant')
    return User.objects.create_user(username='retained-owner', email='owner@synthetic.test',
        password='RetainedSyntheticPassword!73', role='ADMIN', organization=organization)


@pytest.mark.django_db
@pytest.mark.parametrize('bad', ['', 'Bearer incorrect'])
def test_missing_or_wrong_maintenance_key_cannot_discover_accounts(owner_key, retained_account, bad):
    response = Client().get(URL, HTTP_AUTHORIZATION=bad, HTTP_X_UZHI_RECOVERY_EMAIL=retained_account.email)
    assert response.status_code == 404
    assert 'username' not in response.json() and 'reset_url' not in response.json()


@pytest.mark.django_db
@pytest.mark.parametrize('expiry', ['0', 'invalid', str(int(time.time()) + 86400)])
def test_expiry_is_required_and_bounded(owner_key, retained_account, monkeypatch, expiry):
    monkeypatch.setenv('UZHI_OWNER_RECOVERY_EXPIRES', expiry)
    assert Client().get(URL, HTTP_AUTHORIZATION='Bearer ' + owner_key,
        HTTP_X_UZHI_RECOVERY_EMAIL=retained_account.email).status_code == 404


@pytest.mark.django_db
@override_settings(FRONTEND_URL='https://uzhi.netlify.app')
def test_issues_standard_one_use_link_without_altering_old_rows(owner_key, retained_account):
    before = User.objects.values().get(pk=retained_account.pk)
    response = Client().get(URL, HTTP_AUTHORIZATION='Bearer ' + owner_key,
        HTTP_X_UZHI_RECOVERY_EMAIL=retained_account.email.upper())
    assert response.status_code == 200 and response.json()['selection'] == 'email'
    link = urlparse(response.json()['reset_url'])
    assert link.scheme == 'https' and link.netloc == 'uzhi.netlify.app' and not link.query
    params = parse_qs(link.fragment)
    assert default_token_generator.check_token(retained_account, params['token'][0])
    assert User.objects.values().get(pk=retained_account.pk) == before
    assert 'no-store' in response['Cache-Control']
    retained_account.set_password('SyntheticNewPassword!81')
    retained_account.save(update_fields=['password'])
    assert not default_token_generator.check_token(retained_account, params['token'][0])


@pytest.mark.django_db
def test_only_sole_administrator_can_be_selected_as_owner_fallback(owner_key, retained_account):
    client = Client()
    response = client.get(URL, HTTP_AUTHORIZATION='Bearer ' + owner_key,
        HTTP_X_UZHI_RECOVERY_EMAIL='absent@synthetic.test')
    assert response.status_code == 200 and response.json()['username'] == retained_account.username
    User.objects.create_user(username='second-admin', role='ADMIN', organization=retained_account.organization)
    response = client.get(URL, HTTP_AUTHORIZATION='Bearer ' + owner_key,
        HTTP_X_UZHI_RECOVERY_EMAIL='absent@synthetic.test')
    assert response.status_code == 409 and 'reset_url' not in response.json()


@pytest.mark.django_db
def test_maintenance_endpoint_rejects_missing_selector_and_password_mutations(owner_key, retained_account):
    client = Client()
    assert client.get(URL, HTTP_AUTHORIZATION='Bearer ' + owner_key).status_code == 400
    assert client.post(URL, HTTP_AUTHORIZATION='Bearer ' + owner_key,
        HTTP_X_UZHI_RECOVERY_EMAIL=retained_account.email).status_code == 405
    retained_account.refresh_from_db()
    assert retained_account.check_password('RetainedSyntheticPassword!73')
