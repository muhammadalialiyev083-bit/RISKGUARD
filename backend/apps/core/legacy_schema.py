"""Explicit forward adoption of the observed deployed schema; no historical replay."""

RETAINED_HISTORY = {
    # The unused token app is retired; its history and any existing table remain.
    ('authtoken', '0001_initial'),
    ('authtoken', '0002_auto_20160226_1747'),
    ('authtoken', '0003_tokenproxy'),
    ('authtoken', '0004_alter_tokenproxy_options'),
    ('authentication', '0003_bootstrap_initial_admin'),
    ('bia', '0003_biaassessment_data_source_and_more'),
    ('bia', '0004_biaassessment_bia_rto_before_mtpd_and_more'),
    ('bia', '0005_biaassessment_backup_interval_seconds_and_more'),
    ('bia', '0006_biaassessment_bia_unique_process_revision'),
    ('core', '0002_auditlog_actor_role_snapshot_alter_auditlog_action'),
    ('core', '0003_normalize_time_and_audit_snapshots'),
    ('engine', '0001_initial'),
    ('engine', '0002_recoveryresource_resource_positive_capacity'),
    ('organizations', '0002_organization_contact_details_organization_is_demo_and_more'),
    ('plans', '0002_continuityplan_activation_conditions_and_more'),
    ('plans', '0003_planstep_plan_step_positive_sequence_and_more'),
    ('plans', '0004_freeze_existing_approved_versions'),
    ('plans', '0005_strategy_recovery_seconds_strategy_rpo_seconds'),
    ('processes', '0002_businessprocess_critical_periods_and_more'),
    ('processes', '0003_businessprocess_process_positive_staff'),
    ('risks', '0002_control_due_date_control_owner_risk_due_date_and_more'),
    ('risks', '0003_risk_risk_valid_scores'),
    ('simulation', '0002_exercise_findings_closed_and_more'),
    ('simulation', '0003_simulationrun'),
    ('simulation', '0004_exercise_actual_recovery_seconds_and_more'),
}

ADOPTION_MIGRATIONS = {
    ('bia', '0007_adopt_deployed_schema'),
    ('core', '0004_adopt_deployed_schema'),
    ('organizations', '0003_adopt_deployed_schema'),
    ('plans', '0006_adopt_deployed_schema'),
    ('processes', '0004_adopt_deployed_schema'),
    ('risks', '0004_adopt_deployed_schema'),
    ('simulation', '0005_adopt_deployed_schema'),
}
