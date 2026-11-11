"""Security regressions for the UzHi account workflows (no live provider credentials)."""
from datetime import datetime, timedelta
from unittest.mock import Mock, patch
from urllib.parse import urlparse, parse_qs

import pytest
from django.core import mail
from django.contrib.auth.tokens import default_token_generator
from django.test import override_settings
from django.urls import reverse
from django.utils import timezone
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from rest_framework.test import APIClient

from apps.authentication.models import User, GoogleIdentity, AuthRateLimit
from apps.organizations.models import Organization, Department
from apps.core.models import AuditLog


@pytest.fixture
def account(db):
    org = Organization.objects.create(name='UzHi security tenant', sector='IT')
    return User.objects.create_user(username='security-admin', email='admin@security.test',
                                    password='InitialSecurePassword!73', role='ADMIN', organization=org)


@pytest.fixture
def csrf_client():
    return APIClient(enforce_csrf_checks=True)


def csrf_post(client, name, payload):
    token = client.get(reverse('auth-csrf')).data['csrfToken']
    return client.post(reverse(name), payload, format='json', HTTP_X_CSRFTOKEN=token)


def sign_in(client, account):
    result = csrf_post(client, 'auth-login', {'username': account.username, 'password': 'InitialSecurePassword!73'})
    assert result.status_code == 200


EMAIL_SETTINGS = {
    'EMAIL_BACKEND': 'django.core.mail.backends.locmem.EmailBackend',
    'DEBUG': True,
    'DEFAULT_FROM_EMAIL': 'accounts@uzhi.test',
    'FRONTEND_URL': 'https://uzhi.test',
}


@pytest.mark.django_db
@override_settings(**EMAIL_SETTINGS)
def test_reset_is_generic_one_use_and_invalidates_existing_sessions(account, csrf_client):
    sign_in(csrf_client, account)
    anon = APIClient(enforce_csrf_checks=True)
    valid = csrf_post(anon, 'auth-password-reset', {'email': account.email})
    missing = csrf_post(anon, 'auth-password-reset', {'email': 'unknown@security.test'})
    assert valid.status_code == missing.status_code == 200
    assert valid.data == missing.data
    assert len(mail.outbox) == 1
    link = next(line for line in mail.outbox[0].body.splitlines() if line.startswith('https://'))
    parsed = urlparse(link)
    assert parsed.query == ''  # Bearer token does not enter web access logs.
    params = {key: values[0] for key, values in parse_qs(parsed.fragment).items()}
    payload = {**params, 'new_password': 'ChangedResetPassword!62', 'confirm_password': 'ChangedResetPassword!62'}
    assert csrf_post(anon, 'auth-password-reset-confirm', payload).status_code == 200
    assert csrf_post(anon, 'auth-password-reset-confirm', payload).status_code == 400
    assert csrf_client.get(reverse('auth-me')).status_code == 403
    account.refresh_from_db()
    assert account.check_password('ChangedResetPassword!62')
    assert 'token' not in str(list(AuditLog.objects.values('after_state')))


@pytest.mark.django_db
@override_settings(**EMAIL_SETTINGS, PASSWORD_RESET_TIMEOUT=1)
def test_expired_reset_rejected_and_password_policy_applies(account, csrf_client):
    token = default_token_generator.make_token(account)
    uid = urlsafe_base64_encode(force_bytes(account.pk))
    with patch.object(default_token_generator, '_now', return_value=datetime.now() + timedelta(seconds=5)):
        response = csrf_post(csrf_client, 'auth-password-reset-confirm',
                             {'uid': uid, 'token': token, 'new_password': 'StrongNewPassword!83', 'confirm_password': 'StrongNewPassword!83'})
        assert response.status_code == 400
    response = csrf_post(csrf_client, 'auth-password-reset-confirm',
                         {'uid': uid, 'token': token, 'new_password': '123', 'confirm_password': '123'})
    assert response.status_code == 400
    account.refresh_from_db()
    assert account.check_password('InitialSecurePassword!73')


