"""Fail-closed PostgreSQL release gate for the two additive UzHi migrations.

Run ``python release.py --check`` during build and ``python release.py`` before
Gunicorn starts. No seed, reset, fake migration, data dump, or fingerprint logging.
"""
import argparse
import hashlib
import hmac
import json
import os
import sys
from dataclasses import dataclass, field
from urllib.parse import urlparse

ALLOWED = {
    ('authentication', '0003_authratelimit_user_preferences_googleidentity'),
    ('operations', '0001_initial'),
}
NEW_MODELS = {
    ('authentication', 'authratelimit'), ('authentication', 'googleidentity'),
    ('operations', 'provider'), ('operations', 'incident'),
    ('operations', 'incidentevent'), ('operations', 'simulationrun'),
    ('operations', 'improvementtask'),
}
NEW_TABLES = {f'{app}_{model}' for app, model in NEW_MODELS} | {
    'operations_provider_assets', 'operations_provider_services',
}
METADATA_TABLES = {'django_migrations', 'django_content_type', 'auth_permission'}
ADVISORY_LOCK = 846711097
# Bounded status codes keep deployment diagnostics usable without exposing logs.
EXIT_CODES = {
    'RELEASE_DEBUG': 51, 'RELEASE_SECRET': 52, 'RELEASE_DATABASE': 53,
    'RELEASE_ENGINE': 54, 'RELEASE_HISTORY': 55, 'RELEASE_BASELINE': 56,
    'RELEASE_PLAN': 57, 'RELEASE_SCHEMA': 58, 'RELEASE_SNAPSHOT': 59,
    'RELEASE_PRESERVATION': 60, 'RELEASE_METADATA': 61, 'RELEASE_POSTCHECK': 62,
}


class ReleaseError(Exception):
    """Only bounded, operator-safe messages may be exposed by this command."""


def require_production(environ, connection=None, debug=False):
    if environ.get('DEBUG', '').lower() != 'false' or debug:
        raise ReleaseError('RELEASE_DEBUG: explicitly configure DEBUG=False.')
    if not environ.get('SECRET_KEY', '').strip():
        raise ReleaseError('RELEASE_SECRET: preserve and configure the existing SECRET_KEY.')
    if urlparse(environ.get('DATABASE_URL', '')).scheme not in {'postgres', 'postgresql'}:
        raise ReleaseError('RELEASE_DATABASE: an explicit PostgreSQL DATABASE_URL is required.')
    if connection is not None and connection.vendor != 'postgresql':
        raise ReleaseError('RELEASE_ENGINE: the active Django connection must be PostgreSQL.')


def validate_plan(executor):
    loader = executor.loader
    try:
        loader.check_consistent_history(executor.connection)
    except Exception as exc:
        raise ReleaseError('RELEASE_HISTORY: inconsistent migration history; review it before release.') from exc
    disk, applied = set(loader.disk_migrations), set(loader.applied_migrations)
    if not ALLOWED <= disk or applied - disk:
        raise ReleaseError('RELEASE_HISTORY: missing source migrations or unknown applied migrations.')
    if (disk - ALLOWED) - applied:
        raise ReleaseError('RELEASE_BASELINE: historical migrations are missing; automatic initialization is prohibited.')
    targets = loader.graph.leaf_nodes()
    plan = executor.migration_plan(targets)
    pending = set()
    for migration, backwards in plan:
        key = (migration.app_label, migration.name)
        if backwards or key not in ALLOWED:
            raise ReleaseError('RELEASE_PLAN: only the reviewed forward UzHi migrations are permitted.')
        pending.add(key)
    if pending != ALLOWED - applied or len(plan) != len(pending):
        raise ReleaseError('RELEASE_PLAN: the pending migration plan does not match the reviewed additions.')
    return targets, pending, applied


