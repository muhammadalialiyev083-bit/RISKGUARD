"""Initial schema migration with all 15+ BCMS tables.

Revision ID: 0001_initial_schema
Revises: 
Create Date: 2026-10-14 15:55:00
"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = '0001_initial_schema'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Organizations
    op.create_table(
        'organizations',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('sector', sa.String(length=100), nullable=False),
        sa.Column('timezone', sa.String(length=50), server_default='Asia/Tashkent', nullable=False),
        sa.Column('max_acceptable_loss', sa.Numeric(precision=18, scale=2), server_default='500000000.00', nullable=False),
        sa.Column('risk_low_threshold', sa.Integer(), server_default='6', nullable=False),
        sa.Column('risk_medium_threshold', sa.Integer(), server_default='14', nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name'),
    )

    # 2. Departments
    op.create_table(
        'departments',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('organization_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=200), nullable=False),
        sa.Column('head_name', sa.String(length=150), server_default='', nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('organization_id', 'name'),
    )

    # 3. Users
    op.create_table(
        'users',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('username', sa.String(length=150), nullable=False),
        sa.Column('email', sa.String(length=254), server_default='', nullable=False),
        sa.Column('hashed_password', sa.String(length=255), nullable=False),
        sa.Column('first_name', sa.String(length=150), server_default='', nullable=False),
        sa.Column('last_name', sa.String(length=150), server_default='', nullable=False),
        sa.Column('role', sa.String(length=20), server_default='PROCESS_OWNER', nullable=False),
        sa.Column('organization_id', sa.Integer(), nullable=True),
        sa.Column('department_id', sa.Integer(), nullable=True),
        sa.Column('phone', sa.String(length=30), server_default='', nullable=False),
        sa.Column('is_active', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('is_superuser', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('date_joined', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column('last_login', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['department_id'], ['departments.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('username'),
    )

    # 4. Services
    op.create_table(
        'services',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('organization_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), server_default='', nullable=False),
        sa.Column('owner_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['owner_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('organization_id', 'name'),
    )

    # 5. Business Processes
    op.create_table(
        'business_processes',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('organization_id', sa.Integer(), nullable=False),
        sa.Column('service_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=200), nullable=False),
        sa.Column('description', sa.Text(), server_default='', nullable=False),
        sa.Column('owner_id', sa.Integer(), nullable=True),
        sa.Column('criticality', sa.String(length=20), server_default='HIGH', nullable=False),
        sa.Column('status', sa.String(length=20), server_default='ACTIVE', nullable=False),
        sa.Column('is_deleted', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['service_id'], ['services.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['owner_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('organization_id', 'name'),
    )

    # 6. Assets
    op.create_table(
        'assets',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('organization_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=200), nullable=False),
        sa.Column('type', sa.String(length=20), nullable=False),
        sa.Column('description', sa.Text(), server_default='', nullable=False),
        sa.Column('owner_id', sa.Integer(), nullable=True),
        sa.Column('is_deleted', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['owner_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('organization_id', 'name'),
    )

    # 7. Dependencies
    op.create_table(
        'dependencies',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('organization_id', sa.Integer(), nullable=False),
        sa.Column('from_type', sa.String(length=20), nullable=False),
        sa.Column('from_id', sa.Integer(), nullable=False),
        sa.Column('to_type', sa.String(length=20), nullable=False),
        sa.Column('to_id', sa.Integer(), nullable=False),
        sa.Column('dependency_criticality', sa.String(length=20), server_default='MANDATORY', nullable=False),
        sa.Column('notes', sa.Text(), server_default='', nullable=False),
        sa.Column('is_deleted', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_dep_from', 'dependencies', ['organization_id', 'from_type', 'from_id'])
    op.create_index('ix_dep_to', 'dependencies', ['organization_id', 'to_type', 'to_id'])

    # 8. BIA Assessments
    op.create_table(
        'bia_assessments',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('organization_id', sa.Integer(), nullable=False),
        sa.Column('process_id', sa.Integer(), nullable=False),
        sa.Column('revision', sa.Integer(), server_default='1', nullable=False),
        sa.Column('mtpd_hours', sa.Numeric(precision=6, scale=2), nullable=False),
        sa.Column('rto_hours', sa.Numeric(precision=6, scale=2), nullable=False),
        sa.Column('rpo_minutes', sa.Integer(), server_default='60', nullable=False),
        sa.Column('backup_interval_minutes', sa.Integer(), server_default='60', nullable=False),
        sa.Column('status', sa.String(length=20), server_default='DRAFT', nullable=False),
        sa.Column('approved_by_id', sa.Integer(), nullable=True),
        sa.Column('approved_at', sa.DateTime(), nullable=True),
        sa.Column('comments', sa.Text(), server_default='', nullable=False),
        sa.Column('is_deleted', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['process_id'], ['business_processes.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['approved_by_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )

    # 9. BIA Impacts
    op.create_table(
        'bia_impacts',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('bia_id', sa.Integer(), nullable=False),
        sa.Column('horizon_hours', sa.Numeric(precision=6, scale=2), nullable=False),
        sa.Column('financial_loss', sa.Numeric(precision=18, scale=2), server_default='0', nullable=False),
        sa.Column('operational_score', sa.SmallInteger(), server_default='1', nullable=False),
        sa.Column('legal_score', sa.SmallInteger(), server_default='1', nullable=False),
        sa.Column('reputational_score', sa.SmallInteger(), server_default='1', nullable=False),
        sa.ForeignKeyConstraint(['bia_id'], ['bia_assessments.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('bia_id', 'horizon_hours'),
    )

    # 10. Risks
    op.create_table(
        'risks',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('organization_id', sa.Integer(), nullable=False),
        sa.Column('process_id', sa.Integer(), nullable=False),
        sa.Column('asset_id', sa.Integer(), nullable=True),
        sa.Column('threat', sa.String(length=255), nullable=False),
        sa.Column('vulnerability', sa.Text(), server_default='', nullable=False),
        sa.Column('likelihood', sa.SmallInteger(), server_default='3', nullable=False),
        sa.Column('impact', sa.SmallInteger(), server_default='3', nullable=False),
        sa.Column('likelihood_residual', sa.SmallInteger(), nullable=True),
        sa.Column('impact_residual', sa.SmallInteger(), nullable=True),
        sa.Column('owner_id', sa.Integer(), nullable=True),
        sa.Column('status', sa.String(length=20), server_default='IDENTIFIED', nullable=False),
        sa.Column('is_deleted', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['process_id'], ['business_processes.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['asset_id'], ['assets.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['owner_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )

    # 11. Controls
    op.create_table(
        'controls',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('risk_id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), server_default='', nullable=False),
        sa.Column('status', sa.String(length=20), server_default='PLANNED', nullable=False),
        sa.Column('effectiveness_evidence', sa.Text(), server_default='', nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['risk_id'], ['risks.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )

    # 12. Strategies
    op.create_table(
        'strategies',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('organization_id', sa.Integer(), nullable=False),
        sa.Column('process_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), server_default='', nullable=False),
        sa.Column('estimated_rto_hours', sa.Numeric(precision=6, scale=2), nullable=False),
        sa.Column('estimated_rpo_minutes', sa.Integer(), nullable=False),
        sa.Column('estimated_cost', sa.Numeric(precision=18, scale=2), server_default='0', nullable=False),
        sa.Column('is_selected', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('is_deleted', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['process_id'], ['business_processes.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )

    # 13. Continuity Plans
    op.create_table(
        'continuity_plans',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('organization_id', sa.Integer(), nullable=False),
        sa.Column('process_id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('version', sa.String(length=20), server_default='1.0', nullable=False),
        sa.Column('scope', sa.Text(), server_default='', nullable=False),
        sa.Column('status', sa.String(length=20), server_default='DRAFT', nullable=False),
        sa.Column('approved_by_id', sa.Integer(), nullable=True),
        sa.Column('approved_at', sa.DateTime(), nullable=True),
        sa.Column('is_deleted', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['process_id'], ['business_processes.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['approved_by_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )

    # 14. Plan Steps
    op.create_table(
        'plan_steps',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('plan_id', sa.Integer(), nullable=False),
        sa.Column('sequence', sa.SmallInteger(), server_default='1', nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), server_default='', nullable=False),
        sa.Column('assigned_to_id', sa.Integer(), nullable=True),
        sa.Column('expected_duration_minutes', sa.Integer(), server_default='30', nullable=False),
        sa.ForeignKeyConstraint(['plan_id'], ['continuity_plans.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['assigned_to_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )

    # 15. Scenarios
    op.create_table(
        'scenarios',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('organization_id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), server_default='', nullable=False),
        sa.Column('disrupted_asset_ids', sa.JSON().with_variant(postgresql.JSONB(), 'postgresql'), nullable=False),
        sa.Column('estimated_outage_hours', sa.Numeric(precision=6, scale=2), server_default='8.0', nullable=False),
        sa.Column('is_deleted', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )

    # 16. Exercises
    op.create_table(
        'exercises',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('organization_id', sa.Integer(), nullable=False),
        sa.Column('plan_id', sa.Integer(), nullable=False),
        sa.Column('scenario_id', sa.Integer(), nullable=True),
        sa.Column('exercise_date', sa.Date(), nullable=False),
        sa.Column('actual_recovery_hours', sa.Numeric(precision=6, scale=2), nullable=False),
        sa.Column('outcome', sa.String(length=20), server_default='SUCCESS', nullable=False),
        sa.Column('findings', sa.Text(), server_default='', nullable=False),
        sa.Column('is_deleted', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['plan_id'], ['continuity_plans.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['scenario_id'], ['scenarios.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )

    # 17. Audit Logs
    op.create_table(
        'audit_logs',
        sa.Column('id', sa.Uuid(as_uuid=True), nullable=False),
        sa.Column('organization_id', sa.Integer(), nullable=True),
        sa.Column('actor_id', sa.Integer(), nullable=True),
        sa.Column('action', sa.String(length=20), nullable=False),
        sa.Column('entity', sa.String(length=100), nullable=False),
        sa.Column('entity_id', sa.String(length=100), server_default='', nullable=False),
        sa.Column('before_state', sa.JSON().with_variant(postgresql.JSONB(), 'postgresql'), nullable=False),
        sa.Column('after_state', sa.JSON().with_variant(postgresql.JSONB(), 'postgresql'), nullable=False),
        sa.Column('timestamp', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column('ip_address', sa.String(length=45), nullable=True),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['actor_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_audit_org_ts', 'audit_logs', ['organization_id', 'timestamp'])
    op.create_index('ix_audit_entity', 'audit_logs', ['entity', 'entity_id'])


def downgrade() -> None:
    op.drop_table('audit_logs')
    op.drop_table('exercises')
    op.drop_table('scenarios')
    op.drop_table('plan_steps')
    op.drop_table('continuity_plans')
    op.drop_table('strategies')
    op.drop_table('controls')
    op.drop_table('risks')
    op.drop_table('bia_impacts')
    op.drop_table('bia_assessments')
    op.drop_table('dependencies')
    op.drop_table('assets')
    op.drop_table('business_processes')
    op.drop_table('services')
    op.drop_table('users')
    op.drop_table('departments')
    op.drop_table('organizations')