@pytest.mark.django_db
@override_settings(**EMAIL_SETTINGS)
def test_reset_requires_csrf_and_has_shared_rate_limit(account, csrf_client):
    assert csrf_client.post(reverse('auth-password-reset'), {'email': account.email}).status_code == 403
    for _ in range(5):
        assert csrf_post(csrf_client, 'auth-password-reset', {'email': account.email}).status_code == 200
    another_worker_client = APIClient(enforce_csrf_checks=True)
    assert csrf_post(another_worker_client, 'auth-password-reset', {'email': account.email}).status_code == 429
    token = another_worker_client.get(reverse('auth-csrf')).data['csrfToken']
    spoofed = another_worker_client.post(reverse('auth-password-reset'), {'email': account.email}, format='json',
                                        HTTP_X_CSRFTOKEN=token, HTTP_X_FORWARDED_FOR='203.0.113.200')
    assert spoofed.status_code == 429  # Untrusted forwarding headers cannot reset the IP bucket.
    assert AuthRateLimit.objects.exists()
    assert account.email not in str(list(AuthRateLimit.objects.values()))


@pytest.mark.django_db
def test_password_change_terminates_all_sessions(account, csrf_client):
    second = APIClient(enforce_csrf_checks=True)
    sign_in(csrf_client, account)
    sign_in(second, account)
    payload = {'current_password': 'wrong', 'new_password': 'NextAccountPassword!84', 'confirm_password': 'NextAccountPassword!84'}
    assert csrf_post(csrf_client, 'auth-password-change', payload).status_code == 400
    payload['current_password'] = 'InitialSecurePassword!73'
    assert csrf_post(csrf_client, 'auth-password-change', payload).status_code == 200
    assert csrf_client.get(reverse('auth-me')).status_code == 403
    assert second.get(reverse('auth-me')).status_code == 403


@pytest.mark.django_db
def test_users_admin_only_and_department_tenant_validation(account):
    client = APIClient()
    manager = User.objects.create_user(username='manager-security', role='BCMS_MANAGER', organization=account.organization)
    client.force_authenticate(manager)
    assert client.post(reverse('user-list'), {'username': 'unauthorized', 'role': 'ADMIN'}).status_code == 403
    assert client.patch(reverse('user-detail', args=[account.pk]), {'role': 'AUDITOR'}).status_code == 403
    other_org = Organization.objects.create(name='other security tenant', sector='Bank')
    foreign_department = Department.objects.create(organization=other_org, name='Other department')
    client.force_authenticate(account)
    assert client.post(reverse('user-list'), {'username': 'foreign-dept', 'department': foreign_department.pk}).status_code == 400
    foreign_user = User.objects.create(username='foreign-user-security', organization=other_org)
    assert client.patch(reverse('user-detail', args=[foreign_user.pk]), {'role': 'ADMIN'}).status_code == 404


@pytest.mark.django_db
def test_profile_only_updates_safe_fields(account):
    client = APIClient()
    client.force_authenticate(account)
    response = client.patch(reverse('auth-me'), {'first_name': 'Ali', 'role': 'AUDITOR',
                                               'preferences': {'theme': 'light', 'notifications': False}}, format='json')
    assert response.status_code == 200
    account.refresh_from_db()
    assert account.first_name == 'Ali'
    assert account.role == 'ADMIN'
    assert account.preferences == {'theme': 'light', 'notifications': False}
    assert client.patch(reverse('auth-me'), {'preferences': {'theme': 'invalid'}}, format='json').status_code == 400


@pytest.mark.django_db
@override_settings(**EMAIL_SETTINGS)
def test_invitation_requires_admin_and_is_single_use(account, csrf_client):
    sign_in(csrf_client, account)
    response = csrf_post(csrf_client, 'user-invite', {'email': 'invited@security.test', 'role': 'RISK_ANALYST'})
    assert response.status_code == 201
    invited = User.objects.get(email='invited@security.test')
    assert not invited.is_active
    link = next(line for line in mail.outbox[0].body.splitlines() if line.startswith('https://'))
    params = {key: values[0] for key, values in parse_qs(urlparse(link).fragment).items()}
    payload = {**params, 'username': 'accepted-user', 'new_password': 'InvitedPassword!76', 'confirm_password': 'InvitedPassword!76'}
    anon = APIClient(enforce_csrf_checks=True)
    assert csrf_post(anon, 'auth-invitation-accept', payload).status_code == 200
    assert csrf_post(anon, 'auth-invitation-accept', payload).status_code == 400
    invited.refresh_from_db()
    assert invited.is_active
    assert invited.organization_id == account.organization_id
    assert invited.role == 'RISK_ANALYST'


