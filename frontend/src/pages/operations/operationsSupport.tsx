import React, { useEffect, useRef } from "react";
import { api } from "../../api/client";
import { UzHiIcon } from "../../components/icons/UzHiIcons";
import { SimulationImpact } from "../ContinuityDetails";

export type Module = "providers" | "incidents" | "tasks";
export type Row = Record<string, any> & { id: number };
export type FormData = Record<string, string | number[]>;
type OpsAPI = {
  get: (path: string) => Promise<any>;
  list: (resource: string, params?: Record<string, string>) => Promise<{ results: Row[]; next?: string | null }>;
  create: (resource: string, data: Record<string, unknown>) => Promise<Row>;
  update: (resource: string, id: number, data: Record<string, unknown>) => Promise<Row>;
  action: (resource: string, id: number, action: string, data?: Record<string, unknown>) => Promise<any>;
};

export const client = api as unknown as OpsAPI;
export const resourceFor: Record<Module, string> = {
  providers: "providers",
  incidents: "incidents",
  tasks: "improvement-tasks",
};
export const labels: Record<string, string> = {
  LOW: "Past", MEDIUM: "O‘rta", HIGH: "Yuqori", CRITICAL: "Kritik",
  OPEN: "Ochiq", INVESTIGATING: "Tekshirilmoqda", RECOVERING: "Tiklanmoqda",
  RESOLVED: "Hal qilindi", CLOSED: "Yopildi", IN_PROGRESS: "Bajarilmoqda", DONE: "Bajarildi",
};
export const titles: Record<Module, string> = {
  providers: "Provayderlar",
  incidents: "Hodisalar markazi",
  tasks: "Yaxshilash vazifalari",
};
export const names = (row?: Row) =>
  row?.name || row?.title || [row?.first_name, row?.last_name].filter(Boolean).join(" ") || row?.username || `#${row?.id}`;
export const errorText = (error: unknown) =>
  error instanceof Error ? error.message : "So‘rov bajarilmadi. Qayta urinib ko‘ring.";
export const formatDate = (value?: string) => value
  ? new Intl.DateTimeFormat("uz-UZ", { dateStyle: "medium" }).format(new Date(value))
  : "Belgilanmagan";

export async function listAll(resource: string): Promise<Row[]> {
  const rows: Row[] = [];
  let page = 1;
  while (true) {
    const data = await client.list(resource, { page: String(page) });
    rows.push(...data.results);
    if (!data.next) return rows;
    page += 1;
  }
}

export function Badge({ value }: { value: string }) {
  return <span className={`badge ops-badge status-${value.toLowerCase()}`}>{labels[value] || value}</span>;
}

export function RunResults({ run, onNavigate }: { run: Row; onNavigate: (page: string) => void }) {
  const result = run.result || {};
  const ids = (result.affected_processes || []).map((row: Row) => row.process_id);
  return (
    <div className="ops-run-result">
      <p>
        {result.estimated_outage_hours ?? "—"} soat · {result.affected_processes_count ?? "—"} ta’sirlangan jarayon ·{" "}
        {result.rto_breaches_count ?? "—"} RTO buzilishi
        {result.unassessed_count > 0 && ` · ${result.unassessed_count} baholanmagan`}
      </p>
      {!!ids.length && (
        <button className="btn" onClick={() => onNavigate(`processes?ids=${ids.join(",")}`)}>
          Ta’sirlangan jarayonlar
        </button>
      )}
      <SimulationImpact result={result} onNavigate={onNavigate} />
    </div>
  );
}

export function Dialog({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const node = ref.current;
    const focusables = () => Array.from(node?.querySelectorAll<HTMLElement>(
      'button:not(:disabled),input,select,textarea,[tabindex="0"]',
    ) || []);
    focusables()[0]?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab") return;
      const items = focusables();
      const first = items[0], last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault(); last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first?.focus();
      }
    };
    node?.addEventListener("keydown", onKey);
    return () => { node?.removeEventListener("keydown", onKey); previous?.focus(); };
  }, [onClose]);
  return (
    <div className="ops-overlay" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="ops-dialog panel" role="dialog" aria-modal="true" aria-labelledby="ops-dialog-title" ref={ref}>
        <div className="ops-dialog-head">
          <h2 id="ops-dialog-title">{title}</h2>
          <button type="button" className="btn btn-icon" aria-label="Oynani yopish" onClick={onClose}>
            <UzHiIcon name="close" size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
