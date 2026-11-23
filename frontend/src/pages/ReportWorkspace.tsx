import { UzHiIcon } from "../components/icons/UzHiIcons";
import {
  DependencyMap,
  RiskMatrix,
  SummaryCharts,
} from "../components/DomainCharts";
import { ProcessDistribution } from "../experience/ProcessDistribution";
import { metricTarget } from "../experience/ExecutiveDashboard";
import { DashboardReportExport } from "../reports/DashboardReportExport";

type Row = Record<string, any>;

function ReadinessList({
  bias,
  onNavigate,
}: {
  bias: Row[];
  onNavigate: (key: string) => void;
}) {
  return (
    <section className="panel">
      <h2>Diqqat talab qiladigan maqsadlar</h2>
      {!bias.length ? (
        <p className="muted">BIA baholashlari kiritilmagan.</p>
      ) : (
        <ul className="readiness-list">
          {bias
            .filter((row) => row.has_rpo_gap || row.status !== "APPROVED")
            .slice(0, 6)
            .map((row) => (
              <li key={row.id}>
                <div>
                  <strong>{row.process_name}</strong>
                  <small>
                    {row.has_rpo_gap
                      ? `Zaxira ${row.backup_interval_minutes} daqiqa > RPO ${row.rpo_minutes} daqiqa`
                      : "BIA tasdiqlanishi kerak"}
                  </small>
                </div>
                <button className="btn" onClick={() => onNavigate("bia")}>
                  Ko‘rish
                </button>
              </li>
            ))}
        </ul>
      )}
      <button className="btn" onClick={() => onNavigate("bia")}>
        Barcha baholashlar <UzHiIcon name="arrowUpRight" size={15} />
      </button>
    </section>
  );
}

export function ReportWorkspace({
  data,
  summary,
  reportQuery,
  filtersOpen,
  period,
  endPeriod,
  serviceFilter,
  busy,
  onFiltersOpen,
  onPeriod,
  onEndPeriod,
  onService,
  onNavigate,
  onDownload,
  onNotice,
  onError,
}: {
  data: Record<string, Row[]>;
  summary: Row | null;
  reportQuery: string;
  filtersOpen: boolean;
  period: string;
  endPeriod: string;
  serviceFilter: string;
  busy: boolean;
  onFiltersOpen: (open: boolean) => void;
  onPeriod: (value: string) => void;
  onEndPeriod: (value: string) => void;
  onService: (value: string) => void;
  onNavigate: (target: string) => void;
  onDownload: (path: string, filename: string) => void;
  onNotice: (message: string) => void;
  onError: (message: string) => void;
}) {
  const processes = data.processes || [];
  return (
    <>
      <details
        className="report-filters"
        open={filtersOpen}
        onToggle={(event) => onFiltersOpen(event.currentTarget.open)}
      >
        <summary>Hisobot filtrlari</summary>
        <div className="domain-toolbar">
          <label className="field">
            Jarayon yaratilgan davr · dan
            <input type="date" value={period} onChange={(event) => onPeriod(event.target.value)} />
          </label>
          <label className="field">
            Davr · gacha
            <input
              type="date"
              value={endPeriod}
              min={period || undefined}
              onChange={(event) => onEndPeriod(event.target.value)}
            />
          </label>
          <label className="field">
            Xizmat
            <select aria-label="Xizmat" value={serviceFilter} onChange={(event) => onService(event.target.value)}>
              <option value="">Barcha xizmatlar</option>
              {(data.services || []).map((service) => (
                <option key={service.id} value={service.id}>{service.name}</option>
              ))}
            </select>
          </label>
          <span className="muted">{summary?.organization}</span>
          <button
            className="btn"
            disabled={busy}
            onClick={() => onDownload(
              "/reports/organization?export=pdf" + (reportQuery ? "&" + reportQuery : ""),
              "UzHi-hisobot.pdf",
            )}
          >
            <UzHiIcon name="download" size={16} /> PDF hisobot
          </button>
          <button
            className="btn"
            disabled={busy}
            onClick={() => onDownload(
              "/reports/organization?export=csv" + (reportQuery ? "&" + reportQuery : ""),
              "UzHi-hisobot.csv",
            )}
          >
            <UzHiIcon name="download" size={16} /> CSV hisobot
          </button>
        </div>
      </details>

      <DashboardReportExport
        key={reportQuery}
        available={Boolean(summary?.summary) && !busy}
        query={reportQuery}
        onNotify={(message, type) => type === "error" ? onError(message) : onNotice(message)}
      />

      <div className="stat-grid">
        {[
          ["total_processes", "Jarayonlar", "processes"],
          ["high_risks_count", "Yuqori risklar", "risks"],
          ["rpo_gap_count", "RPO tafovutlari", "bia"],
          ["unplanned_processes_count", "Rejasiz jarayonlar", "processes"],
          ["published_plans_count", "E’lon qilingan rejalar", "plans"],
          ["approved_bias_count", "Tasdiqlangan BIA", "bia"],
        ].map(([key, label, target]) => (
          <button key={key} className="stat-card" onClick={() => onNavigate(metricTarget(summary, key, target))}>
            <span>{label}<UzHiIcon name="arrowUpRight" size={15} /></span>
            <strong>{summary?.summary?.[key] ?? "—"}</strong>
            <small>Tegishli reestrni ochish</small>
          </button>
        ))}
      </div>

      {!!Object.keys(summary?.plan_readiness ?? {}).length && (
        <section className="panel">
          <h2>Reja dalillari</h2>
          <ul className="report-evidence">
            {processes.map((process) => {
              const evidence = summary?.plan_readiness?.[process.id];
              if (!evidence) return null;
              return (
                <li key={process.id}>
                  <button
                    className="text-button"
                    onClick={() => onNavigate(evidence.plan_id ? `plans?record=${evidence.plan_id}` : `processes?record=${process.id}`)}
                  >
                    {process.name}
                  </button>
                  <span>{evidence.label}</span>
                  {!!evidence.missing_evidence.length && <small>{evidence.missing_evidence.join(" · ")}</small>}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {!processes.length ? (
        <div className="domain-empty">
          <UzHiIcon name="reports" size={30} />
          <h3>Birinchi xizmatni bog‘lashdan boshlang</h3>
          <p>Haqiqiy ko‘rsatkichlar tashkilot ma’lumotlari kiritilgach shakllanadi.</p>
          <button className="btn btn-primary" onClick={() => onNavigate("organizations")}>
            Tashkilot va xizmatlar
          </button>
        </div>
      ) : (
        <>
          <SummaryCharts
            processes={processes}
            bias={data.bia || []}
            risks={data.risks || []}
            onNavigate={onNavigate}
          />
          <div className="domain-two">
            <RiskMatrix
              risks={data.risks || []}
              onSelect={(likelihood, impact) => onNavigate(`risks?likelihood=${likelihood}&impact=${impact}`)}
            />
            <ReadinessList bias={data.bia || []} onNavigate={onNavigate} />
          </div>
          <ProcessDistribution processes={processes} onNavigate={onNavigate} />
          <DependencyMap
            processes={processes}
            assets={data.assets || []}
            dependencies={data.dependencies || []}
          />
        </>
      )}
    </>
  );
}
