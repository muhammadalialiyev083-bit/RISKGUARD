from django.db import DatabaseError, connection
from django.http import JsonResponse
from django.views.decorators.cache import never_cache
from django.views.decorators.http import require_GET


@require_GET
@never_cache
def health(request):
    """Process liveness probe; deliberately avoids database work."""
    return JsonResponse({'status': 'ok'})


@require_GET
@never_cache
def readiness(request):
    """Readiness probe used after Render wakes and before session bootstrap."""
    try:
        with connection.cursor() as cursor:
            cursor.execute('SELECT 1')
            cursor.fetchone()
    except DatabaseError:
        return JsonResponse({'status': 'unavailable'}, status=503)
    return JsonResponse({'status': 'ready'})
