"""Adopt observed legacy columns without recreating historical migrations.

On an existing database, only validate matching columns/constraints. On a fresh
installation, create them normally. Adoption cannot be reversed by dropping
legacy data; subsequent changes must be explicit forward migrations.
"""
from django.db import migrations, models
from django.db.migrations.exceptions import IrreversibleError


class SchemaAdoptionError(RuntimeError):
    pass


def _columns(schema_editor, model):
    with schema_editor.connection.cursor() as cursor:
        return {c.name: c for c in schema_editor.connection.introspection.get_table_description(cursor, model._meta.db_table)}


def _no_sqlite_column_loss(schema_editor, model, columns):
    if schema_editor.connection.vendor == 'sqlite':
        known = {f.column for f in model._meta.local_fields}
        if set(columns) - known:
            raise SchemaAdoptionError('SCHEMA_ADOPTION: SQLite table rebuild would lose unmodeled columns.')


class AdoptField(migrations.AddField):
    reversible = False

    def database_forwards(self, app_label, schema_editor, from_state, to_state):
        model = to_state.apps.get_model(app_label, self.model_name)
        if not self.allow_migrate_model(schema_editor.connection.alias, model):
            return
        field = model._meta.get_field(self.name)
        columns = _columns(schema_editor, model)
        if field.column not in columns:
            _no_sqlite_column_loss(schema_editor, model, columns)
            return super().database_forwards(app_label, schema_editor, from_state, to_state)
        if schema_editor.connection.vendor == 'postgresql':
            with schema_editor.connection.cursor() as cursor:
                cursor.execute('''SELECT data_type,is_nullable,character_maximum_length,numeric_precision,numeric_scale
                    FROM information_schema.columns WHERE table_schema=current_schema() AND table_name=%s AND column_name=%s''',
                    [model._meta.db_table, field.column])
                row = cursor.fetchone()
            if not row:
                raise SchemaAdoptionError('SCHEMA_ADOPTION: observed column metadata is unavailable.')
            dtype, nullable, length, precision, scale = row
            expected = field.db_type(schema_editor.connection)
            valid = nullable == ('YES' if field.null else 'NO')
            if expected.startswith('varchar('):
                valid = valid and dtype == 'character varying' and length == field.max_length
            elif expected.startswith('numeric('):
                valid = valid and dtype == 'numeric' and precision == field.max_digits and scale == field.decimal_places
            else:
                valid = valid and dtype == expected
            if not valid:
                raise SchemaAdoptionError('SCHEMA_ADOPTION: incompatible column '+model._meta.db_table+'.'+field.column)
        elif str(columns[field.column].type_code).lower() != field.db_type(schema_editor.connection).lower():
            raise SchemaAdoptionError('SCHEMA_ADOPTION: incompatible local column '+field.column)

    def database_backwards(self, *args, **kwargs):
        raise IrreversibleError('Retained legacy columns must not be dropped; use a reviewed forward migration.')


class AdoptConstraint(migrations.AddConstraint):
    reversible = False

    def database_forwards(self, app_label, schema_editor, from_state, to_state):
        model = to_state.apps.get_model(app_label, self.model_name)
        if not self.allow_migrate_model(schema_editor.connection.alias, model):
            return
        with schema_editor.connection.cursor() as cursor:
            constraints = schema_editor.connection.introspection.get_constraints(cursor, model._meta.db_table)
        existing = constraints.get(self.constraint.name)
        if existing:
            expected_kind = 'unique' if isinstance(self.constraint, models.UniqueConstraint) else 'check'
            if not existing.get(expected_kind):
                raise SchemaAdoptionError('SCHEMA_ADOPTION: incompatible constraint '+self.constraint.name)
            return
        _no_sqlite_column_loss(schema_editor, model, _columns(schema_editor, model))
        return super().database_forwards(app_label, schema_editor, from_state, to_state)

    def database_backwards(self, *args, **kwargs):
        raise IrreversibleError('Retained constraints must not be removed by rollback.')


class AlignBIAConstraint(AdoptConstraint):
    """Align the observed strict RTO<MTPD check with the required RTO<=MTPD."""
    def database_forwards(self, app_label, schema_editor, from_state, to_state):
        model = to_state.apps.get_model(app_label, self.model_name)
        if not self.allow_migrate_model(schema_editor.connection.alias, model):
            return
        with schema_editor.connection.cursor() as cursor:
            constraints = schema_editor.connection.introspection.get_constraints(cursor, model._meta.db_table)
        if self.constraint.name in constraints:
            if schema_editor.connection.vendor == 'postgresql':
                schema_editor.remove_constraint(model, self.constraint)
                schema_editor.add_constraint(model, self.constraint)
            elif schema_editor.connection.vendor == 'sqlite':
                _no_sqlite_column_loss(schema_editor, model, _columns(schema_editor, model))
                schema_editor._remake_table(model)
            else:
                raise SchemaAdoptionError('SCHEMA_ADOPTION: unsupported BIA constraint adapter.')
        else:
            super().database_forwards(app_label, schema_editor, from_state, to_state)
