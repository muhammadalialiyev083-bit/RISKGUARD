import { UzHiIcon } from "../components/icons/UzHiIcons";
import { BubbleIcon } from "../components/ui/BubbleIcon";
import { startingSteps } from "./workflow";
import type { RecordRow, WorkspaceData } from "./workflow";
import { ProductWalkthrough } from "./ProductWalkthrough";
import { MetricFocus } from "./MetricFocus";

const metricIds: Record<string, string> = {
  total_processes: "process_ids",
  high_risks_count: "high_risk_ids",
  rpo_gap_count: "rpo_gap_bia_ids",
  unplanned_processes_count: "unplanned_process_ids",
  published_plans_count: "published_plan_ids",
  approved_bias_count: "approved_bia_ids",
  verified_plans_count: "verified_plan_ids",
  plans_needing_review_count: "review_plan_ids",
  critical_readiness_count: "critical_unplanned_process_ids",
  overdue_tasks_count: "overdue_task_ids",
};

export function metricTarget(report: RecordRow | null, key: string, target: string) {
  const ids = report?.[metricIds[key]];
  return Array.isArray(ids) ? `${target}?ids=${ids.join(",")}` : target;
}

export function DashboardWelcome({
  user,
  workspace,
  summary,
  onNavigate,
}: {
  user: RecordRow;
  workspace: WorkspaceData;
  summary: RecordRow | null;
  onNavigate: (target: string) => void;
}) {
  const steps = startingSteps(workspace, summary, user);
  const next = steps.find((step) => !step.complete);
  const completed = steps.filter((step) => step.complete).length;
  return (
    <section className="dashboard-overview">
      <div className="dashboard-hero-main">
        <h1>Boshqaruv markazi</h1>
        <div className="dashboard-priorities">
          <button
            className="btn"
            onClick={() => onNavigate(metricTarget(summary, "critical_readiness_count", "processes"))}
          >
            <strong>{summary?.summary?.critical_readiness_count ?? "—"}</strong>{" "}
            Amaldagi rejasi yo‘q kritik jarayonlar
          </button>
          <button
            className="btn"
            onClick={() => onNavigate(metricTarget(summary, "overdue_tasks_count", "tasks"))}
          >
            <strong>{summary?.summary?.overdue_tasks_count ?? "—"}</strong>{" "}
            Muddati o‘tgan vazifalar
          </button>
        </div>
        <div className="dashboard-hero-actions">
          <button
            className="btn btn-primary dashboard-hero-primary"
            onClick={() => onNavigate(user.role === "AUDITOR" ? "iso22301" : next?.target || "reports")}
          >
            {user.role === "AUDITOR"
              ? "Audit dalillarini ochish"
              : next
                ? "Boshlash: " + next.title
                : "Hisobotni ochish"}
            <UzHiIcon name="arrowRight" size={16} />
          </button>
          <ProductWalkthrough />
        </div>
      </div>
      <details className="dashboard-intro">
        <summary>
          <BubbleIcon name="plans" size="lg" variant="active" float />
          <span className="dashboard-intro-caption">
            <span>Tanishtiruv va dastlabki sozlash ·</span>{" "}
            <span className="dashboard-intro-count"><strong>{completed}</strong>/{steps.length}</span>
          </span>
          <UzHiIcon name="chevronRight" size={16} className="dashboard-intro-chevron" />
        </summary>
        <button className="btn" onClick={() => onNavigate(next?.target || "reports")}>
          {next ? "Keyingi qadamni ochish" : "Batafsil hisobotni ochish"}
          <UzHiIcon name="chevronRight" size={14} />
        </button>
      </details>
    </section>
  );
}

export function ExecutiveDashboard({
  summary,
  onNavigate,
}: {
  summary: RecordRow | null;
  onNavigate: (target: string) => void;
}) {
  const metric = (key: string) =>
    typeof summary?.summary?.[key] === "number"
      ? summary.summary[key].toLocaleString("uz-UZ")
      : "—";
  const counts = [
    ["total_processes", "Jarayonlar", "processes", "processes", "indigo"],
    ["high_risks_count", "Yuqori risklar", "risks", "highRisk", "danger"],
    ["rpo_gap_count", "RPO tafovutlari", "bia", "rpo", "indigo"],
    ["unplanned_processes_count", "Rejasiz jarayonlar", "processes", "unplanned", "danger"],
    ["verified_plans_count", "Mashqda tekshirilgan", "plans", "checkCircle", "lime"],
    ["plans_needing_review_count", "Qayta ko‘rib chiqish kerak", "plans", "recovery", "indigo"],
  ] as const;
  const descriptions: Record<string, string> = {
    total_processes: "Hisobot doirasidagi biznes jarayonlari.",
    high_risks_count: "15–25 ball olgan yuqori darajali risklar.",
    rpo_gap_count: "Zaxiralash oralig‘i RPO muddatidan oshgan baholashlar.",
    unplanned_processes_count: "Amaldagi tiklanish rejasi yo‘q jarayonlar.",
    verified_plans_count: "Amaldagi mashqda tekshirilgan rejalar.",
    plans_needing_review_count: "Qayta ko‘rib chiqilishi kerak bo‘lgan rejalar.",
  };
  return (
    <div className="executive-dashboard executive-dashboard-compact">
      <div className="executive-kpis stat-grid">
        {counts.map(([key, label, target, icon, variant]) => (
          <MetricFocus
            key={key}
            label={label}
            value={metric(key)}
            description={descriptions[key]}
            onNavigate={() => onNavigate(metricTarget(summary, key, target))}
          >
            <button
              className={`stat-card executive-kpi metric-${key}`}
              onClick={() => onNavigate(metricTarget(summary, key, target))}
            >
              <span className="kpi-card-heading">
                <BubbleIcon name={icon} size="md" variant={variant} />
                <span className="kpi-card-label">{label}</span>
                <UzHiIcon name="chevronRight" size={14} />
              </span>
              <strong>{metric(key)}</strong>
            </button>
          </MetricFocus>
        ))}
      </div>
      <div className="dashboard-quick-actions" aria-label="Tezkor amallar">
        <button className="btn" onClick={() => onNavigate("incidents")}>Hodisalar markazi</button>
        <button className="btn" onClick={() => onNavigate("tasks")}>Yaxshilash vazifalari</button>
        <button className="btn" onClick={() => onNavigate("reports")}>Batafsil hisobotlar</button>
      </div>
    </div>
  );
}