def require_schema(connection, executor, tables):
    """History alone must not certify a missing or partially initialized schema."""
    try:
        state = executor.loader.project_state(nodes=list(executor.loader.applied_migrations))
        expected = {}
        for model in state.apps.get_models(include_auto_created=True):
            if model._meta.managed and not model._meta.proxy:
                expected[model._meta.db_table] = {f.column for f in model._meta.local_fields}
        if not {'authentication_user', 'django_migrations'} <= set(tables) or set(expected) - set(tables):
            raise ReleaseError('RELEASE_SCHEMA: a historical table is missing; automatic initialization is prohibited.')
        with connection.cursor() as cursor:
            for table, columns in expected.items():
                present = {column.name for column in connection.introspection.get_table_description(cursor, table)}
                if columns - present:
                    raise ReleaseError('RELEASE_SCHEMA: historical schema and migration records disagree.')
    except ReleaseError:
        raise
    except Exception as exc:
        raise ReleaseError('RELEASE_SCHEMA: the historical schema could not be verified.') from exc


def _json_value(value):
    if isinstance(value, (bytes, bytearray, memoryview)):
        return {'bytes': bytes(value).hex()}
    if hasattr(value, 'isoformat'):
        return value.isoformat()
    return str(value)


def _fingerprint(cursor, sql, params, key):
    digest, count = hmac.new(key, digestmod=hashlib.sha256), 0
    cursor.execute(sql, params)
    while rows := cursor.fetchmany(500):
        for row in rows:
            payload = json.dumps(row, default=_json_value, sort_keys=True, ensure_ascii=False,
                                 separators=(',', ':')).encode()
            digest.update(len(payload).to_bytes(8, 'big'))
            digest.update(payload)
            count += 1
    return count, digest.digest()


@dataclass
class TableSnapshot:
    columns: tuple
    primary_key: str
    count: int
    digest: bytes = field(repr=False)
    existing_ids: tuple | None = field(default=None, repr=False)


def snapshot_tables(connection, tables, key):
    snapshots = {}
    quote = connection.ops.quote_name
    with connection.cursor() as cursor:
        for table in sorted(tables):
            columns = tuple(c.name for c in connection.introspection.get_table_description(cursor, table))
            constraints = connection.introspection.get_constraints(cursor, table)
            primary_keys = [c['columns'] for c in constraints.values() if c.get('primary_key')]
            if len(primary_keys) != 1 or len(primary_keys[0]) != 1:
                raise ReleaseError('RELEASE_SNAPSHOT: a legacy table lacks a supported primary key.')
            pk = primary_keys[0][0]
            sql = f'SELECT {", ".join(map(quote, columns))} FROM {quote(table)} ORDER BY {quote(pk)}'
            count, digest = _fingerprint(cursor, sql, [], key)
            ids = None
            if table in METADATA_TABLES:
                cursor.execute(f'SELECT {quote(pk)} FROM {quote(table)} ORDER BY {quote(pk)}')
                ids = tuple(row[0] for row in cursor.fetchall())
            snapshots[table] = TableSnapshot(columns, pk, count, digest, ids)
    return snapshots


def verify_preserved_rows(connection, snapshots, key):
    quote = connection.ops.quote_name
    with connection.cursor() as cursor:
        for table, before in snapshots.items():
            where, params = '', []
            if before.existing_ids is not None:
                where = (' WHERE ' + quote(before.primary_key) + ' IN (' +
                         ','.join(['%s'] * len(before.existing_ids)) + ')') if before.existing_ids else ' WHERE FALSE'
                params = list(before.existing_ids)
            sql = (f'SELECT {", ".join(map(quote, before.columns))} FROM {quote(table)}'
                   f'{where} ORDER BY {quote(before.primary_key)}')
            count, digest = _fingerprint(cursor, sql, params, key)
            if count != before.count or not hmac.compare_digest(digest, before.digest):
                raise ReleaseError('RELEASE_PRESERVATION: existing rows changed; the transaction is being rolled back.')


