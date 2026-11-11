"""Release gates exercised locally; these tests never connect to production."""
import sqlite3
from contextlib import contextmanager
from types import SimpleNamespace
from unittest.mock import Mock

import pytest

import release

BASELINE = {('authentication', '0002_initial'), ('organizations', '0001_initial')}
TABLES = {'django_migrations', 'django_content_type', 'auth_permission', 'authentication_user'}


def executor(applied=BASELINE, plan=None):
    pending = release.ALLOWED - set(applied)
    loader = SimpleNamespace(
        disk_migrations={key: object() for key in BASELINE | release.ALLOWED},
        applied_migrations={key: object() for key in applied},
        check_consistent_history=Mock(), graph=SimpleNamespace(leaf_nodes=lambda: ['leaves']))
    if plan is None:
        plan = [(SimpleNamespace(app_label=app, name=name), False) for app, name in sorted(pending)]
    return SimpleNamespace(loader=loader, connection=object(), migration_plan=lambda targets: plan)


def test_plan_accepts_only_reviewed_forward_additions_and_restarts():
    assert release.validate_plan(executor())[1] == release.ALLOWED
    assert release.validate_plan(executor(BASELINE | release.ALLOWED))[1] == set()
    partly_applied = BASELINE | {next(iter(release.ALLOWED))}
    assert len(release.validate_plan(executor(partly_applied))[1]) == 1


@pytest.mark.parametrize('fault', ['historical_gap', 'unknown_applied', 'missing_source', 'inconsistent', 'reverse', 'unexpected', 'duplicate'])
def test_plan_rejects_unreviewed_or_inconsistent_history(fault):
    obj = executor()
    if fault == 'historical_gap':
        obj.loader.applied_migrations.pop(next(iter(BASELINE)))
    elif fault == 'unknown_applied':
        obj.loader.applied_migrations[('lost_source', '0001_initial')] = object()
    elif fault == 'missing_source':
        obj.loader.disk_migrations.pop(next(iter(release.ALLOWED)))
    elif fault == 'inconsistent':
        obj.loader.check_consistent_history.side_effect = ValueError('untrusted exception text')
    else:
        migration = SimpleNamespace(app_label='authentication', name='0003_authratelimit_user_preferences_googleidentity')
        plans = {'reverse': [(migration, True)],
                 'unexpected': [(SimpleNamespace(app_label='unreviewed', name='0001_initial'), False)],
                 'duplicate': [(migration, False), (migration, False)]}
        obj.migration_plan = lambda targets: plans[fault]
    with pytest.raises(release.ReleaseError):
        release.validate_plan(obj)


@pytest.mark.parametrize('changed', [
    {'DEBUG': 'true'}, {'DEBUG': ''}, {'SECRET_KEY': ''},
    {'DATABASE_URL': 'sqlite:///unexpected.sqlite3'}, {'DATABASE_URL': ''},
])
def test_production_configuration_fails_closed(changed):
    values = {'DEBUG': 'False', 'SECRET_KEY': 'existing-secret-never-printed',
              'DATABASE_URL': 'postgresql://existing-db/production'}
    values.update(changed)
    with pytest.raises(release.ReleaseError):
        release.require_production(values)


def test_actual_engine_and_settings_debug_must_match_production():
    values = {'DEBUG': 'false', 'SECRET_KEY': 'existing-secret', 'DATABASE_URL': 'postgres://existing-db/production'}
    release.require_production(values, SimpleNamespace(vendor='postgresql'))
    with pytest.raises(release.ReleaseError):
        release.require_production(values, SimpleNamespace(vendor='sqlite'))
    with pytest.raises(release.ReleaseError):
        release.require_production(values, SimpleNamespace(vendor='postgresql'), debug=True)


class LocalCursor:
    def __init__(self, owner):
        self.owner, self.raw = owner, owner.db.cursor()

    def __enter__(self):
        return self

    def __exit__(self, *args):
        self.raw.close()

    def execute(self, sql, params=()):
        self.owner.statements.append(sql)
        # SQLite fixtures exercise all data invariants, while PostgreSQL-only
        # lock statements are captured and inspected instead of emulated.
        if sql.startswith(('SET ', 'LOCK TABLE ', 'SELECT pg_advisory_xact_lock')):
            return
        self.raw.execute(sql.replace('%s', '?'), params)

    def fetchmany(self, size):
        return self.raw.fetchmany(size)

    def fetchall(self):
        return self.raw.fetchall()


