"""Temporary owner maintenance view, present only on the recovery branch.

The Render owner provisions an expiring, random bearer key. This GET issues an
ordinary Django reset link and never changes accounts, passwords, or privileges.
Remove its settings and redeploy the normal application after the maintenance.
"""
import os
import time

from django.conf import settings
from django.contrib.auth.tokens import default_token_generator
from django.db import connection, transaction
from django.db.models import Q
from django.http import JsonResponse
from django.utils.crypto import constant_time_compare
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from django.views.decorators.cache import never_cache

from .models import User
from .security import frontend_link


@never_cache
def owner_account_recovery(request):
    expected = os.environ.get('UZHI_OWNER_RECOVERY_KEY', '')
    try:
        remaining = int(os.environ.get('UZHI_OWNER_RECOVERY_EXPIRES', '0')) - time.time()
    except (ValueError, OverflowError):
        remaining = 0
    supplied = request.headers.get('Authorization', '')
    if len(expected) < 40 or not 0 < remaining <= 1800 or not constant_time_compare(supplied, 'Bearer ' + expected):
        return JsonResponse({'detail': 'Not found.'}, status=404)
    if request.method != 'GET':
        return JsonResponse({'detail': 'GET required.'}, status=405)
    email = request.headers.get('X-UzHi-Recovery-Email', '').strip()
    if not email or len(email) > 254:
        return JsonResponse({'detail': 'Account email is required.'}, status=400)
    with transaction.atomic():
        if connection.vendor == 'postgresql':
            with connection.cursor() as cursor:
                cursor.execute('SET TRANSACTION READ ONLY')
        matches = list(User.objects.filter(is_active=True, email__iexact=email)[:2])
        selection = 'email'
        if len(matches) == 0:
            # Hosting owner recovery may select the sole existing administrator;
            # never guess between multiple tenants or grant a new role.
            matches = list(User.objects.filter(is_active=True).filter(Q(role='ADMIN') | Q(is_superuser=True))[:2])
            selection = 'sole-existing-administrator'
        if len(matches) != 1:
            return JsonResponse({'detail': 'Account cannot be selected unambiguously.',
                                 'selection': selection, 'match_count': len(matches)}, status=409)
        user = matches[0]
        if not user.has_usable_password():
            return JsonResponse({'detail': 'Existing account has no password; manual review required.'}, status=409)
        link = frontend_link('/auth/reset', fragment=True,
            uid=urlsafe_base64_encode(force_bytes(user.pk)),
            token=default_token_generator.make_token(user))
        response = JsonResponse({'username': user.username, 'reset_url': link,
            'selection': selection, 'expires_in_seconds': settings.PASSWORD_RESET_TIMEOUT})
        response['Referrer-Policy'] = 'no-referrer'
        return response