def verify_metadata(connection, snapshots, pending):
    """Allow post_migrate to add only the seven new content types and permissions."""
    quote = connection.ops.quote_name
    with connection.cursor() as cursor:
        def additions(table, columns):
            before = snapshots[table]
            cursor.execute(f'SELECT {quote(before.primary_key)}, {columns} FROM {quote(table)}')
            old_ids = set(before.existing_ids)
            return [row[1:] for row in cursor.fetchall() if row[0] not in old_ids]

        migration_rows = additions('django_migrations', 'app, name')
        if len(migration_rows) != len(pending) or set(migration_rows) != pending:
            raise ReleaseError('RELEASE_METADATA: unexpected migration records were added.')
        if any(tuple(row) not in NEW_MODELS for row in additions('django_content_type', 'app_label, model')):
            raise ReleaseError('RELEASE_METADATA: unexpected content types were added.')
        old_permission_ids = set(snapshots['auth_permission'].existing_ids)
        cursor.execute('SELECT p.id, c.app_label, c.model, p.codename FROM auth_permission p '
                       'JOIN django_content_type c ON c.id = p.content_type_id')
        expected = {(app, model, f'{action}_{model}') for app, model in NEW_MODELS
                    for action in ('add', 'change', 'delete', 'view')}
        permission_rows = cursor.fetchall()
        if any(tuple(row[1:]) not in expected for row in permission_rows if row[0] not in old_permission_ids):
            raise ReleaseError('RELEASE_METADATA: unexpected permissions were added.')
        if not expected <= {tuple(row[1:]) for row in permission_rows}:
            raise ReleaseError('RELEASE_METADATA: expected new permissions are missing.')


class _Discard:
    def write(self, value):
        return len(value)

    def flush(self):
        pass


def run_gate(connection, executor_class, atomic, migrate, check=False):
    """Injected boundaries keep tests meaningful without touching a production DB."""
    with atomic():
        with connection.cursor() as cursor:
            if check:
                cursor.execute('SET TRANSACTION READ ONLY')
            else:
                cursor.execute("SET LOCAL lock_timeout = '15s'")
                cursor.execute("SET LOCAL statement_timeout = '120s'")
                cursor.execute('SELECT pg_advisory_xact_lock(%s)', [ADVISORY_LOCK])
            tables = set(connection.introspection.table_names(cursor))
            if not {'django_migrations', 'django_content_type', 'auth_permission', 'authentication_user'} <= tables:
                raise ReleaseError('RELEASE_BASELINE: required historical tables are missing.')
            if not check:
                quoted = ', '.join(connection.ops.quote_name(t) for t in sorted(tables))
                cursor.execute(f'LOCK TABLE {quoted} IN SHARE ROW EXCLUSIVE MODE')
        executor = executor_class(connection)
        targets, pending, applied = validate_plan(executor)
        require_schema(connection, executor, tables)
        if check:
            return pending
        key = os.urandom(32)
        snapshots = snapshot_tables(connection, tables, key)
        migrate('migrate', interactive=False, verbosity=0, stdout=_Discard(), stderr=_Discard())
        fresh = executor_class(connection)
        _, remaining, after_applied = validate_plan(fresh)
        if remaining or after_applied != applied | pending:
            raise ReleaseError('RELEASE_POSTCHECK: migration history does not match the reviewed plan.')
        with connection.cursor() as cursor:
            after_tables = set(connection.introspection.table_names(cursor))
        if tables - after_tables or (after_tables - tables) - NEW_TABLES:
            raise ReleaseError('RELEASE_POSTCHECK: unexpected table changes were detected.')
        require_schema(connection, fresh, after_tables)
        verify_preserved_rows(connection, snapshots, key)
        verify_metadata(connection, snapshots, pending)
        return pending


def main(argv=None):
    args = argparse.ArgumentParser(description=__doc__)
    args.add_argument('--check', action='store_true', help='Read-only migration and schema preflight.')
    options = args.parse_args(argv)
    try:
        require_production(os.environ)
        os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bcms_backend.settings')
        import django
        django.setup()
        from django.conf import settings
        from django.core.management import call_command
        from django.db import connection, transaction
        from django.db.migrations.executor import MigrationExecutor
        require_production(os.environ, connection, settings.DEBUG)
        pending = run_gate(connection, MigrationExecutor, transaction.atomic, call_command, check=options.check)
        mode = 'preflight passed (read only)' if options.check else 'passed; existing rows and accounts preserved'
        print('UzHi release gate ' + mode + '. Pending/applied reviewed additions: ' +
              (', '.join(f'{app}.{name}' for app, name in sorted(pending)) or 'none'))
        return 0
    except ReleaseError as exc:
        print(str(exc), file=sys.stderr)
        return EXIT_CODES.get(str(exc).partition(':')[0], 1)
    except Exception:
        # DB/provider exception messages can contain connection details. Do not dump them.
        print('RELEASE_FAILURE: release verification did not complete; startup is blocked. Recheck migration history before retrying.', file=sys.stderr)
    return 1


if __name__ == '__main__':
    raise SystemExit(main())