class LocalConnection:
    def __init__(self):
        self.db = sqlite3.connect(':memory:')
        self.statements = []
        self.ops = SimpleNamespace(quote_name=lambda name: '"' + name.replace('"', '""') + '"')
        self.introspection = SimpleNamespace(table_names=self.table_names,
                                             get_table_description=self.describe,
                                             get_constraints=self.constraints)
        self.db.executescript('''
            CREATE TABLE django_migrations (id INTEGER PRIMARY KEY, app TEXT, name TEXT, applied TEXT);
            CREATE TABLE django_content_type (id INTEGER PRIMARY KEY, app_label TEXT, model TEXT);
            CREATE TABLE auth_permission (id INTEGER PRIMARY KEY, content_type_id INTEGER, codename TEXT, name TEXT);
            CREATE TABLE authentication_user (id INTEGER PRIMARY KEY, username TEXT, password TEXT, organization_id INTEGER);
            INSERT INTO authentication_user VALUES (1, 'existing-account', 'opaque-existing-password-hash', 12);
            INSERT INTO django_content_type VALUES (1, 'authentication', 'user');
            INSERT INTO auth_permission VALUES (1, 1, 'add_user', 'Can add user');
        ''')
        self.db.executemany('INSERT INTO django_migrations (app,name,applied) VALUES (?,?,?)',
                            [(app, name, 'existing-timestamp') for app, name in sorted(BASELINE)])
        self.db.commit()

    def cursor(self):
        return LocalCursor(self)

    def table_names(self, cursor):
        return [row[0] for row in self.db.execute("SELECT name FROM sqlite_master WHERE type='table'")]

    def describe(self, cursor, table):
        return [SimpleNamespace(name=row[1]) for row in self.db.execute(f'PRAGMA table_info("{table}")')]

    def constraints(self, cursor, table):
        pk = [row[1] for row in self.db.execute(f'PRAGMA table_info("{table}")') if row[5]]
        return {'primary': {'primary_key': True, 'columns': pk}}

    @contextmanager
    def atomic(self):
        self.db.execute('BEGIN')
        try:
            yield
        except Exception:
            self.db.rollback()
            raise
        else:
            self.db.commit()

    def current_executor(self, connection):
        applied = {(row[0], row[1]) for row in self.db.execute('SELECT app,name FROM django_migrations')}
        return executor(applied)

    def reviewed_migration(self, *args, **kwargs):
        self.db.execute("ALTER TABLE authentication_user ADD COLUMN preferences TEXT NOT NULL DEFAULT '{}'")
        self.db.execute('CREATE TABLE operations_provider (id INTEGER PRIMARY KEY, name TEXT)')
        self.db.executemany('INSERT INTO django_migrations (app,name,applied) VALUES (?,?,?)',
                            [(app, name, 'new-timestamp') for app, name in sorted(release.ALLOWED)])
        for app, model in sorted(release.NEW_MODELS):
            ct = self.db.execute('INSERT INTO django_content_type (app_label,model) VALUES (?,?)', (app, model)).lastrowid
            self.db.executemany('INSERT INTO auth_permission (content_type_id,codename,name) VALUES (?,?,?)',
                                [(ct, f'{action}_{model}', f'Can {action} {model}')
                                 for action in ('add', 'change', 'delete', 'view')])


@pytest.fixture
def local():
    connection = LocalConnection()
    try:
        yield connection
    finally:
        connection.db.close()


def test_check_mode_is_read_only_and_never_locks_or_migrates(local, monkeypatch):
    schema_check = Mock()
    monkeypatch.setattr(release, 'require_schema', schema_check)
    migrate = Mock()
    before = local.db.total_changes
    assert release.run_gate(local, local.current_executor, local.atomic, migrate, check=True) == release.ALLOWED
    assert local.db.total_changes == before
    assert 'SET TRANSACTION READ ONLY' in local.statements
    assert not any('LOCK' in sql or 'pg_advisory' in sql for sql in local.statements)
    migrate.assert_not_called()
    schema_check.assert_called_once()


def test_historical_schema_must_match_recorded_migration_state(local):
    columns = ['id', 'username', 'password', 'organization_id']
    model = SimpleNamespace(_meta=SimpleNamespace(managed=True, proxy=False,
                            db_table='authentication_user',
                            local_fields=[SimpleNamespace(column=column) for column in columns]))
    state = SimpleNamespace(apps=SimpleNamespace(get_models=lambda **kwargs: [model]))
    obj = executor()
    obj.loader.project_state = lambda **kwargs: state
    release.require_schema(local, obj, TABLES)
    model._meta.local_fields.append(SimpleNamespace(column='unrecorded_missing_column'))
    with pytest.raises(release.ReleaseError, match='RELEASE_SCHEMA'):
        release.require_schema(local, obj, TABLES)
    with pytest.raises(release.ReleaseError, match='RELEASE_SCHEMA'):
        release.require_schema(local, obj, TABLES - {'authentication_user'})