@pytest.mark.django_db
@override_settings(GOOGLE_CLIENT_ID='test', GOOGLE_CLIENT_SECRET='test', GOOGLE_REDIRECT_URI='https://uzhi.test/api/v1/auth/google/callback')
def test_google_callback_never_links_by_email_and_cannot_replay(account, csrf_client):
    session = csrf_client.session
    session['uzhi_google_flow'] = {'started': __import__('time').time(), 'link_user': None}
    session.save()
    provider = Mock()
    provider.authorize_access_token.return_value = {'id_token': 'verified-by-authlib', 'userinfo': {'sub': 'google-subject', 'email': account.email, 'email_verified': True}}
    with patch('apps.authentication.security_views.google_client', return_value=provider):
        result = csrf_client.get(reverse('auth-google-callback'), {'code': 'not-a-real-code', 'state': 'verified-by-provider'})
        assert 'approval_required' in result['Location']
        assert not GoogleIdentity.objects.exists()
        assert csrf_client.get(reverse('auth-me')).status_code == 403
        replay = csrf_client.get(reverse('auth-google-callback'), {'code': 'not-a-real-code'})
        assert 'invalid_callback' in replay['Location']
        assert provider.authorize_access_token.call_count == 1


@pytest.mark.django_db
@override_settings(GOOGLE_CLIENT_ID='test', GOOGLE_CLIENT_SECRET='test', GOOGLE_REDIRECT_URI='https://uzhi.test/api/v1/auth/google/callback')
def test_google_verified_existing_identity_can_login(account, csrf_client):
    GoogleIdentity.objects.create(user=account, subject='existing-google-sub')
    session = csrf_client.session
    session['uzhi_google_flow'] = {'started': __import__('time').time(), 'link_user': None}
    session.save()
    provider = Mock()
    provider.authorize_access_token.return_value = {'id_token': 'verified-by-authlib', 'userinfo': {'sub': 'existing-google-sub', 'email_verified': True}}
    with patch('apps.authentication.security_views.google_client', return_value=provider):
        result = csrf_client.get(reverse('auth-google-callback'), {'code': 'mock'})
    assert 'success' in result['Location']
    assert csrf_client.get(reverse('auth-me')).data['id'] == account.pk


@pytest.mark.django_db
@override_settings(GOOGLE_CLIENT_ID='', GOOGLE_CLIENT_SECRET='', EMAIL_HOST='', EMAIL_BACKEND='django.core.mail.backends.smtp.EmailBackend')
def test_unconfigured_services_are_not_presented_as_working(csrf_client):
    assert csrf_client.get(reverse('auth-config')).data == {'google_enabled': False, 'password_reset_enabled': False}
    assert csrf_client.get(reverse('auth-google-start')).status_code == 503
    assert csrf_post(csrf_client, 'auth-password-reset', {'email': 'test@security.test'}).status_code == 503


@pytest.mark.django_db
@override_settings(GOOGLE_CLIENT_ID='oidc-test', GOOGLE_CLIENT_SECRET='oidc-test-secret',
                   GOOGLE_REDIRECT_URI='https://uzhi.test/api/v1/auth/google/callback')
