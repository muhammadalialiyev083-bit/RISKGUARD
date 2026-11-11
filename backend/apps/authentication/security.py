"""Authentication helpers. No password or bearer token is written to audit/logs."""
import hashlib
import logging
import time
from datetime import timedelta
from urllib.parse import urlencode

from django.conf import settings
from django.core.mail import send_mail
from django.db import models
from django.utils import timezone
from rest_framework.exceptions import Throttled

from .models import AuthRateLimit

logger = logging.getLogger(__name__)


def rate_limit(request, scope, limit=5, seconds=3600, identity=''):
    # REMOTE_ADDR is the trusted transport peer; arbitrary X-Forwarded-For is not trusted.
    # Hashing the optional account identity limits a single account across peer addresses.
    identities = ['ip:' + request.META.get('REMOTE_ADDR', 'unknown')]
    if identity:
        identities.append('account:' + identity.strip().casefold())
    bucket = int(time.time()) // seconds
    for identity_key in identities:
        key = hashlib.sha256(f'{scope}:{bucket}:{identity_key}'.encode()).hexdigest()
        obj, _ = AuthRateLimit.objects.get_or_create(
            key=key, defaults={'expires_at': timezone.now() + timedelta(seconds=seconds * 2)})
        AuthRateLimit.objects.filter(pk=obj.pk).update(attempts=models.F('attempts') + 1)
        obj.refresh_from_db(fields=['attempts'])
        if obj.attempts > limit:
            raise Throttled(wait=seconds - int(time.time()) % seconds,
                            detail='Juda ko‘p urinish. Birozdan keyin qayta urinib ko‘ring.')
    AuthRateLimit.objects.filter(expires_at__lt=timezone.now()).delete()


def email_enabled():
    backend = getattr(settings, 'EMAIL_BACKEND', '')
    return bool(getattr(settings, 'EMAIL_HOST', '') and backend == 'django.core.mail.backends.smtp.EmailBackend') or (
        settings.DEBUG and backend == 'django.core.mail.backends.locmem.EmailBackend')


def google_enabled():
    return bool(getattr(settings, 'GOOGLE_CLIENT_ID', '') and getattr(settings, 'GOOGLE_CLIENT_SECRET', '')
                and getattr(settings, 'GOOGLE_REDIRECT_URI', ''))


def frontend_link(path, fragment=False, **params):
    return getattr(settings, 'FRONTEND_URL', 'http://localhost:5173').rstrip('/') + path + (
        ('#' if fragment else '?') + urlencode(params) if params else '')


def send_security_email(email, subject, text):
    if not email_enabled():
        return False
    try:
        return send_mail(subject, text, settings.DEFAULT_FROM_EMAIL, [email], fail_silently=False) == 1
    except Exception:
        # SMTP exception strings may include auth data or reset URLs. Keep diagnostics bounded.
        logger.error('Account email delivery failed; inspect the mail provider delivery status.')
        return False


def google_client():
    from authlib.integrations.django_client import OAuth
    client = OAuth()
    return client.register(
        'google', client_id=settings.GOOGLE_CLIENT_ID, client_secret=settings.GOOGLE_CLIENT_SECRET,
        server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
        client_kwargs={'scope': 'openid email profile', 'code_challenge_method': 'S256', 'default_timeout': 15},
    )