def test_an_empty_database_is_never_initialized_by_release(local):
    local.db.execute('DROP TABLE authentication_user')
    local.db.commit()
    migrate = Mock()
    with pytest.raises(release.ReleaseError, match='RELEASE_BASELINE'):
        release.run_gate(local, local.current_executor, local.atomic, migrate, check=True)
    migrate.assert_not_called()


def test_apply_preserves_every_old_column_and_allows_only_expected_metadata(local, monkeypatch):
    monkeypatch.setattr(release, 'require_schema', Mock())
    assert release.run_gate(local, local.current_executor, local.atomic, local.reviewed_migration) == release.ALLOWED
    row = local.db.execute('SELECT username,password,organization_id,preferences FROM authentication_user').fetchone()
    assert row == ('existing-account', 'opaque-existing-password-hash', 12, '{}')
    assert any(sql.startswith('SELECT pg_advisory_xact_lock') for sql in local.statements)
    assert any(sql.startswith('LOCK TABLE ') for sql in local.statements)
    # A subsequent restart has no pending schema or metadata work.
    assert release.run_gate(local, local.current_executor, local.atomic, lambda *a, **k: None) == set()


@pytest.mark.parametrize('damage', ['password', 'business_row', 'unexpected_metadata', 'unexpected_table'])
def test_preservation_failure_rolls_back_schema_history_and_data(local, monkeypatch, damage):
    monkeypatch.setattr(release, 'require_schema', Mock())

    def broken_migration(*args, **kwargs):
        local.reviewed_migration()
        statements = {
            'password': "UPDATE authentication_user SET password='reset-hash' WHERE id=1",
            'business_row': "UPDATE authentication_user SET organization_id=999 WHERE id=1",
            'unexpected_metadata': "INSERT INTO django_content_type (app_label,model) VALUES ('foreign','unreviewed')",
            'unexpected_table': 'CREATE TABLE unreviewed_table (id INTEGER PRIMARY KEY)',
        }
        local.db.execute(statements[damage])

    with pytest.raises(release.ReleaseError):
        release.run_gate(local, local.current_executor, local.atomic, broken_migration)
    assert {row[1] for row in local.db.execute('PRAGMA table_info(authentication_user)')} == {
        'id', 'username', 'password', 'organization_id'}
    assert local.db.execute('SELECT password,organization_id FROM authentication_user').fetchone() == (
        'opaque-existing-password-hash', 12)
    assert set(local.table_names(None)) == TABLES
    assert release.validate_plan(local.current_executor(local))[1] == release.ALLOWED


def test_fingerprints_are_not_exposed_in_snapshot_representation(local):
    snapshots = release.snapshot_tables(local, TABLES, b'ephemeral-test-key')
    assert 'opaque-existing-password-hash' not in repr(snapshots)
    assert 'digest=' not in repr(snapshots)


def test_cli_does_not_expose_database_exception_details(monkeypatch, capsys):
    monkeypatch.setattr(release, 'require_production', Mock(side_effect=RuntimeError('private-credential')))
    assert release.main(['--check']) == 1
    output = capsys.readouterr()
    assert 'private-credential' not in output.err
    assert 'RELEASE_FAILURE' in output.err


@pytest.mark.parametrize('changes,expected', [
    ({'DEBUG': 'True'}, 51), ({'SECRET_KEY': ''}, 52),
    ({'DATABASE_URL': 'sqlite:///unexpected.sqlite3'}, 53),
])
def test_cli_reports_safe_distinct_configuration_failures(monkeypatch, capsys, changes, expected):
    values = {'DEBUG': 'False', 'SECRET_KEY': 'ephemeral-test-value',
              'DATABASE_URL': 'postgresql://existing-db/production'}
    values.update(changes)
    for key, value in values.items():
        monkeypatch.setenv(key, value)
    assert release.main(['--check']) == expected
    assert 'ephemeral-test-value' not in capsys.readouterr().err


def test_unknown_history_reports_only_bounded_migration_identifiers():
    obj = executor()
    obj.loader.applied_migrations[('retained_app', '0003_retained_history')] = object()
    with pytest.raises(release.ReleaseError, match='retained_app.0003_retained_history'):
        release.validate_plan(obj)
