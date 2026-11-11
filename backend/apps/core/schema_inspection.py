"""Temporary, authenticated read-only schema inspection for a legacy upgrade.

Never returns application rows, connection settings or credentials. Disabled
unless an expiring machine token is explicitly configured by the operator.
"""
import hmac
import os
import time
from django.db import connection, transaction
from django.http import HttpResponseNotFound, JsonResponse
from django.views.decorators.cache import never_cache
from django.views.decorators.http import require_GET

PREFIX = r'^(authentication|organizations|processes|bia|risks|engine|plans|simulation|core|django|auth)_'


@never_cache
@require_GET
def inspect_schema(request):
    token = os.environ.get('UZHI_COMPAT_INSPECTION_TOKEN', '')
    supplied = request.headers.get('Authorization', '')
    try:
        expires = int(os.environ.get('UZHI_COMPAT_INSPECTION_EXPIRES', '0'))
    except ValueError:
        expires = 0
    if len(token) < 32 or time.time() >= expires or not hmac.compare_digest(supplied.encode(), ('Bearer ' + token).encode()):
        return HttpResponseNotFound()
    if connection.vendor != 'postgresql':
        return JsonResponse({'detail': 'PostgreSQL schema inspection unavailable.'}, status=503)
    try:
        with transaction.atomic():
            with connection.cursor() as cursor:
                cursor.execute('SET TRANSACTION READ ONLY')
                cursor.execute("SET LOCAL statement_timeout = '15s'")
                cursor.execute('''
                    SELECT table_name,column_name,data_type,udt_name,is_nullable,column_default,
                           character_maximum_length,numeric_precision,numeric_scale
                    FROM information_schema.columns
                    WHERE table_schema=current_schema() AND table_name ~ %s
                    ORDER BY table_name,ordinal_position
                ''', [PREFIX])
                fields = ['table','column','type','udt','nullable','default','max_length','precision','scale']
                columns = [dict(zip(fields, row)) for row in cursor.fetchall()]
                for column in columns:
                    if any(word in column['column'].lower() for word in ('password','secret','token','credential','api_key')):
                        column['has_default'] = column['default'] is not None
                        column['default'] = '<redacted>' if column['has_default'] else None
                cursor.execute('''
                    SELECT t.relname,c.conname,c.contype,pg_get_constraintdef(c.oid)
                    FROM pg_constraint c JOIN pg_class t ON t.oid=c.conrelid
                    JOIN pg_namespace n ON n.oid=t.relnamespace
                    WHERE n.nspname=current_schema() AND t.relname ~ %s
                    ORDER BY t.relname,c.conname
                ''', [PREFIX])
                constraints = [dict(zip(['table','name','type','definition'], row)) for row in cursor.fetchall()]
                cursor.execute('''
                    SELECT tablename,indexname,indexdef FROM pg_indexes
                    WHERE schemaname=current_schema() AND tablename ~ %s
                    ORDER BY tablename,indexname
                ''', [PREFIX])
                indexes = [dict(zip(['table','name','definition'], row)) for row in cursor.fetchall()]
                cursor.execute('''
                    SELECT c.relname,t.tgname,pg_get_triggerdef(t.oid)
                    FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid
                    JOIN pg_namespace n ON n.oid=c.relnamespace
                    WHERE n.nspname=current_schema() AND NOT t.tgisinternal AND c.relname ~ %s
                    ORDER BY c.relname,t.tgname
                ''', [PREFIX])
                triggers = [dict(zip(['table','name','definition'], row)) for row in cursor.fetchall()]
                cursor.execute('SELECT app,name FROM django_migrations ORDER BY app,name')
                migrations = [dict(zip(['app','name'], row)) for row in cursor.fetchall()]
        response = JsonResponse({'format':1,'columns':columns,'constraints':constraints,
                                 'indexes':indexes,'triggers':triggers,'applied_migrations':migrations})
        response['X-Robots-Tag'] = 'noindex, nofollow'
        return response
    except Exception:
        return JsonResponse({'detail': 'Read-only inspection did not complete.'}, status=503)
