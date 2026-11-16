import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Circle,
  Clock3,
  Network,
  Plus,
  RefreshCw,
  Search,
  Truck,
  X,
} from "lucide-react";
import { api } from "../api/client";
import type { User } from "../types";
import "./operations.css";

type Module = "providers" | "incidents" | "tasks";
type Row = Record<string, any> & { id: number };
type FormData = Record<string, string | number[]>;
type OpsAPI = {
  get: (path: string) => Promise<any>;
  list: (
    resource: string,
    params?: Record<string, string>,
  ) => Promise<{ results: Row[]; next?: string | null }>;
  create: (resource: string, data: Record<string, unknown>) => Promise<Row>;
  update: (
    resource: string,
    id: number,
    data: Record<string, unknown>,
  ) => Promise<Row>;
  action: (
    resource: string,
    id: number,
    action: string,
    data?: Record<string, unknown>,
  ) => Promise<any>;
};
const client = api as unknown as OpsAPI;
const resourceFor: Record<Module, string> = {
  providers: "providers",
  incidents: "incidents",
  tasks: "improvement-tasks",
};
const labels: Record<string, string> = {
  LOW: "Past",
  MEDIUM: "O‘rta",
  HIGH: "Yuqori",
  CRITICAL: "Kritik",
  OPEN: "Ochiq",
  INVESTIGATING: "Tekshirilmoqda",
  RECOVERING: "Tiklanmoqda",
  RESOLVED: "Hal qilindi",
  CLOSED: "Yopildi",
  IN_PROGRESS: "Bajarilmoqda",
  DONE: "Bajarildi",
};
const titles: Record<Module, string> = {
  providers: "Provayderlar",
  incidents: "Hodisalar markazi",
  tasks: "Yaxshilash vazifalari",
};
const descriptions: Record<Module, string> = {
  providers:
    "Hamkorlar, ularga bog‘liq xizmatlar va uzilish xavfini bir joyda boshqaring.",
  incidents:
    "Hodisani qayd etishdan tiklanish va yakuniy xulosagacha yagona ish jarayoni.",
  tasks:
    "Sinov va hodisalardan olingan xulosalarni mas’ul hamda muddatga ega vazifaga aylantiring.",
};
const names = (row: Row) =>
  row.name ||
  row.title ||
  [row.first_name, row.last_name].filter(Boolean).join(" ") ||
  row.username ||
  `#${row.id}`;
const errorText = (error: unknown) =>
  error instanceof Error
    ? error.message
    : "So‘rov bajarilmadi. Qayta urinib ko‘ring.";
const formatDate = (value?: string) =>
  value
    ? new Intl.DateTimeFormat("uz-UZ", { dateStyle: "medium" }).format(
        new Date(value),
      )
    : "Belgilanmagan";

async function listAll(resource: string): Promise<Row[]> {
  const rows: Row[] = [];
  let page = 1;
  while (true) {
    const data = await client.list(resource, { page: String(page) });
    rows.push(...data.results);
    if (!data.next) return rows;
    page += 1;
  }
}

function Badge({ value }: { value: string }) {
  return (
    <span className={`badge ops-badge status-${value.toLowerCase()}`}>
      {labels[value] || value}
    </span>
  );
}

