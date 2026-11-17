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
  const completed = steps.filter((step) => step.complete).length;
  const next = steps.find((step) => !step.complete);
  return (
    <section className="dashboard-welcome">
      <div className="welcome-copy">
        <p>Xush kelibsiz, {user.first_name || user.username}</p>
        <h1>Boshqaruv markazi</h1>
        <p>Xizmatlar, risklar va tiklanish uchun yagona ishchi ko‘rinish.</p>
        <button
          className="btn btn-primary"
          onClick={() =>
            onNavigate(
              user.role === "AUDITOR"
                ? "dashboard?guide=1"
                : next?.target || "reports",
            )
          }
        >
          {user.role === "AUDITOR"
            ? "Tayyorgarlik qadamlarini ko‘rish"
            : next
              ? "Boshlash: " + next.title
              : "Natijalarni hisobotda ko‘rish"}
          <ArrowRight size={16} />
        </button>
        <ProductWalkthrough />
      </div>
      <div className="welcome-progress">
        <ShieldCheck size={24} />
        <strong>
          {completed}
          <span> / {steps.length}</span>
        </strong>
        <span>Dastlabki sozlash qadamlari bajarilgan</span>
        <button
          onClick={() =>
            document
              .getElementById("getting-started")
              ?.scrollIntoView({
                behavior: window.matchMedia("(prefers-reduced-motion: reduce)")
                  .matches
                  ? "auto"
                  : "smooth",
                block: "start",
              })
          }
        >
          Qadamlarni ko‘rish <ChevronRight size={14} />
        </button>
      </div>
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
    plans.filter((row) => row.status === "PUBLISHED").map((row) => row.process),
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
    ["unplanned_processes_count", "Rejasiz jarayonlar", "plans", Layers],
    ["published_plans_count", "E’lon qilingan rejalar", "plans", ShieldCheck],
    ["approved_bias_count", "Tasdiqlangan BIA", "bia", Target],
  ] as const;
  const descriptions: Record<string, string> = {
    total_processes: "Hisobot doirasidagi biznes jarayonlari. Reestrda ularning muhimligi, mas’uli va bog‘liqliklarini ko‘ring.",
    high_risks_count: "Yuqori darajali risklar: ehtimollik × ta’sir bo‘yicha 15–25 ball olgan yozuvlar.",
    rpo_gap_count: "Zaxiralash oralig‘i belgilangan RPO muddatidan oshib ketgan jarayonlar.",
    unplanned_processes_count: "Hali e’lon qilingan tiklanish rejasi yo‘q jarayonlar. Reestrdan kerakli rejani tekshiring.",
    published_plans_count: "Rasmiy e’lon qilingan BCP / DRP rejalari. Rejalar reestrida mas’ullar va qadamlarni ko‘ring.",
    approved_bias_count: "Tasdiqlangan biznes ta’siri baholashlari. BIA reestrida RTO, RPO va MTPD talablarini tekshiring.",
  };
  return (
    <div className="executive-dashboard">
      <div className="executive-kpis stat-grid">
        {counts.map(([key, label, target, Icon]) => (
          <MetricFocus key={key} label={label} value={metric(key)} description={descriptions[key]} onNavigate={() => onNavigate(target)}>
          <button
            className={`stat-card executive-kpi metric-${key}`}
            key={key}
            onClick={() => onNavigate(target)}
          >
            <span>
              <Icon size={17} />
              {label}
              <ChevronRight size={14} />
            </span>
            <strong>{metric(key)}</strong>
            <small>Tegishli reestrni ochish</small>
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
            label="E’lon qilingan reja mavjud"
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