def test_oidc_uses_pkce_and_validates_signature_state_and_nonce(account, csrf_client):
    """Exercise Authlib verification with a signed token and fake provider transport."""
    import time
    from joserfc import jwt
    from joserfc.jwk import RSAKey
    from apps.authentication.security import google_client
    key = RSAKey.generate_key(2048, parameters={'kid': 'test-key'})
    client = google_client()
    metadata = {'issuer': 'https://accounts.google.com',
                'authorization_endpoint': 'https://accounts.google.com/o/oauth2/v2/auth',
                'token_endpoint': 'https://oauth2.googleapis.com/token',
                'jwks_uri': 'https://www.googleapis.com/oauth2/v3/certs',
                'id_token_signing_alg_values_supported': ['RS256']}
    GoogleIdentity.objects.create(user=account, subject='signed-google-sub')
    with patch('apps.authentication.security_views.google_client', return_value=client), \
            patch.object(client, 'load_server_metadata', return_value=metadata), \
            patch.object(client, 'fetch_jwk_set', return_value={'keys': [key.as_dict(private=False)]}):
        start = csrf_client.get(reverse('auth-google-start'))
        params = parse_qs(urlparse(start['Location']).query)
        assert params['code_challenge_method'] == ['S256']
        assert params['code_challenge'][0]
        assert params['nonce'][0]
        assert params['scope'] == ['openid email profile']
        claims = {'iss': metadata['issuer'], 'aud': 'oidc-test', 'sub': 'signed-google-sub',
                  'email_verified': True, 'iat': int(time.time()), 'exp': int(time.time()) + 300,
                  'nonce': params['nonce'][0]}
        encoded = jwt.encode({'alg': 'RS256', 'kid': 'test-key'}, claims, key)
        with patch.object(client, 'fetch_access_token', return_value={'id_token': encoded, 'access_token': 'provider-only'}) as exchange:
            result = csrf_client.get(reverse('auth-google-callback'), {'state': params['state'][0], 'code': 'auth-code'})
            assert 'status=success' in result['Location']
            assert exchange.call_args.kwargs['code_verifier']
        assert csrf_client.get(reverse('auth-me')).data['id'] == account.pk

        # A token signed by the provider with the wrong nonce must still fail.
        start = csrf_client.get(reverse('auth-google-start'))
        params = parse_qs(urlparse(start['Location']).query)
        claims['nonce'] = 'wrong-nonce'
        encoded = jwt.encode({'alg': 'RS256', 'kid': 'test-key'}, claims, key)
        with patch.object(client, 'fetch_access_token', return_value={'id_token': encoded, 'access_token': 'provider-only'}):
            result = csrf_client.get(reverse('auth-google-callback'), {'state': params['state'][0], 'code': 'auth-code'})
            assert 'invalid_callback' in result['Location']
        start = csrf_client.get(reverse('auth-google-start'))
        with patch.object(client, 'fetch_access_token') as exchange:
            result = csrf_client.get(reverse('auth-google-callback'), {'state': 'unbound-state', 'code': 'auth-code'})
            assert 'invalid_callback' in result['Location']
            exchange.assert_not_called()


@pytest.mark.django_db
@pytest.mark.parametrize('malformed', [[], {}, None, 123, True])
def test_auth_rejects_non_string_passwords_and_bearer_fields(account, csrf_client, malformed):
    sign_in(csrf_client, account)
    password = {'new_password': 'ShouldNeverChangePassword!73', 'confirm_password': 'ShouldNeverChangePassword!73'}
    cases = [
        ('auth-password-change', {**password, 'current_password': malformed}),
        ('auth-google-link', {'password': malformed}),
        ('auth-password-reset', {'email': malformed}),
        ('auth-password-reset-confirm', {**password, 'uid': malformed, 'token': 'not-a-token'}),
        ('auth-password-reset-confirm', {**password, 'uid': 'MQ', 'token': malformed}),
        ('auth-invitation-accept', {**password, 'uid': malformed, 'token': 'bad', 'username': 'new-account'}),
        ('auth-invitation-accept', {**password, 'uid': 'MQ', 'token': malformed, 'username': 'new-account'}),
        ('auth-invitation-accept', {**password, 'uid': 'MQ', 'token': 'bad', 'username': malformed}),
        ('user-invite', {'email': 'test@security.test', 'role': malformed}),
        ('user-invite', {'email': 'test@security.test', 'first_name': malformed}),
    ]
    for name, payload in cases:
        result = csrf_post(csrf_client, name, payload)
        assert result.status_code == 400, (name, malformed, result.data)
    account.refresh_from_db()
    assert account.check_password('InitialSecurePassword!73')
    assert not GoogleIdentity.objects.exists()


@pytest.mark.django_db
def test_auth_rejects_non_object_json_body(account, csrf_client):
    sign_in(csrf_client, account)
    for name in ('auth-password-change', 'auth-google-link', 'auth-password-reset',
                 'auth-password-reset-confirm', 'auth-invitation-accept', 'user-invite'):
        result = csrf_post(csrf_client, name, ['not', 'an', 'object'])
        assert result.status_code == 400, (name, result.data)