function RunResults({ run }: { run: Row }) {
  const result = run.result || {};
  return (
    <div className="ops-run-result">
      <div className="ops-run-metrics">
        <span>
          <strong>{result.estimated_outage_hours ?? "—"}</strong> soat uzilish
        </span>
        <span>
          <strong>{result.affected_processes_count ?? "—"}</strong> ta’sirlangan
          jarayon
        </span>
        <span>
          <strong>{result.rto_breaches_count ?? "—"}</strong> RTO buzilishi
        </span>
        <span>
          <strong>{result.missing_plans_count ?? "—"}</strong> rejasiz jarayon
        </span>
      </div>
      {result.affected_processes?.length ? (
        <div className="table-wrap">
          <table className="ops-table">
            <caption className="sr-only">
              Provayder uzilishining jarayonlarga ta’siri
            </caption>
            <thead>
              <tr>
                <th>Jarayon</th>
                <th>Xizmat</th>
                <th>RTO / MTPD</th>
                <th>Holat</th>
                <th>Tiklanish rejasi</th>
              </tr>
            </thead>
            <tbody>
              {result.affected_processes.map((process: any) => (
                <tr key={process.process_id}>
                  <td>{process.process_name}</td>
                  <td>{process.service_name}</td>
                  <td>
                    {process.target_rto_hours} / {process.target_mtpd_hours}{" "}
                    soat
                  </td>
                  <td>
                    {process.mtpd_breached
                      ? "MTPD chegarasi buzilgan"
                      : process.rto_breached
                        ? "RTO chegarasi buzilgan"
                        : "Maqsad doirasida"}
                  </td>
                  <td>
                    {process.has_published_plan
                      ? "Mavjud"
                      : "Nashr etilgan reja yo‘q"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="ops-help">
          Amaldagi bog‘liqlik xaritasida ta’sirlangan jarayon topilmadi.
          Provayder aktivlari va jarayon bog‘liqliklari to‘liq kiritilganini
          tekshiring.
        </p>
      )}
    </div>
  );
}

function Dialog({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const node = ref.current;
    const focusables = () =>
      Array.from(
        node?.querySelectorAll<HTMLElement>(
          'button:not(:disabled),input,select,textarea,[tabindex="0"]',
        ) || [],
      );
    focusables()[0]?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab") return;
      const items = focusables();
      const first = items[0],
        last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    node?.addEventListener("keydown", onKey);
    return () => {
      node?.removeEventListener("keydown", onKey);
      previous?.focus();
    };
  }, [onClose]);
  return (
    <div
      className="ops-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="ops-dialog panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ops-dialog-title"
        ref={ref}
      >
        <div className="ops-dialog-head">
          <h2 id="ops-dialog-title">{title}</h2>
          <button
            type="button"
            className="btn btn-icon"
            aria-label="Oynani yopish"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function OperationsPage({
  module: moduleName,
  user,
}: {
  module: string;
  user: User;
  onNavigate?: (module: string) => void;
}) {
  const module = moduleName as Module;
  const [rows, setRows] = useState<Row[]>([]);
  const [relations, setRelations] = useState<Record<string, Row[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("");
  const [selected, setSelected] = useState<number | null>(null);
  const [timeline, setTimeline] = useState<Row[]>([]);
  const [timelineError, setTimelineError] = useState("");
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [dialog, setDialog] = useState<
    "edit" | "disruption" | "improvement" | "incidentTask" | "escalation" | null
  >(null);
  const [editing, setEditing] = useState<Row | null>(null);
  const [form, setForm] = useState<FormData>({});
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  const [run, setRun] = useState<Row | null>(null);
  const version = useRef(0);
  const timelineVersion = useRef(0);
  const scope = `${module}:${user.id}`;
  const currentScope = useRef(scope);
  currentScope.current = scope;
  const writable =
    module === "incidents"
      ? ["ADMIN", "BCMS_MANAGER"].includes(user.role)
      : ["ADMIN", "BCMS_MANAGER", "RISK_ANALYST"].includes(user.role);
  const canEdit = (row: Row) =>
    writable ||
    (module === "tasks" &&
      user.role === "PROCESS_OWNER" &&
      row.owner === user.id);
  const selectedRow = rows.find((row) => row.id === selected);
  const relatedName = (resource: string, id: number | null | undefined) =>
    relations[resource]?.find((row) => row.id === id)
      ? names(relations[resource].find((row) => row.id === id)!)
      : id
        ? `#${id}`
        : "Belgilanmagan";
  const selectedTasks = (relations["improvement-tasks"] || []).filter(
    (task) => task.incident === selected,
  );

  const load = useCallback(async () => {
    const ticket = ++version.current;
    setLoading(true);
    setError("");
    const resources =
      module === "providers"
        ? ["users", "services", "assets", "simulation-runs"]
        : module === "incidents"
          ? [
              "users",
              "providers",
              "assets",
              "plans",
              "scenarios",
              "improvement-tasks",
            ]
          : ["users", "incidents", "scenarios", "processes"];
    try {
      const [data, ...lookups] = await Promise.all([
        listAll(resourceFor[module]),
        ...resources.map(listAll),
      ]);
      if (ticket !== version.current) return;
      setRows(data);
      setRelations(
        Object.fromEntries(resources.map((name, i) => [name, lookups[i]])),
      );
    } catch (e) {
      if (ticket === version.current) setError(errorText(e));
    } finally {
      if (ticket === version.current) setLoading(false);
    }
  }, [module, user.id]);

  useEffect(() => {
    setRows([]);
    setRelations({});
    setSelected(null);
    setQuery(new URLSearchParams(window.location.search).get("q") || "");
    setFilter("");
    setDialog(null);
    setRun(null);
    setSuccess("");
    setBusy(false);
    setTimelineError("");
    setMessage("");
    void load();
    return () => {
      version.current += 1;
    };
  }, [load]);

  const loadTimeline = useCallback(
    async (id: number) => {
      const ticket = scope;
      const sequence = ++timelineVersion.current;
      setTimeline([]);
      setTimelineError("");
      setTimelineLoading(true);
      try {
        const data = await client.get(`/incidents/${id}/timeline/`);
        if (
          currentScope.current === ticket &&
          sequence === timelineVersion.current
        )
          setTimeline(Array.isArray(data) ? data : data.results || []);
      } catch (e) {
        if (
          currentScope.current === ticket &&
          sequence === timelineVersion.current
        )
          setTimelineError(errorText(e));
      } finally {
        if (
          currentScope.current === ticket &&
          sequence === timelineVersion.current
        )
          setTimelineLoading(false);
      }
    },
    [scope],
  );

  useEffect(() => {
    if (module === "incidents" && selected) void loadTimeline(selected);
    else {
      timelineVersion.current += 1;
      setTimeline([]);
    }
  }, [module, selected, loadTimeline]);

  const closeDialog = useCallback(() => {
    setDialog(null);
    setFormError("");
  }, []);
  const openEdit = (row: Row | null = null) => {
    const defaults: FormData =
      module === "providers"
        ? {
            name: "",
            description: "",
            contact_email: "",
            owner: "",
            services: [],
            assets: [],
            risk_rating: "MEDIUM",
            next_review_date: "",
          }
        : module === "incidents"
          ? {
              title: "",
              description: "",
              severity: "MEDIUM",
              status: "OPEN",
              owner: "",
              provider: "",
              asset: "",
              plan: "",
              scenario: "",
              conclusion: "",
            }
          : {
              title: "",
              description: "",
              owner: "",
              status: "OPEN",
              due_date: "",
              incident: "",
              scenario: "",
              process: "",
            };
    if (row)
      Object.keys(defaults).forEach((key) => {
        defaults[key] = Array.isArray(defaults[key])
          ? row[key] || []
          : String(row[key] ?? "");
      });
    setEditing(row);
    setForm(defaults);
    setFormError("");
    setDialog("edit");
  };
  const change = (key: string, value: string | number[]) =>
    setForm((previous) => ({ ...previous, [key]: value }));
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    const ticket = scope;
    setBusy(true);
    setFormError("");
    try {
      if (dialog === "disruption") {
        const result = await client.action(
          "providers",
          editing!.id,
          "disruption",
          {
            title: form.title,
            estimated_outage_hours: Number(form.estimated_outage_hours),
          },
        );
        if (currentScope.current !== ticket) return;
        setRun(result.run || result.simulation_run || result);
        setSuccess(
          "Provayder uzilishi bo‘yicha ssenariy va ta’sir tahlili saqlandi.",
        );
      } else if (dialog === "improvement") {
        const body: Record<string, unknown> = {
          title: form.title,
          description: form.description,
          owner: form.owner ? Number(form.owner) : null,
          due_date: form.due_date || null,
        };
        await client.action("simulation-runs", run!.id, "improvements", body);
        if (currentScope.current !== ticket) return;
        setSuccess("Tahlildan yaxshilash vazifasi yaratildi.");
      } else if (dialog === "incidentTask") {
        await client.create("improvement-tasks", {
          title: form.title,
          description: form.description,
          owner: form.owner ? Number(form.owner) : null,
          due_date: form.due_date || null,
          incident: editing!.id,
          status: "OPEN",
        });
        if (currentScope.current !== ticket) return;
        setSuccess("Hodisaga javob chorasi va mas’ul biriktirildi.");
      } else if (dialog === "escalation") {
        await client.action("incidents", editing!.id, "escalate", {
          severity: form.severity,
          reason: form.reason,
        });
        if (currentScope.current !== ticket) return;
        setSuccess(
          "Hodisa eskalatsiya qilindi. Sabab va yangi daraja jurnalga yozildi.",
        );
        if (selected === editing!.id) await loadTimeline(editing!.id);
      } else {
        const payload: Record<string, unknown> = { ...form };
        for (const key of [
          "owner",
          "provider",
          "asset",
          "plan",
          "scenario",
          "incident",
          "process",
        ])
          if (key in payload)
            payload[key] = form[key] ? Number(form[key]) : null;
        for (const key of ["next_review_date", "due_date"])
          if (key in payload && !payload[key]) payload[key] = null;
        if (editing)
          await client.update(
            resourceFor[module],
            editing.id,
            user.role === "PROCESS_OWNER" && module === "tasks"
              ? { status: payload.status, description: payload.description }
              : payload,
          );
        else await client.create(resourceFor[module], payload);
        if (currentScope.current !== ticket) return;
        setSuccess(
          editing ? "O‘zgarishlar saqlandi." : "Yangi yozuv yaratildi.",
        );
      }
      setDialog(null);
      await load();
    } catch (e) {
      if (currentScope.current === ticket) setFormError(errorText(e));
    } finally {
      if (currentScope.current === ticket) setBusy(false);
    }
  };

  const addTimelineMessage = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selected || !message.trim() || busy) return;
    setBusy(true);
    setTimelineError("");
    try {
      await client.action("incidents", selected, "timeline", { message });
      setMessage("");
      await loadTimeline(selected);
      setSuccess("Hodisa jurnaliga izoh qo‘shildi.");
    } catch (e) {
      setTimelineError(errorText(e));
    } finally {
      setBusy(false);
    }
  };

  const field = (
    key: string,
    label: string,
    options?: {
      required?: boolean;
      type?: string;
      choices?: string[];
      relation?: string;
      multiple?: boolean;
      area?: boolean;
    },
  ) => {
    const id = `ops-${key}`;
    return (
      <label
        className={`field ${options?.area ? "ops-full" : ""}`}
        htmlFor={id}
        key={key}
      >
        <span>
          {label}
          {options?.required ? " *" : ""}
        </span>
        {options?.relation ? (
          <select
            id={id}
            required={options.required}
            multiple={options.multiple}
            value={
              options.multiple
                ? ((form[key] as number[]) || []).map(String)
                : String(form[key] || "")
            }
            onChange={(event) =>
              change(
                key,
                options.multiple
                  ? Array.from(event.target.selectedOptions).map((o) =>
                      Number(o.value),
                    )
                  : event.target.value,
              )
            }
          >
            {!options.multiple && <option value="">Belgilanmagan</option>}
            {(relations[options.relation] || []).map((item) => (
              <option key={item.id} value={item.id}>
                {names(item)}
              </option>
            ))}
          </select>
        ) : options?.choices ? (
          <select
            id={id}
            value={String(form[key] || "")}
            onChange={(event) => change(key, event.target.value)}
          >
            {options.choices.map((value) => (
              <option key={value} value={value}>
                {labels[value] || value}
              </option>
            ))}
          </select>
        ) : options?.area ? (
          <textarea
            id={id}
            value={String(form[key] || "")}
            onChange={(event) => change(key, event.target.value)}
            rows={3}
            required={options.required}
          />
        ) : (
          <input
            id={id}
            type={options?.type || "text"}
            value={String(form[key] || "")}
            onChange={(event) => change(key, event.target.value)}
            required={options?.required}
            min={options?.type === "number" ? "0.1" : undefined}
            step={options?.type === "number" ? "0.1" : undefined}
            maxLength={key === "title" || key === "name" ? 255 : undefined}
          />
        )}
        {options?.multiple && (
          <small>
            Bir nechta yozuv uchun Ctrl / Cmd tugmasini bosib tanlang.
          </small>
        )}
      </label>
    );
  };

  const filtered = rows.filter((row) => {
    const term = `${names(row)} ${row.description || ""}`.toLocaleLowerCase();
    return (
      term.includes(query.toLocaleLowerCase()) &&
      (!filter ||
        (module === "providers" ? row.risk_rating : row.status) === filter)
    );
  });
  const statusValues =
    module === "providers"
      ? ["CRITICAL", "HIGH", "MEDIUM", "LOW"]
      : module === "incidents"
        ? ["OPEN", "INVESTIGATING", "RECOVERING", "RESOLVED", "CLOSED"]
        : ["OPEN", "IN_PROGRESS", "DONE"];
  const complete = rows.filter((row) =>
    ["CLOSED", "RESOLVED", "DONE"].includes(row.status),
  ).length;
  const overdue = rows.filter((row) => {
    const date = module === "providers" ? row.next_review_date : row.due_date;
    return (
      date &&
      date < new Date().toISOString().slice(0, 10) &&
      row.status !== "DONE"
    );
  }).length;

  return (
    <section className="operations-page" aria-label={titles[module]}>
      <div className="page-header">
        <div>
          <p className="ops-eyebrow">Hodisalar va tiklanish</p>
          <h1>{titles[module]}</h1>
          <p>{descriptions[module]}</p>
        </div>
        <div className="ops-actions">
          <button
            className="btn"
            onClick={() => void load()}
            disabled={loading}
            aria-label="Ma’lumotlarni yangilash"
          >
            <RefreshCw size={16} className={loading ? "spin" : ""} />
          </button>
          {writable && (
            <button
              className="btn btn-primary"
              disabled={loading || !!error}
              onClick={() => openEdit()}
            >
              <Plus size={16} />
              {module === "providers"
                ? "Provayder qo‘shish"
                : module === "incidents"
                  ? "Hodisa ochish"
                  : "Vazifa yaratish"}
            </button>
          )}
        </div>
      </div>
      {success && (
        <div className="alert ops-success" role="status">
          <CheckCircle2 size={18} />
          <span>{success}</span>
          <button
            className="btn btn-icon"
            aria-label="Xabarni yopish"
            onClick={() => setSuccess("")}
          >
            <X size={15} />
          </button>
        </div>
      )}
      {error && (
        <div className="alert" role="alert">
          <AlertTriangle size={18} />
          <span>{error}</span>
          <button className="btn" onClick={() => void load()}>
            Qayta urinish
          </button>
        </div>
      )}
      {loading ? (
        <div className="panel ops-loading" role="status">
          <RefreshCw className="spin" size={20} />
          Ma’lumotlar yuklanmoqda…
        </div>
      ) : (
        !error && (
          <>
            <div className="stat-grid ops-stats">
              <div className="stat-card">
                <span>
                  Jami{" "}
                  {module === "providers"
                    ? "provayder"
                    : module === "incidents"
                      ? "hodisa"
                      : "vazifa"}
                </span>
                <strong>{rows.length}</strong>
              </div>
              <div className="stat-card">
                <span>
                  {module === "providers"
                    ? "Yuqori va kritik xavf"
                    : "Faol ishlar"}
                </span>
                <strong>
                  {module === "providers"
                    ? rows.filter((r) =>
                        ["HIGH", "CRITICAL"].includes(r.risk_rating),
                      ).length
                    : rows.length - complete}
                </strong>
              </div>
              <div className="stat-card">
                <span>
                  {module === "providers"
                    ? "Qayta baholash muddati o‘tgan"
                    : module === "tasks"
                      ? "Muddati o‘tgan vazifalar"
                      : "Hal qilingan / yopilgan"}
                </span>
                <strong>{module === "incidents" ? complete : overdue}</strong>
              </div>
            </div>
            {rows.length > 0 && (
              <div
                className="panel ops-distribution"
                aria-label={
                  module === "providers"
                    ? "Provayder xavflari taqsimoti"
                    : "Holatlar taqsimoti"
                }
              >
                <div className="ops-section-head">
                  <h2>
                    {module === "providers"
                      ? "Bog‘liqlik va xavf nazorati"
                      : "Ishlar holati"}
                  </h2>
                  <span>Ustunni tanlab reestrni filtrlang</span>
                </div>
                <div className="ops-bars">
                  {statusValues.map((value) => {
                    const count = rows.filter(
                      (row) =>
                        (module === "providers"
                          ? row.risk_rating
                          : row.status) === value,
                    ).length;
                    return (
                      <button
                        className={`ops-bar-button ${filter === value ? "selected" : ""}`}
                        key={value}
                        onClick={() =>
                          setFilter((previous) =>
                            previous === value ? "" : value,
                          )
                        }
                        aria-pressed={filter === value}
                        aria-label={`${labels[value]}: ${count} ta. Filtrlash`}
                      >
                        <span>{labels[value]}</span>
                        <span className="ops-bar-track">
                          <span
                            style={{ width: `${(count / rows.length) * 100}%` }}
                            className={`ops-bar-fill status-${value.toLowerCase()}`}
                          />
                        </span>
                        <strong>{count}</strong>
                      </button>
                    );
                  })}
                </div>
                {module === "providers" && (
                  <p className="ops-help">
                    Har bir provayderga biriktirilgan aktiv va xizmatlar uzilish
                    ssenariysining ta’sir doirasini belgilaydi. Quyidagi reestr
                    grafikning jadval muqobilidir.
                  </p>
                )}
              </div>
            )}
            {module === "providers" &&
              rows.some(
                (row) => row.assets?.length || row.services?.length,
              ) && (
                <div className="panel ops-distribution">
                  <div className="ops-section-head">
                    <h2>Provayderlarga bog‘liqlik konsentratsiyasi</h2>
                    <span>Provayderni tanlab bog‘liq resurslarni ko‘ring</span>
                  </div>
                  <div className="ops-concentration">
                    {rows
                      .filter(
                        (row) => row.assets?.length || row.services?.length,
                      )
                      .map((row) => {
                        const amount =
                          (row.assets?.length || 0) +
                          (row.services?.length || 0);
                        const total = rows.reduce(
                          (sum, item) =>
                            sum +
                            (item.assets?.length || 0) +
                            (item.services?.length || 0),
                          0,
                        );
                        return (
                          <button
                            className="ops-bar-button"
                            key={row.id}
                            onClick={() => setSelected(row.id)}
                            aria-label={`${row.name}: ${amount} ta bog‘liqlik, tafsilotlarni ochish`}
                          >
                            <span>{row.name}</span>
                            <strong>{amount}</strong>
                            <span className="ops-bar-track">
                              <span
                                className="ops-bar-fill"
                                style={{ width: `${(amount / total) * 100}%` }}
                              />
                            </span>
                          </button>
                        );
                      })}
                  </div>
                  <p className="ops-help">
                    Har bir ustun biriktirilgan aktivlar va xizmatlarning jami
                    bog‘liqliklar ichidagi ulushini ko‘rsatadi. Reestrda aktiv
                    va xizmatlar soni alohida berilgan.
                  </p>
                </div>
              )}
            <div className="panel">
              <div className="ops-toolbar">
                <label className="ops-search">
                  <Search size={17} />
                  <span className="sr-only">Reestrdan qidirish</span>
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Nomi yoki tavsif bo‘yicha qidirish"
                  />
                </label>
                <label className="ops-filter">
                  <span>Filtr</span>
                  <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                  >
                    <option value="">Barcha holatlar</option>
                    {statusValues.map((value) => (
                      <option value={value} key={value}>
                        {labels[value]}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              {filtered.length ? (
                <div className="table-wrap">
                  <table className="ops-table">
                    <caption className="sr-only">
                      {titles[module]} reestri, {filtered.length} ta yozuv
                    </caption>
                    <thead>
                      <tr>
                        <th scope="col">
                          {module === "providers"
                            ? "Provayder va bog‘liqlik"
                            : "Nomi"}
                        </th>
                        <th scope="col">
                          {module === "providers" ? "Xavf" : "Holat"}
                        </th>
                        <th scope="col">Mas’ul</th>
                        <th scope="col">
                          {module === "incidents"
                            ? "Daraja"
                            : module === "providers"
                              ? "Qayta baholash"
                              : "Muddat"}
                        </th>
                        <th scope="col">Amallar</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((row) => (
                        <tr key={row.id}>
                          <td>
                            <button
                              className="ops-record-link"
                              onClick={() =>
                                setSelected((previous) =>
                                  previous === row.id ? null : row.id,
                                )
                              }
                              aria-expanded={selected === row.id}
                            >
                              {names(row)}
                              <ArrowRight size={14} />
                            </button>
                            {module === "providers" && (
                              <small className="ops-subline">
                                {row.services?.length || 0} xizmat ·{" "}
                                {row.assets?.length || 0} aktiv
                              </small>
                            )}
                          </td>
                          <td>
                            <Badge
                              value={
                                module === "providers"
                                  ? row.risk_rating
                                  : row.status
                              }
                            />
                          </td>
                          <td>{relatedName("users", row.owner)}</td>
                          <td>
                            {module === "incidents" ? (
                              <Badge value={row.severity} />
                            ) : (
                              formatDate(
                                module === "providers"
                                  ? row.next_review_date
                                  : row.due_date,
                              )
                            )}
                          </td>
                          <td>
                            {canEdit(row) ? (
                              <button
                                className="btn"
                                onClick={() => openEdit(row)}
                              >
                                Tahrirlash
                              </button>
                            ) : (
                              <span className="ops-help">Faqat ko‘rish</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="ops-empty">
                  <Network size={30} />
                  <h2>
                    {rows.length
                      ? "Qidiruvga mos yozuv topilmadi"
                      : "Hali yozuv yo‘q"}
                  </h2>
                  <p>
                    {rows.length
                      ? "Qidiruv yoki filtrni o‘zgartiring."
                      : "Birinchi yozuvni yaratib, mas’ul va bog‘liqliklarni belgilang."}
                  </p>
                  {writable && !rows.length && (
                    <button
                      className="btn btn-primary"
                      onClick={() => openEdit()}
                    >
                      <Plus size={16} />
                      Birinchi yozuvni yaratish
                    </button>
                  )}
                </div>
              )}
            </div>
            {selectedRow && (
              <div className="panel ops-detail">
                <div className="ops-section-head">
                  <div>
                    <p className="ops-eyebrow">
                      #{selectedRow.id} · Tafsilotlar
                    </p>
                    <h2>{names(selectedRow)}</h2>
                  </div>
                  <button
                    className="btn btn-icon"
                    onClick={() => setSelected(null)}
                    aria-label="Tafsilotlarni yopish"
                  >
                    <X size={17} />
                  </button>
                </div>
                <p className="ops-description">
                  {selectedRow.description || "Tavsif kiritilmagan."}
                </p>
                {module === "providers" && (
                  <>
                    <dl className="ops-details-grid">
                      <div>
                        <dt>Xizmatlar</dt>
                        <dd>
                          {selectedRow.services?.length
                            ? selectedRow.services
                                .map((id: number) =>
                                  relatedName("services", id),
                                )
                                .join(", ")
                            : "Bog‘lanmagan"}
                        </dd>
                      </div>
                      <div>
                        <dt>Aktivlar</dt>
                        <dd>
                          {selectedRow.assets?.length
                            ? selectedRow.assets
                                .map((id: number) => relatedName("assets", id))
                                .join(", ")
                            : "Bog‘lanmagan"}
                        </dd>
                      </div>
                      <div>
                        <dt>Aloqa emaili</dt>
                        <dd>{selectedRow.contact_email || "Belgilanmagan"}</dd>
                      </div>
                    </dl>
                    {writable && (
                      <button
                        className="btn btn-primary"
                        onClick={() => {
                          setEditing(selectedRow);
                          setForm({
                            title: `${selectedRow.name}: xizmat uzilishi`,
                            estimated_outage_hours: "4",
                          });
                          setFormError("");
                          setDialog("disruption");
                        }}
                      >
                        <Network size={16} />
                        Uzilish ta’sirini sinash
                      </button>
                    )}
                    <p className="ops-help">
                      Sinov yangi ssenariy va saqlangan natija yaratadi. Haqiqiy
                      hodisa avtomatik ochilmaydi.
                    </p>
                  </>
                )}
                {module === "incidents" && (
                  <>
                    <dl className="ops-details-grid">
                      {[
                        ["Provayder", "providers", "provider"],
                        ["Aktiv", "assets", "asset"],
                        ["Tiklanish rejasi", "plans", "plan"],
                        ["Ssenariy", "scenarios", "scenario"],
                      ].map(([label, resource, key]) => (
                        <div key={key}>
                          <dt>{label}</dt>
                          <dd>{relatedName(resource, selectedRow[key])}</dd>
                        </div>
                      ))}
                    </dl>
                    <div className="ops-section-head">
                      <h3>Javob choralari va vazifalar</h3>
                      {writable &&
                        !["RESOLVED", "CLOSED"].includes(selectedRow.status) &&
                        selectedRow.severity !== "CRITICAL" && (
                          <button
                            className="btn btn-danger"
                            onClick={() => {
                              const values = [
                                "LOW",
                                "MEDIUM",
                                "HIGH",
                                "CRITICAL",
                              ];
                              setEditing(selectedRow);
                              setForm({
                                severity:
                                  values[
                                    values.indexOf(selectedRow.severity) + 1
                                  ],
                                reason: "",
                              });
                              setFormError("");
                              setDialog("escalation");
                            }}
                          >
                            <AlertTriangle size={15} />
                            Eskalatsiya
                          </button>
                        )}
                      {writable &&
                        !["RESOLVED", "CLOSED"].includes(
                          selectedRow.status,
                        ) && (
                          <button
                            className="btn"
                            onClick={() => {
                              setEditing(selectedRow);
                              setForm({
                                title: "",
                                description: "",
                                owner: "",
                                due_date: "",
                              });
                              setFormError("");
                              setDialog("incidentTask");
                            }}
                          >
                            <Plus size={15} />
                            Chora qo‘shish
                          </button>
                        )}
                    </div>
                    {selectedTasks.length ? (
                      <ul className="ops-task-list">
                        {selectedTasks.map((task) => (
                          <li key={task.id}>
                            {task.status === "DONE" ? (
                              <CheckCircle2 size={16} />
                            ) : (
                              <Circle size={16} />
                            )}
                            <span>{task.title}</span>
                            <Badge value={task.status} />
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="ops-help">
                        Bu hodisaga hali vazifa biriktirilmagan. “Yaxshilash
                        vazifalari” sahifasida yarating.
                      </p>
                    )}
                    {selectedRow.conclusion && (
                      <div className="ops-conclusion">
                        <strong>Yakuniy xulosa</strong>
                        <p>{selectedRow.conclusion}</p>
                      </div>
                    )}
                    <h3>Hodisa voqealari</h3>
                    {timelineLoading ? (
                      <p role="status">Voqealar yuklanmoqda…</p>
                    ) : timelineError ? (
                      <div className="alert" role="alert">
                        {timelineError}
                        <button
                          className="btn"
                          onClick={() => void loadTimeline(selectedRow.id)}
                        >
                          Qayta urinish
                        </button>
                      </div>
                    ) : timeline.length ? (
                      <ol className="ops-timeline">
                        {timeline.map((event) => (
                          <li key={event.id}>
                            <Clock3 size={15} />
                            <div>
                              <p>
                                {event.message ||
                                  event.description ||
                                  event.action}
                              </p>
                              <small>
                                {event.actor_name ||
                                  event.actor_username ||
                                  relatedName("users", event.actor)}{" "}
                                ·{" "}
                                {event.created_at || event.timestamp
                                  ? new Date(
                                      event.created_at || event.timestamp,
                                    ).toLocaleString("uz-UZ")
                                  : ""}
                              </small>
                            </div>
                          </li>
                        ))}
                      </ol>
                    ) : (
                      <p className="ops-help">
                        Qo‘shimcha izohlar hali yo‘q. Holat o‘zgarishlari audit
                        jurnalida saqlanadi.
                      </p>
                    )}
                    {writable && (
                      <form
                        className="ops-comment"
                        onSubmit={addTimelineMessage}
                      >
                        <label className="field">
                          <span>Jurnalga izoh</span>
                          <textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            required
                            rows={2}
                          />
                        </label>
                        <button
                          className="btn"
                          disabled={busy || !message.trim()}
                        >
                          {busy ? "Yuborilmoqda…" : "Izoh qo‘shish"}
                        </button>
                      </form>
                    )}
                  </>
                )}
                {module === "tasks" && (
                  <dl className="ops-details-grid">
                    {[
                      ["Hodisa", "incidents", "incident"],
                      ["Ssenariy", "scenarios", "scenario"],
                      ["Jarayon", "processes", "process"],
                    ].map(([label, resource, key]) => (
                      <div key={key}>
                        <dt>{label}</dt>
                        <dd>{relatedName(resource, selectedRow[key])}</dd>
                      </div>
                    ))}
                  </dl>
                )}
              </div>
            )}
            {module === "providers" &&
              !!relations["simulation-runs"]?.length && (
                <label className="field ops-run-history">
                  <span>Saqlangan ssenariy natijalari</span>
                  <select
                    value={run?.id || ""}
                    onChange={(event) =>
                      setRun(
                        relations["simulation-runs"].find(
                          (item) => item.id === Number(event.target.value),
                        ) || null,
                      )
                    }
                  >
                    <option value="">Tahlil natijasini tanlang</option>
                    {relations["simulation-runs"].map((item) => (
                      <option value={item.id} key={item.id}>
                        {item.scenario_title} · {formatDate(item.created_at)}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            {run && module === "providers" && (
              <div className="panel ops-detail" role="status">
                <div className="ops-section-head">
                  <h2>Saqlangan ta’sir tahlili #{run.id}</h2>
                  <button
                    className="btn btn-icon"
                    aria-label="Natijani yopish"
                    onClick={() => setRun(null)}
                  >
                    <X size={16} />
                  </button>
                </div>
                <p>
                  Provayder uzilishi bo‘yicha natija bazaga yozildi. Aniqlangan
                  kamchilikni mas’ulga biriktirish mumkin.
                </p>
                <RunResults run={run} />
                {writable && (
                  <button
                    className="btn btn-primary"
                    onClick={() => {
                      setForm({
                        title: "Provayder uzilishiga tayyorgarlikni yaxshilash",
                        description: "",
                        owner: "",
                        due_date: "",
                      });
                      setFormError("");
                      setDialog("improvement");
                    }}
                  >
                    <Plus size={16} />
                    Natijadan vazifa yaratish
                  </button>
                )}
              </div>
            )}
          </>
        )
      )}
      {dialog && (
        <Dialog
          title={
            dialog === "disruption"
              ? "Provayder uzilishini sinash"
              : dialog === "improvement"
                ? "Tahlildan yaxshilash vazifasi"
                : dialog === "incidentTask"
                  ? "Hodisaga javob chorasi"
                  : dialog === "escalation"
                    ? "Hodisani eskalatsiya qilish"
                    : `${editing ? "Tahrirlash" : "Yaratish"} · ${titles[module]}`
          }
          onClose={closeDialog}
        >
          <form onSubmit={save} className="ops-form">
            {formError && (
              <div className="alert" role="alert">
                {formError}
              </div>
            )}
            <div className="ops-form-grid">
              {dialog === "escalation" ? (
                <>
                  {field("severity", "Yangi muhimlik darajasi", {
                    choices: ["LOW", "MEDIUM", "HIGH", "CRITICAL"].filter(
                      (value) =>
                        ["LOW", "MEDIUM", "HIGH", "CRITICAL"].indexOf(value) >
                        ["LOW", "MEDIUM", "HIGH", "CRITICAL"].indexOf(
                          editing!.severity,
                        ),
                    ),
                  })}
                  {field("reason", "Eskalatsiya sababi", {
                    required: true,
                    area: true,
                  })}
                  <p className="ops-help ops-full">
                    Muhimlik darajasi oshiriladi va sabab hodisa jurnalida
                    saqlanadi. Mas’ulni o‘zgartirish uchun hodisani tahrirlang.
                  </p>
                </>
              ) : dialog === "disruption" ? (
                <>
                  {field("title", "Ssenariy nomi", { required: true })}
                  {field(
                    "estimated_outage_hours",
                    "Kutilayotgan uzilish (soat)",
                    { required: true, type: "number" },
                  )}
                  <p className="ops-help ops-full">
                    Provayderga bog‘langan aktivlar asosida ta’sir tahlili
                    bajariladi. Bu amal bazadagi xizmatlarni o‘chirmaydi.
                  </p>
                </>
              ) : dialog === "improvement" || dialog === "incidentTask" ? (
                <>
                  {field("title", "Vazifa nomi", { required: true })}
                  {field("owner", "Mas’ul", { relation: "users" })}
                  {field("due_date", "Muddat", { type: "date" })}
                  {field("description", "Xulosa va rejalashtirilgan chora", {
                    area: true,
                  })}
                </>
              ) : module === "providers" ? (
                <>
                  {field("name", "Provayder nomi", { required: true })}
                  {field("risk_rating", "Xavf darajasi", {
                    choices: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
                  })}
                  {field("owner", "Mas’ul", { relation: "users" })}
                  {field("contact_email", "Aloqa emaili", { type: "email" })}
                  {field("next_review_date", "Qayta baholash sanasi", {
                    type: "date",
                  })}
                  {field("services", "Bog‘langan xizmatlar", {
                    relation: "services",
                    multiple: true,
                  })}
                  {field("assets", "Bog‘langan aktivlar", {
                    relation: "assets",
                    multiple: true,
                  })}
                  {field("description", "Tavsif", { area: true })}
                </>
              ) : module === "incidents" ? (
                <>
                  {field("title", "Hodisa nomi", { required: true })}
                  {field("severity", "Muhimlik darajasi", {
                    choices: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
                  })}
                  {field("status", "Holat", {
                    choices: [
                      "OPEN",
                      "INVESTIGATING",
                      "RECOVERING",
                      "RESOLVED",
                      "CLOSED",
                    ],
                  })}
                  {field("owner", "Javobgar mas’ul", { relation: "users" })}
                  {field("provider", "Provayder", { relation: "providers" })}
                  {field("asset", "Zararlangan aktiv", { relation: "assets" })}
                  {field("plan", "Tiklanish rejasi", { relation: "plans" })}
                  {field("scenario", "Bog‘langan ssenariy", {
                    relation: "scenarios",
                  })}
                  {field("description", "Hodisa tavsifi", { area: true })}
                  {field("conclusion", "Yakuniy xulosa", {
                    area: true,
                    required:
                      form.status === "CLOSED" || form.status === "RESOLVED",
                  })}
                  {["CLOSED", "RESOLVED"].includes(String(form.status)) && (
                    <p className="ops-help ops-full">
                      Hodisani yopishdan oldin javob choralarini bajaring va
                      yakuniy xulosani yozing. Server ochiq vazifalarni
                      tekshiradi.
                    </p>
                  )}
                </>
              ) : user.role === "PROCESS_OWNER" ? (
                <>
                  {field("status", "Bajarilish holati", {
                    choices: ["OPEN", "IN_PROGRESS", "DONE"],
                  })}
                  {field("description", "Amaliy chora va xulosa", {
                    area: true,
                  })}
                </>
              ) : (
                <>
                  {field("title", "Vazifa nomi", { required: true })}
                  {field("status", "Bajarilish holati", {
                    choices: ["OPEN", "IN_PROGRESS", "DONE"],
                  })}
                  {field("owner", "Mas’ul", { relation: "users" })}
                  {field("due_date", "Bajarish muddati", { type: "date" })}
                  {field("incident", "Hodisa", { relation: "incidents" })}
                  {field("scenario", "Ssenariy", { relation: "scenarios" })}
                  {field("process", "Jarayon", { relation: "processes" })}
                  {field("description", "Amaliy chora va xulosa", {
                    area: true,
                  })}
                </>
              )}
            </div>
            <div className="ops-form-footer">
              <button
                type="button"
                className="btn"
                onClick={closeDialog}
                disabled={busy}
              >
                Bekor qilish
              </button>
              <button type="submit" className="btn btn-primary" disabled={busy}>
                {busy
                  ? "Saqlanmoqda…"
                  : dialog === "disruption"
                    ? "Sinovni boshlash"
                    : "Saqlash"}
              </button>
            </div>
          </form>
        </Dialog>
      )}
    </section>
  );
}
