export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'ADMIN' | 'BCMS_MANAGER' | 'PROCESS_OWNER' | 'RISK_ANALYST' | 'APPROVER' | 'AUDITOR';
  role_display: string;
  organization: number;
  organization_detail?: {
    id: number;
    name: string;
    sector: string;
    timezone: string;
    max_acceptable_loss: string;
  };
}

export interface BusinessProcess {
  id: number;
  name: string;
  service_name?: string;
  owner_name?: string;
  criticality: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  criticality_display: string;
  status: 'ACTIVE' | 'UNDER_REVIEW' | 'INACTIVE';
}

export interface Asset {
  id: number;
  name: string;
  type: 'SYSTEM' | 'SERVER' | 'PERSONNEL' | 'VENDOR' | 'FACILITY';
  type_display: string;
  owner_name?: string;
}

export interface BIAAssessment {
  id: number;
  process: number;
  process_name: string;
  revision: number;
  mtpd_hours: string;
  rto_hours: string;
  rpo_minutes: number;
  backup_interval_minutes: number;
  has_rpo_gap: boolean;
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
  approved_by_name?: string;
}

export interface Risk {
  id: number;
  process_name: string;
  asset_name?: string;
  threat: string;
  likelihood: number;
  impact: number;
  likelihood_residual?: number;
  impact_residual?: number;
  risk_score: number;
  residual_risk_score?: number;
  risk_reduction: number;
  risk_class: 'low' | 'medium' | 'high';
  status: string;
}

export interface ContinuityPlan {
  id: number;
  process_name: string;
  title: string;
  version: string;
  status: 'DRAFT' | 'IN_REVIEW' | 'APPROVED' | 'PUBLISHED' | 'ARCHIVED';
  status_display: string;
  approved_by_name?: string;
  steps?: {
    id: number;
    sequence: number;
    title: string;
    assigned_name?: string;
    expected_duration_minutes: number;
  }[];
}

export interface DashboardSummary {
  total_processes: number;
  critical_processes: number;
  total_assets: number;
  total_risks: number;
  high_risks_count: number;
  unplanned_processes_count: number;
  rpo_gap_count: number;
  approved_bias_count: number;
  published_plans_count: number;
  completed_exercises_count: number;
}

export interface AuditLog {
  id: string;
  actor_username: string;
  actor_role: string;
  action: string;
  entity: string;
  entity_id: string;
  timestamp: string;
  ip_address?: string;
}
