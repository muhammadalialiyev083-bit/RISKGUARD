import {
  ArrowRight,
  Check,
  ChevronRight,
  Layers,
  ShieldCheck,
  Target,
} from "lucide-react";
import { RiskMatrix, DependencyMap } from "../components/DomainCharts";
import { startingSteps } from "./workflow";
import type { RecordRow, WorkspaceData } from "./workflow";
import { ProcessDistribution } from "./ProcessDistribution";
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

export function metricTarget(
  report: RecordRow | null,
  key: string,
  target: string,
) {
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
      <h1>Boshqaruv markazi</h1>
      <div className="dashboard-priorities">
        <button
          className="btn"
          onClick={() =>
            onNavigate(
              metricTarget(summary, "critical_readiness_count", "processes"),
            )
          }
        >
          <strong>{summary?.summary?.critical_readiness_count ?? "—"}</strong>{" "}
          Amaldagi rejasi yo‘q kritik jarayonlar
        </button>
        <button
          className="btn"
          onClick={() =>
            onNavigate(metricTarget(summary, "overdue_tasks_count", "tasks"))
          }
        >
          <strong>{summary?.summary?.overdue_tasks_count ?? "—"}</strong>{" "}
          Muddati o‘tgan vazifalar
        </button>
        <button
          className="btn btn-primary"
          onClick={() =>
            onNavigate(
              user.role === "AUDITOR" ? "iso22301" : next?.target || "reports",
            )
          }
        >
          {user.role === "AUDITOR"
            ? "Audit dalillarini ochish"
            : next
              ? "Boshlash: " + next.title
              : "Hisobotni ochish"}
          <ArrowRight size={16} />
        </button>
      </div>
      <details className="dashboard-intro">
        <summary>
          Tanishtiruv va dastlabki sozlash · {completed}/{steps.length}
        </summary>
        <ProductWalkthrough />
        <button
          className="btn"
          onClick={() =>
            document
              .getElementById("getting-started")
              ?.scrollIntoView({ block: "start" })
          }
        >
          Qadamlarni ko‘rish <ChevronRight size={14} />
        </button>
      </details>
    </section>
  );
}

function Coverage({
  title,
  complete,
  total,
  label,
  onClick,
}: {
  title: string;
  complete: number;
  total: number;
  label: string;
  onClick: () => void;
}) {
  const percent = total ? Math.round((complete / total) * 100) : 0;
  return (
    <button
      className="coverage-widget"
      onClick={onClick}
      aria-label={title + " bo‘limini ochish"}
    >
      <div
        className="coverage-ring"
        style={{ "--coverage": `${percent}%` } as React.CSSProperties}
      >
        <span>{total ? percent + "%" : "—"}</span>
      </div>
      <div>
        <strong>{title}</strong>
        <span>
          {complete} / {total} jarayon
        </span>
        <small>{total ? label : "Avval jarayon yarating"}</small>
      </div>
      <ChevronRight size={16} />
    </button>
  );
}

