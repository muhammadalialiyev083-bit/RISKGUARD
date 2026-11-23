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
  const organization =
    workspace.organizations?.[0]?.name ||
    user.organization_detail?.name ||
    "UzHi";
  return (
    <section className="dashboard-overview" aria-labelledby="dashboard-hero-title">
      <div className="dashboard-hero-meta">
        <span>UZHI / BOSHQARUV MARKAZI</span>
        <span className="dashboard-organization">{organization}</span>
      </div>
      <div className="dashboard-editorial-stage">
        <div className="dashboard-hero-main">
          <p className="dashboard-kicker">Bugungi boshqaruv signali</p>
          <h1 id="dashboard-hero-title" aria-label="Boshqaruv markazi">
            <span>Uzluksizlikni</span>
            <span>oldindan</span>
            <span className="dashboard-title-accent">ko‘ring.</span>
          </h1>
          <p className="dashboard-hero-lead">
            Kritik jarayonlar, tiklanish tayyorgarligi va vazifalar — qaror
            qabul qilish uchun bitta aniq ko‘rinishda.
          </p>
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
            </button>
            <ProductWalkthrough />
          </div>
        </div>
        <div className="dashboard-orbit" aria-hidden="true">
          <span className="dashboard-orbit-line dashboard-orbit-line-outer" />
          <span className="dashboard-orbit-line dashboard-orbit-line-inner" />
          <span className="dashboard-orbit-axis" />
          <span className="dashboard-orbit-dot dashboard-orbit-dot-one" />
          <span className="dashboard-orbit-dot dashboard-orbit-dot-two" />
          <span className="dashboard-orbit-core">
            <small>UZLUKSIZ</small>
            <strong>UZHI</strong>
            <small>HIMOYA</small>
          </span>
          <span className="dashboard-orbit-caption dashboard-orbit-caption-top">KUZATUV / 01</span>
          <span className="dashboard-orbit-caption dashboard-orbit-caption-bottom">TAYYORLIK / LIVE</span>
        </div>
      </div>
      <div className="dashboard-priority-rail">
        <div className="dashboard-priorities" aria-label="Muhim ogohlantirishlar">
          <button
            className="btn"
            onClick={() => onNavigate(metricTarget(summary, "critical_readiness_count", "processes"))}
          >
            <span className="dashboard-priority-index">01 / TAYYORLIK</span>
            <strong>{summary?.summary?.critical_readiness_count ?? "—"}</strong>
            <span>Amaldagi rejasi yo‘q kritik jarayonlar</span>
          </button>
          <button
            className="btn"
            onClick={() => onNavigate(metricTarget(summary, "overdue_tasks_count", "tasks"))}
          >
            <span className="dashboard-priority-index">02 / IJRO</span>
            <strong>{summary?.summary?.overdue_tasks_count ?? "—"}</strong>
            <span>Muddati o‘tgan vazifalar</span>
          </button>
        </div>
        <details className="dashboard-intro">
          <summary>
            <BubbleIcon name="plans" size="lg" variant="active" float />
            <span className="dashboard-intro-caption">
              <span>Dastlabki sozlash</span>
              <span className="dashboard-intro-count"><strong>{completed}</strong> / {steps.length}</span>
            </span>
            <UzHiIcon name="chevronRight" size={16} className="dashboard-intro-chevron" />
          </summary>
          <button className="btn" onClick={() => onNavigate(next?.target || "reports")}>
            {next ? "Keyingi qadamni ochish" : "Batafsil hisobotni ochish"}
          </button>
        </details>
      </div>
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
      <header className="dashboard-signal-heading">
        <div>
          <p className="dashboard-section-index">02 / SIGNAL MOZAIKASI</p>
          <h2>Boshqaruv signallari</h2>
        </div>
        <p>Eng muhim ko‘rsatkichni tanlang va tegishli reestrga o‘ting.</p>
      </header>
      <div className="executive-kpis stat-grid">
        {counts.map(([key, label, target, icon, variant], index) => (
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
                <span className="kpi-card-index">{String(index + 1).padStart(2, "0")}</span>
                <BubbleIcon name={icon} size="md" variant={variant} />
              </span>
              <span className="kpi-card-label">{label}</span>
              <strong>{metric(key)}</strong>
              <small>{descriptions[key]}</small>
            </button>
          </MetricFocus>
        ))}
      </div>
      <nav className="dashboard-quick-actions" aria-label="Tezkor amallar">
        <button className="btn" onClick={() => onNavigate("incidents")}>
          <span>01</span><strong>Hodisalar markazi</strong><small>Faol hodisalarni boshqaring</small>
        </button>
        <button className="btn" onClick={() => onNavigate("tasks")}>
          <span>02</span><strong>Yaxshilash vazifalari</strong><small>Ijro va muddatlarni tekshiring</small>
        </button>
        <button className="btn" onClick={() => onNavigate("reports")}>
          <span>03</span><strong>Batafsil hisobotlar</strong><small>Grafik, filtr va eksportlarni oching</small>
        </button>
      </nav>
    </div>
  );
}
