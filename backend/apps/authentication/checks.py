from urllib.parse import urlparse

from django.conf import settings
from django.core.checks import Error, Warning, register


@register()
def account_service_configuration(app_configs, **kwargs):
    issues = []
    frontend = urlparse(settings.FRONTEND_URL)
    if not settings.DEBUG and (frontend.scheme != 'https' or not frontend.netloc):
        issues.append(Error(
            'FRONTEND_URL must be an absolute HTTPS origin in production.',
            id='uzhi.E005',
        ))
    google = {
        'GOOGLE_CLIENT_ID': settings.GOOGLE_CLIENT_ID,
        'GOOGLE_CLIENT_SECRET': settings.GOOGLE_CLIENT_SECRET,
        'GOOGLE_REDIRECT_URI': settings.GOOGLE_REDIRECT_URI,
    }
    configured = [name for name, value in google.items() if value]
    if configured and len(configured) != len(google):
        issues.append(Error(
            'Google OIDC is only partially configured.',
            hint='Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET and GOOGLE_REDIRECT_URI together.',
            id='uzhi.E001',
        ))
    if len(configured) == len(google):
        redirect = urlparse(settings.GOOGLE_REDIRECT_URI)
        if (not settings.DEBUG and redirect.scheme != 'https') or redirect.path != '/api/v1/auth/google/callback':
            issues.append(Error(
                'GOOGLE_REDIRECT_URI must use HTTPS and the exact UzHi callback path.',
                id='uzhi.E002',
            ))

    if settings.EMAIL_USE_TLS and settings.EMAIL_USE_SSL:
        issues.append(Error('EMAIL_USE_TLS and EMAIL_USE_SSL cannot both be enabled.', id='uzhi.E003'))
    if settings.EMAIL_HOST and not settings.DEFAULT_FROM_EMAIL:
        issues.append(Error('DEFAULT_FROM_EMAIL is required when SMTP is configured.', id='uzhi.E004'))
    if settings.DEFAULT_FROM_EMAIL and not settings.EMAIL_HOST and not settings.DEBUG:
        issues.append(Warning(
            'DEFAULT_FROM_EMAIL is set but SMTP delivery is disabled.',
            id='uzhi.W001',
        ))
    return issues