export function ExecutiveDashboard({
  data,
  workspace,
  summary,
  user,
  onNavigate,
}: {
  data: WorkspaceData;
  workspace: WorkspaceData;
  summary: RecordRow | null;
  user: RecordRow;
  onNavigate: (target: string) => void;
}) {
  const processes = data.processes || [],
    risks = data.risks || [],
    bias = data.bia || [],
    plans = data.plans || [];
  const approved = new Set(
    bias.filter((row) => row.status === "APPROVED").map((row) => row.process),
  );
  const published = new Set(
    plans
      .filter(
        (row) =>
          row.status === "PUBLISHED" && row.readiness?.needs_review === false,
      )
      .map((row) => row.process),
  );
  const steps = startingSteps(workspace, summary, user);
  const visibleProcesses = processes.slice(0, 8),
    visibleAssets = (data.assets || []).slice(0, 8);
  const shown = (type: string, id: number) =>
    (type === "PROCESS" ? visibleProcesses : visibleAssets).some(
      (row) => Number(row.id) === Number(id),
    );
  const visibleDependencies = (data.dependencies || []).filter(
    (row) => shown(row.from_type, row.from_id) && shown(row.to_type, row.to_id),
  );
  const metric = (key: string) =>
    typeof summary?.summary?.[key] === "number"
      ? summary.summary[key].toLocaleString("uz-UZ")
      : "—";
  const counts = [
    ["total_processes", "Jarayonlar", "processes", Layers],
    ["high_risks_count", "Yuqori risklar", "risks", ShieldCheck],
    ["rpo_gap_count", "RPO tafovutlari", "bia", Target],
    ["unplanned_processes_count", "Rejasiz jarayonlar", "processes", Layers],
    ["published_plans_count", "E’lon qilingan rejalar", "plans", ShieldCheck],
    ["approved_bias_count", "Tasdiqlangan BIA", "bia", Target],
    ["verified_plans_count", "Mashqda tekshirilgan", "plans", ShieldCheck],
    [
      "plans_needing_review_count",
      "Qayta ko‘rib chiqish kerak",
      "plans",
      Target,
    ],
  ] as const;
  const descriptions: Record<string, string> = {
    total_processes:
      "Hisobot doirasidagi biznes jarayonlari. Reestrda ularning muhimligi, mas’uli va bog‘liqliklarini ko‘ring.",
    high_risks_count:
      "Yuqori darajali risklar: ehtimollik × ta’sir bo‘yicha 15–25 ball olgan yozuvlar.",
    rpo_gap_count:
      "Zaxiralash oralig‘i belgilangan RPO muddatidan oshib ketgan jarayonlar.",
    unplanned_processes_count:
      "Amaldagi BIA va tiklanish qadamlari bilan tasdiqlangan rejasi yo‘q jarayonlar.",
    published_plans_count:
      "E’lon qilingan BCP / DRP rejalariga ega jarayonlar.",
    approved_bias_count:
      "Tasdiqlangan biznes ta’siri baholashlari. BIA reestrida RTO, RPO va MTPD talablarini tekshiring.",
  };
  return (
    <div className="executive-dashboard">
      <div className="executive-kpis stat-grid">
        {counts.map(([key, label, target, Icon]) => (
          <MetricFocus
            key={key}
            label={label}
            value={metric(key)}
            description={descriptions[key] || label}
            onNavigate={() => onNavigate(metricTarget(summary, key, target))}
          >
            <button
              className={`stat-card executive-kpi metric-${key}`}
              key={key}
              onClick={() => onNavigate(metricTarget(summary, key, target))}
            >
              <span>
                <Icon size={17} />
                {label}
                <ChevronRight size={14} />
              </span>
              <strong>{metric(key)}</strong>
            </button>
          </MetricFocus>
        ))}
      </div>
      <div className="executive-charts">
        <RiskMatrix
          risks={risks}
          onSelect={(likelihood, impact) =>
            onNavigate(`risks?likelihood=${likelihood}&impact=${impact}`)
          }
        />
        <section className="panel coverage-panel">
          <div className="chart-heading">
            <div>
              <h2>Tiklanish qamrovi</h2>
              <p>Baholangan va e’lon qilingan rejasi bor jarayonlar.</p>
            </div>
            <ShieldCheck size={20} />
          </div>
          <Coverage
            title="BIA qamrovi"
            complete={processes.filter((row) => approved.has(row.id)).length}
            total={processes.length}
            label="Tasdiqlangan BIA mavjud"
            onClick={() => onNavigate("bia")}
          />
          <Coverage
            title="Reja qamrovi"
            complete={processes.filter((row) => published.has(row.id)).length}
            total={processes.length}
            label="Amaldagi reja mavjud"
            onClick={() => onNavigate("plans")}
          />
          <ProcessDistribution processes={processes} onNavigate={onNavigate} />
        </section>
      </div>
      <section
        className="panel getting-started"
        id="getting-started"
        aria-labelledby="getting-started-title"
      >
        <div className="getting-started-heading">
          <div>
            <h2 id="getting-started-title">Ishni nimadan boshlayman?</h2>
            <p>
              Har bir qadam keyingi bo‘lim uchun kerakli ma’lumotni tayyorlaydi.
              Belgilar mavjud yozuvlar asosida yangilanadi.
            </p>
          </div>
          <span>
            {steps.filter((step) => step.complete).length} / {steps.length}{" "}
            qadam
          </span>
        </div>
        <ol>
          {steps.map((step, index) => (
            <li
              key={step.target}
              className={step.complete ? "is-complete" : ""}
            >
              <button
                onClick={() =>
                  onNavigate(
                    user.role === "AUDITOR"
                      ? step.target.split("?")[0]
                      : step.target,
                  )
                }
              >
                <span className="getting-started-number">
                  {step.complete ? <Check size={17} /> : index + 1}
                </span>
                <span>
                  <strong>{step.title}</strong>
                  <small>{step.detail}</small>
                </span>
                <ChevronRight size={16} />
              </button>
            </li>
          ))}
        </ol>
      </section>
      <DependencyMap
        processes={visibleProcesses}
        assets={visibleAssets}
        dependencies={visibleDependencies}
        onSelect={(type, id) => {
          const row = (type === "PROCESS" ? processes : data.assets || []).find(
            (row) => Number(row.id) === id,
          );
          onNavigate(
            `${type === "PROCESS" ? "processes" : "assets"}?q=${encodeURIComponent(row?.name || "")}`,
          );
        }}
      />
      {(processes.length > 8 || (data.assets || []).length > 8) && (
        <button
          className="text-button dashboard-full-map"
          onClick={() => onNavigate("dependencies")}
        >
          Barcha bog‘liqliklarni ochish <ArrowRight size={14} />
        </button>
      )}
    </div>
  );
}
