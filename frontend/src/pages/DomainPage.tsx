import React, { useEffect, useRef, useState } from "react";
import {
  Plus,
  Pencil,
  RefreshCw,
  Download,
  ArrowUpRight,
  X,
  Check,
  Play,
  Search,
  FileText,
} from "lucide-react";
import { api } from "../api/client";
import {
  RiskMatrix,
  DependencyMap,
  SummaryCharts,
} from "../components/DomainCharts";
import "./domain.css";

type Row = Record<string, any>;
type Field = {
  key: string;
  label: string;
  type?: string;
  required?: boolean;
  options?: string[][];
  resource?: string;
  min?: number;
  max?: number;
  value?: any;
};
type Schema = {
  title: string;
  description: string;
  resource: string;
  fields: Field[];
  columns: string[];
  admin?: boolean;
};
const select = (
  key: string,
  label: string,
  resource: string,
  required = true,
): Field => ({ key, label, resource, required });
const text = (key: string, label: string, required = true): Field => ({
  key,
  label,
  required,
});
const number = (
  key: string,
  label: string,
  value = 1,
  min = 0,
  max?: number,
): Field => ({ key, label, type: "number", value, min, max, required: true });
const choice = (key: string, label: string, values: string[][]): Field => ({
  key,
  label,
  options: values,
  value: values[0][0],
  required: true,
});
const roles = [
  ["PROCESS_OWNER", "Jarayon egasi"],
  ["RISK_ANALYST", "Risk tahlilchisi"],
  ["BCMS_MANAGER", "BCMS menejeri"],
  ["APPROVER", "Tasdiqlovchi"],
  ["AUDITOR", "Auditor"],
  ["ADMIN", "Administrator"],
];
const schemas: Record<string, Schema> = {
  organizations: {
    title: "Tashkilot profili",
    description: "Kontekst, ta’sir chegaralari va mas’ul tuzilma.",
    resource: "organizations",
    admin: true,
    fields: [
      text("name", "Tashkilot nomi"),
      text("sector", "Faoliyat sohasi"),
      { ...text("timezone", "Vaqt mintaqasi"), value: "Asia/Tashkent" },
      number(
        "max_acceptable_loss",
        "Maksimal qabul qilinadigan zarar",
        500000000,
      ),
    ],
    columns: ["name", "sector", "timezone", "max_acceptable_loss"],
  },
  departments: {
    title: "Bo‘limlar",
    description: "Tashkilot tuzilmasi va bo‘lim rahbarlari.",
    resource: "departments",
    admin: true,
    fields: [text("name", "Bo‘lim nomi"), text("head_name", "Rahbar", false)],
    columns: ["name", "head_name"],
  },
  services: {
    title: "Xizmatlar",
    description: "Muhim xizmatlardan ularni ta’minlaydigan jarayonlargacha.",
    resource: "services",
    admin: true,
    fields: [
      text("name", "Xizmat nomi"),
      { ...text("description", "Tavsif", false), type: "textarea" },
      select("owner", "Mas’ul", "users", false),
    ],
    columns: ["name", "owner_name", "description"],
  },
  users: {
    title: "Foydalanuvchilar",
    description: "Tashkilot a’zolari, ruxsatlar va xavfsiz taklifnomalar.",
    resource: "users",
    admin: true,
    fields: [
      text("username", "Login"),
      { ...text("email", "Email"), type: "email" },
      text("first_name", "Ism", false),
      text("last_name", "Familiya", false),
      choice("role", "Rol", roles),
      select("department", "Bo‘lim", "departments", false),
      { key: "is_active", label: "Hisob faol", type: "checkbox", value: true },
    ],
    columns: ["username", "email", "role", "is_active"],
  },
  processes: {
    title: "Jarayonlar reestri",
    description: "Xizmatlar, mas’ullar va biznes uchun muhimlik darajasi.",
    resource: "processes",
    fields: [
      text("name", "Jarayon nomi"),
      select("service", "Xizmat", "services"),
      select("owner", "Mas’ul", "users", false),
      choice("criticality", "Kritiklik", [
        ["HIGH", "Yuqori"],
        ["CRITICAL", "Kritik"],
        ["MEDIUM", "O‘rta"],
        ["LOW", "Past"],
      ]),
      choice("status", "Holat", [
        ["ACTIVE", "Faol"],
        ["UNDER_REVIEW", "Ko‘rib chiqilmoqda"],
        ["INACTIVE", "Nofaol"],
      ]),
      { ...text("description", "Tavsif", false), type: "textarea" },
    ],
    columns: ["name", "service_name", "owner_name", "criticality", "status"],
  },
  assets: {
    title: "Aktivlar va resurslar",
    description: "Tizim, server, xodim, infratuzilma va provayder resurslari.",
    resource: "assets",
    fields: [
      text("name", "Aktiv nomi"),
      choice("type", "Turi", [
        ["SYSTEM", "Axborot tizimi"],
        ["SERVER", "Server"],
        ["PERSONNEL", "Xodim / jamoa"],
        ["VENDOR", "Provayder"],
        ["FACILITY", "Infratuzilma"],
      ]),
      select("owner", "Mas’ul", "users", false),
      { ...text("description", "Tavsif", false), type: "textarea" },
    ],
    columns: ["name", "type_display", "owner_name", "description"],
  },
  dependencies: {
    title: "Bog‘liqlik xaritasi",
    description:
      "Yo‘nalish: birinchi obyekt ikkinchi obyektga bog‘liq. Uzilishning zanjirsimon ta’sirini kuzating.",
    resource: "dependencies",
    fields: [
      choice("from_type", "Bog‘liq obyekt turi", [
        ["PROCESS", "Jarayon"],
        ["ASSET", "Aktiv"],
      ]),
      select("from_id", "Bog‘liq obyekt", "from-node"),
      choice("to_type", "Tayanch obyekt turi", [
        ["ASSET", "Aktiv"],
        ["PROCESS", "Jarayon"],
      ]),
      select("to_id", "Tayanch obyekt", "to-node"),
      choice("dependency_criticality", "Bog‘liqlik darajasi", [
        ["MANDATORY", "Majburiy"],
        ["OPTIONAL", "Zaxirali"],
      ]),
      text("notes", "Izoh", false),
    ],
    columns: [
      "from_type",
      "from_id",
      "to_type",
      "to_id",
      "dependency_criticality",
    ],
  },
  bia: {
    title: "Biznes ta’sirini baholash",
    description:
      "Tiklanish maqsadlari, zarar va tasdiqlash jarayoni. RTO ≤ MTPD.",
    resource: "bia",
    fields: [
      select("process", "Jarayon", "processes"),
      number("revision", "Tahrir", 1, 1),
      number("mtpd_hours", "MTPD · soat", 24, 0.01),
      number("rto_hours", "RTO · soat", 4, 0.01),
      number("rpo_minutes", "RPO · daqiqa", 60, 1),
      number("backup_interval_minutes", "Zaxiralash oralig‘i · daqiqa", 60, 1),
      { ...text("comments", "Izohlar", false), type: "textarea" },
    ],
    columns: [
      "process_name",
      "revision",
      "rto_hours",
      "mtpd_hours",
      "rpo_minutes",
      "has_rpo_gap",
      "status",
    ],
  },
  risks: {
    title: "Risklar reestri",
    description:
      "Tahdid → nazorat chorasi → qoldiq risk. Matritsa katagiga bosib yozuvlarni filtrlang.",
    resource: "risks",
    fields: [
      select("process", "Jarayon", "processes"),
      select("asset", "Aktiv", "assets", false),
      text("threat", "Tahdid"),
      text("vulnerability", "Zaiflik", false),
      number("likelihood", "Ehtimollik · 1–5", 3, 1, 5),
      number("impact", "Ta’sir · 1–5", 3, 1, 5),
      number("likelihood_residual", "Qoldiq ehtimollik · 1–5", 2, 1, 5),
      number("impact_residual", "Qoldiq ta’sir · 1–5", 2, 1, 5),
      select("owner", "Mas’ul", "users", false),
      choice("status", "Holat", [
        ["IDENTIFIED", "Aniqlangan"],
        ["ASSESSED", "Baholangan"],
        ["MITIGATED", "Kamaytirilgan"],
        ["ACCEPTED", "Qabul qilingan"],
      ]),
    ],
    columns: [
      "threat",
      "process_name",
      "risk_score",
      "residual_risk_score",
      "risk_reduction",
      "status",
    ],
  },
  controls: {
    title: "Nazorat choralari",
    description: "Riskni kamaytiruvchi choralar va samaradorlik dalillari.",
    resource: "controls",
    fields: [
      select("risk", "Risk", "risks"),
      text("title", "Chora nomi"),
      text("description", "Tavsif", false),
      choice("status", "Holat", [
        ["PLANNED", "Rejalashtirilgan"],
        ["IMPLEMENTED", "Joriy qilingan"],
        ["IN_PROGRESS", "Jarayonda"],
        ["EFFECTIVE", "Samarali"],
      ]),
      text("effectiveness_evidence", "Samaradorlik dalili", false),
    ],
    columns: ["title", "risk", "status_display", "effectiveness_evidence"],
  },
  strategies: {
    title: "Tiklash strategiyalari",
    description:
      "Maqsadga mos variantlarni tiklanish vaqti va xarajat bo‘yicha solishtiring.",
    resource: "strategies",
    fields: [
      select("process", "Jarayon", "processes"),
      text("name", "Strategiya nomi"),
      text("description", "Tavsif", false),
      number("estimated_rto_hours", "Kutilgan RTO · soat", 2, 0.01),
      number("estimated_rpo_minutes", "Kutilgan RPO · daqiqa", 30, 1),
      number("estimated_cost", "Xarajat", 0),
      {
        key: "is_selected",
        label: "Tanlangan variant",
        type: "checkbox",
        value: false,
      },
    ],
    columns: [
      "name",
      "process_name",
      "estimated_rto_hours",
      "estimated_rpo_minutes",
      "estimated_cost",
      "is_selected",
    ],
  },
  plans: {
    title: "BCP / DRP rejalari",
    description:
      "Tiklanish qadamlari, mas’ullar, versiyalar va rahbariyat tasdig‘i.",
    resource: "plans",
    fields: [
      select("process", "Jarayon", "processes"),
      text("title", "Reja nomi"),
      { ...text("version", "Versiya"), value: "1.0" },
      { ...text("scope", "Qamrov", false), type: "textarea" },
    ],
    columns: [
      "title",
      "process_name",
      "version",
      "status_display",
      "approved_by_name",
    ],
  },
  simulation: {
    title: "Ssenariy sinovlari",
    description:
      "Aktiv uzilishi, zanjirsimon ta’sir va tiklanish chegaralarini amalda tekshiring.",
    resource: "scenarios",
    fields: [
      text("title", "Ssenariy nomi"),
      { ...text("description", "Tavsif", false), type: "textarea" },
      {
        key: "disrupted_asset_ids",
        label: "Uzilgan aktivlar",
        type: "multiselect",
        resource: "assets",
        required: true,
        value: [],
      },
      number("estimated_outage_hours", "Uzilish · soat", 8, 0.01),
    ],
    columns: ["title", "estimated_outage_hours", "disrupted_asset_ids"],
  },
  exercises: {
    title: "Mashqlar tarixi",
    description:
      "Sinov xulosalarini saqlang va tiklanish rejasini takomillashtiring.",
    resource: "exercises",
    fields: [
      select("plan", "Reja", "plans"),
      select("scenario", "Ssenariy", "scenarios", false),
      {
        key: "exercise_date",
        label: "Sinov sanasi",
        type: "date",
        required: true,
        value: new Date().toISOString().slice(0, 10),
      },
      number("actual_recovery_hours", "Amaldagi tiklanish · soat", 1, 0),
      choice("outcome", "Natija", [
        ["SUCCESS", "Muvaffaqiyatli"],
        ["PARTIAL", "Qisman"],
        ["FAILED", "Muvaffaqiyatsiz"],
      ]),
      { ...text("findings", "Xulosalar va takliflar"), type: "textarea" },
    ],
    columns: [
      "plan_title",
      "exercise_date",
      "actual_recovery_hours",
      "outcome_display",
      "findings",
    ],
  },
  audit: {
    title: "Audit jurnali",
    description:
      "Kim, qachon va nimani o‘zgartirdi. Yozuvlar o‘zgartirilmaydi.",
    resource: "audit-logs",
    fields: [],
    columns: [
      "timestamp",
      "actor_username",
      "actor_role",
      "action",
      "entity",
      "entity_id",
    ],
  },
};
const labels: Record<string, string> = {
  name: "Nomi",
  title: "Nomi",
  sector: "Soha",
  timezone: "Vaqt mintaqasi",
  max_acceptable_loss: "Zarar chegarasi",
  head_name: "Rahbar",
  owner_name: "Mas’ul",
  description: "Tavsif",
  username: "Login",
  email: "Email",
  role: "Rol",
  is_active: "Faol",
  service_name: "Xizmat",
  criticality: "Kritiklik",
  status: "Holat",
  type_display: "Turi",
  from_type: "Manba turi",
  from_id: "Manba",
  to_type: "Tayanch turi",
  to_id: "Tayanch",
  dependency_criticality: "Bog‘liqlik",
  process_name: "Jarayon",
  revision: "Tahrir",
  rto_hours: "RTO · soat",
  mtpd_hours: "MTPD · soat",
  rpo_minutes: "RPO · daqiqa",
  has_rpo_gap: "RPO tafovuti",
  threat: "Tahdid",
  risk_score: "Risk balli",
  residual_risk_score: "Qoldiq risk",
  risk_reduction: "Kamayish",
  risk: "Risk",
  status_display: "Holat",
  effectiveness_evidence: "Dalil",
  estimated_rto_hours: "RTO · soat",
  estimated_rpo_minutes: "RPO · daqiqa",
  estimated_cost: "Xarajat",
  is_selected: "Tanlangan",
  version: "Versiya",
  approved_by_name: "Tasdiqlovchi",
  estimated_outage_hours: "Uzilish · soat",
  disrupted_asset_ids: "Aktivlar",
  plan_title: "Reja",
  exercise_date: "Sana",
  actual_recovery_hours: "Tiklanish · soat",
  outcome_display: "Natija",
  findings: "Xulosalar",
  timestamp: "Vaqt",
  actor_username: "Foydalanuvchi",
  actor_role: "Rol",
  action: "Amal",
  entity: "Obyekt",
  entity_id: "ID",
};
const translated: Record<string, string> = {
  CRITICAL: "Kritik",
  HIGH: "Yuqori",
  MEDIUM: "O‘rta",
  LOW: "Past",
  ACTIVE: "Faol",
  INACTIVE: "Nofaol",
  UNDER_REVIEW: "Ko‘rib chiqilmoqda",
  DRAFT: "Qoralama",
  SUBMITTED: "Yuborilgan",
  APPROVED: "Tasdiqlangan",
  REJECTED: "Rad etilgan",
  IN_REVIEW: "Tekshiruvda",
  PUBLISHED: "E’lon qilingan",
  ARCHIVED: "Arxivlangan",
  IDENTIFIED: "Aniqlangan",
  ASSESSED: "Baholangan",
  MITIGATED: "Kamaytirilgan",
  ACCEPTED: "Qabul qilingan",
  MANDATORY: "Majburiy",
  OPTIONAL: "Zaxirali",
  PROCESS: "Jarayon",
  ASSET: "Aktiv",
  ADMIN: "Administrator",
  BCMS_MANAGER: "BCMS menejeri",
  PROCESS_OWNER: "Jarayon egasi",
  RISK_ANALYST: "Risk tahlilchisi",
  APPROVER: "Tasdiqlovchi",
  AUDITOR: "Auditor",
};
const groups: string[][] = [
  ["organizations", "departments", "services", "users"],
  ["processes", "assets", "dependencies"],
  ["risks", "controls"],
  ["simulation", "exercises"],
];
const display = (value: any): string =>
  value === true
    ? "Ha"
    : value === false
      ? "Yo‘q"
      : value == null || value === ""
        ? "—"
        : Array.isArray(value)
          ? value.join(", ")
          : translated[value] || String(value);
const errorText = (e: unknown) =>
  e instanceof Error ? e.message : "So‘rov bajarilmadi. Qayta urinib ko‘ring.";
async function all(resource: string): Promise<Row[]> {
  const first = await api.list(resource, { page: 1 });
  const rows = [...first.results];
  let next = first.next;
  let page = 2;
  while (next) {
    const result = await api.list(resource, { page: page++ });
    rows.push(...result.results);
    next = result.next;
  }
  return rows;
}

export function DomainPage({
  module,
  user,
  onNavigate,
}: {
  module: string;
  user: Row;
  onNavigate?: (module: string) => void;
}) {
  const [current, setCurrent] = useState(module);
  const [data, setData] = useState<Record<string, Row[]>>({});
  const [summary, setSummary] = useState<Row | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState(
    () => new URLSearchParams(window.location.search).get("q") || "",
  );
  const [filter, setFilter] = useState("");
  const [period, setPeriod] = useState("");
  const [endPeriod, setEndPeriod] = useState("");
  const [serviceFilter, setServiceFilter] = useState("");
  const [matrix, setMatrix] = useState<[number, number] | null>(null);
  const [editing, setEditing] = useState<Row | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Row | null>(null);
  const [selected, setSelected] = useState<Row | null>(null);
  const generation = useRef(0);
  const schema = schemas[current];
  const reportQuery = new URLSearchParams(
    Object.entries({
      from: period,
      to: endPeriod,
      service: serviceFilter,
    }).filter(([, value]) => value),
  ).toString();
  const readonly = user.role === "AUDITOR";
  const canEdit =
    !readonly && (!schema?.admin || user.role === "ADMIN" || user.is_superuser);
  const canApprove =
    ["ADMIN", "APPROVER"].includes(user.role) || user.is_superuser;
  useEffect(() => {
    setCurrent(module);
    setQuery(new URLSearchParams(window.location.search).get("q") || "");
    setFilter("");
    setMatrix(null);
    setResult(null);
    setSelected(null);
  }, [module]);
  const load = async () => {
    const id = ++generation.current;
    setLoading(true);
    setError("");
    const resources = new Set<string>();
    if (schema) {
      resources.add(schema.resource);
      schema.fields.forEach((f) => {
        if (f.resource && !f.resource.endsWith("-node"))
          resources.add(f.resource);
      });
    }
    if (["dashboard", "reports", "engine", "strategies"].includes(current))
      [
        "processes",
        "bia",
        "risks",
        "plans",
        "assets",
        "dependencies",
        "strategies",
      ].forEach((r) => resources.add(r));
    if (["plans", "simulation"].includes(current)) resources.add("users");
    if (["dashboard", "reports"].includes(current)) resources.add("services");
    if (["dependencies", "simulation"].includes(current))
      ["processes", "assets", "dependencies"].forEach((r) => resources.add(r));
    try {
      const entries = await Promise.all(
        [...resources].map(async (r) => [r, await all(r)] as const),
      );
      const report = ["dashboard", "reports"].includes(current)
        ? await api.get(
            "/reports/organization" + (reportQuery ? "?" + reportQuery : ""),
          )
        : null;
      if (generation.current !== id) return;
      const loaded: Record<string, Row[]> = Object.fromEntries(entries);
      if (report?.process_ids) {
        const ids = new Set<number>(report.process_ids);
        loaded.processes = (loaded.processes || []).filter((p) =>
          ids.has(p.id),
        );
        for (const r of ["bia", "risks", "plans", "strategies"])
          loaded[r] = (loaded[r] || []).filter((x) => ids.has(x.process));
        loaded.dependencies = (loaded.dependencies || []).filter(
          (d) =>
            (d.from_type !== "PROCESS" || ids.has(d.from_id)) &&
            (d.to_type !== "PROCESS" || ids.has(d.to_id)),
        );
      }
      setData(loaded);
      setSummary(report);
      setLoading(false);
    } catch (e) {
      if (generation.current === id) {
        setError(errorText(e));
        setLoading(false);
      }
    }
  };
  useEffect(() => {
    load();
    return () => {
      generation.current++;
    };
  }, [current, user.id, period, endPeriod, serviceFilter]);
  const switchTo = (key: string) => {
    setCurrent(key);
    setSelected(null);
    setResult(null);
    setFilter("");
    setQuery("");
    setMatrix(null);
  };
  const navigate = (key: string) =>
    onNavigate ? onNavigate(key) : switchTo(key);
  const mutate = async (work: () => Promise<any>, success: string) => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await work();
      setNotice(success);
      await load();
      return response;
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };
  const act = async (row: Row, action: string, label: string) => {
    if (
      !window.confirm(`${label}: ${row.title || row.process_name || row.name}?`)
    )
      return;
    await mutate(
      () => api.action(schema.resource, row.id, action),
      "Amal bajarildi. Ma’lumotlar yangilandi.",
    );
  };
  const download = async (path: string, filename: string) => {
    try {
      setBusy(true);
      await api.download(path, filename);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };
  const group = groups.find((g) => g.includes(current));
  const rows = schema
    ? (data[schema.resource] || []).filter(
        (row) =>
          (!query ||
            Object.values(row).some((v) =>
              String(v ?? "")
                .toLocaleLowerCase()
                .includes(query.toLocaleLowerCase()),
            )) &&
          (!filter || Object.values(row).includes(filter)) &&
          (!matrix ||
            (row.likelihood === matrix[0] && row.impact === matrix[1])),
      )
    : [];
  const title =
    schema?.title ||
    (
      {
        dashboard: "Boshqaruv markazi",
        engine: "Hisoblash yadrosi",
        reports: "Rahbariyat hisobotlari",
      } as Record<string, string>
    )[current] ||
    current;
  return (
    <div className="domain-page">
      <div className="page-header">
        <div>
          <p className="eyebrow">UZLUKSIZLIKNI BOSHQARISH</p>
          <h1>{title}</h1>
          <p>
            {schema?.description ||
              "Ma’lumotlarga asoslangan qarorlar. Bog‘langan jarayonlar. Boshqariladigan tiklanish."}
          </p>
        </div>
        <div className="domain-actions">
          <button
            className="btn"
            aria-label="Ma’lumotlarni yangilash"
            onClick={load}
            disabled={loading || busy}
          >
            <RefreshCw size={16} /> Yangilash
          </button>
          {schema &&
            !["audit", "users"].includes(current) &&
            canEdit &&
            (current !== "organizations" ||
              !(data.organizations || []).length ||
              user.is_superuser) && (
              <button
                className="btn btn-primary"
                onClick={() => setEditing(null)}
              >
                <Plus size={16} /> Yangi yozuv
              </button>
            )}
        </div>
      </div>
      {group && (
        <nav className="tabs" aria-label="Modul bo‘limlari">
          {group.map((key) => (
            <button
              key={key}
              className={`btn ${current === key ? "active" : ""}`}
              aria-current={current === key ? "page" : undefined}
              onClick={() => switchTo(key)}
            >
              {schemas[key].title}
            </button>
          ))}
        </nav>
      )}
      {notice && (
        <div role="status" className="alert success">
          <Check size={18} />
          {notice}
          <button
            className="btn icon-button"
            aria-label="Xabarni yopish"
            onClick={() => setNotice("")}
          >
            <X size={16} />
          </button>
        </div>
      )}
      {error && (
        <div role="alert" className="alert error">
          {error}
          <button className="btn" onClick={load}>
            Qayta urinish
          </button>
        </div>
      )}
      {loading ? (
        <div className="panel loading" role="status">
          <RefreshCw className="spin" size={22} /> Ma’lumotlar yuklanmoqda…
        </div>
      ) : (
        !error && (
          <>
            {["dashboard", "reports"].includes(current) && (
              <>
                <div className="domain-toolbar">
                  <label className="field">
                    Jarayon yaratilgan davr · dan
                    <input
                      type="date"
                      value={period}
                      onChange={(e) => setPeriod(e.target.value)}
                    />
                  </label>
                  <label className="field">
                    Davr · gacha
                    <input
                      type="date"
                      value={endPeriod}
                      min={period || undefined}
                      onChange={(e) => setEndPeriod(e.target.value)}
                    />
                  </label>
                  <label className="field">
                    Xizmat
                    <select
                      aria-label="Xizmat"
                      value={serviceFilter}
                      onChange={(e) => setServiceFilter(e.target.value)}
                    >
                      <option value="">Barcha xizmatlar</option>
                      {(data.services || []).map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <span className="muted">
                    {summary?.organization || user.organization_detail?.name}
                  </span>
                  {current === "reports" && (
                    <>
                      <button
                        className="btn"
                        disabled={busy}
                        onClick={() =>
                          download(
                            "/reports/organization?export=pdf" +
                              (reportQuery ? "&" + reportQuery : ""),
                            "UzHi-hisobot.pdf",
                          )
                        }
                      >
                        <Download size={16} /> PDF hisobot
                      </button>
                      <button
                        className="btn"
                        disabled={busy}
                        onClick={() =>
                          download(
                            "/reports/organization?export=csv" +
                              (reportQuery ? "&" + reportQuery : ""),
                            "UzHi-hisobot.csv",
                          )
                        }
                      >
                        <Download size={16} /> CSV hisobot
                      </button>
                    </>
                  )}
                </div>
                <div className="stat-grid">
                  {[
                    ["total_processes", "Jarayonlar", "processes"],
                    ["high_risks_count", "Yuqori risklar", "risks"],
                    ["rpo_gap_count", "RPO tafovutlari", "bia"],
                    [
                      "unplanned_processes_count",
                      "Rejasiz jarayonlar",
                      "plans",
                    ],
                    [
                      "published_plans_count",
                      "E’lon qilingan rejalar",
                      "plans",
                    ],
                    ["approved_bias_count", "Tasdiqlangan BIA", "bia"],
                  ].map(([key, label, target]) => (
                    <button
                      key={key}
                      className="stat-card"
                      onClick={() => navigate(target)}
                    >
                      <span>
                        {label}
                        <ArrowUpRight size={15} />
                      </span>
                      <strong>{summary?.summary?.[key] ?? "—"}</strong>
                      <small>Tegishli reestrni ochish</small>
                    </button>
                  ))}
                </div>
                {!(data.processes || []).length ? (
                  <Empty
                    title="Birinchi xizmatni bog‘lashdan boshlang"
                    text="Haqiqiy ko‘rsatkichlar tashkilot ma’lumotlari kiritilgach shakllanadi."
                    action={() => navigate("organizations")}
                    label="Tashkilot va xizmatlar"
                  />
                ) : (
                  <>
                    <SummaryCharts
                      processes={data.processes || []}
                      bias={data.bia || []}
                      risks={data.risks || []}
                      onNavigate={navigate}
                    />
                    <div className="domain-two">
                      <RiskMatrix
                        risks={data.risks || []}
                        onSelect={() => navigate("risks")}
                      />
                      <ReadinessList
                        bias={data.bia || []}
                        onNavigate={navigate}
                      />
                    </div>
                    <DependencyMap
                      processes={data.processes || []}
                      assets={data.assets || []}
                      dependencies={data.dependencies || []}
                    />
                  </>
                )}
              </>
            )}
            {current === "engine" && readonly && (
              <section className="panel">
                <h2>Faqat o‘qish rejimi</h2>
                <p>
                  Hisoblashni ishga tushirish uchun tahrirlash ruxsati kerak.
                  Hisobotlar va mavjud natijalarni ko‘rishingiz mumkin.
                </p>
              </section>
            )}
            {current === "engine" && !readonly && (
              <>
                <Engine data={data} onError={setError} />
                <RiskEvaluation onError={setError} />
              </>
            )}
            {current === "strategies" && !readonly && (
              <StrategyComparison data={data} onError={setError} />
            )}
            {current === "risks" && (
              <RiskMatrix
                risks={data.risks || []}
                onSelect={(likelihood: number, impact: number) =>
                  setMatrix([likelihood, impact])
                }
              />
            )}
            {current === "dependencies" && (
              <DependencyMap
                processes={data.processes || []}
                assets={data.assets || []}
                dependencies={data.dependencies || []}
              />
            )}
            {schema && (
              <section className="panel domain-registry">
                <div className="domain-toolbar">
                  <label className="domain-search">
                    <Search size={16} />
                    <input
                      aria-label="Reestrda qidirish"
                      placeholder="Reestrda qidirish…"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                    />
                  </label>
                  {["processes", "bia", "risks", "plans", "audit"].includes(
                    current,
                  ) && (
                    <select
                      aria-label="Holat bo‘yicha filtr"
                      value={filter}
                      onChange={(e) => setFilter(e.target.value)}
                    >
                      <option value="">Barcha holatlar</option>
                      {[
                        ...new Set(
                          (data[schema.resource] || [])
                            .map((r) =>
                              current === "audit" ? r.action : r.status,
                            )
                            .filter(Boolean),
                        ),
                      ].map((value) => (
                        <option key={value} value={value}>
                          {display(value)}
                        </option>
                      ))}
                    </select>
                  )}
                  <span className="muted">{rows.length} yozuv</span>
                  {matrix && (
                    <button className="btn" onClick={() => setMatrix(null)}>
                      Matritsa filtrini tozalash
                    </button>
                  )}
                </div>
                {!rows.length ? (
                  <Empty
                    title={
                      query || filter || matrix
                        ? "Mos yozuv topilmadi"
                        : "Hali yozuv yaratilmagan"
                    }
                    text={
                      query || filter || matrix
                        ? "Qidiruv yoki filtrni o‘zgartiring."
                        : "Birinchi yozuvni kiriting. Ma’lumotlar serverda saqlanadi."
                    }
                    action={
                      canEdit && !["audit", "users"].includes(current)
                        ? () => setEditing(null)
                        : undefined
                    }
                    label="Birinchi yozuvni yaratish"
                  />
                ) : (
                  <div className="table-wrap">
                    <table>
                      <caption className="sr-only">
                        {schema.title}: {rows.length} yozuv
                      </caption>
                      <thead>
                        <tr>
                          {schema.columns.map((c) => (
                            <th key={c} scope="col">
                              {labels[c] || c}
                            </th>
                          ))}
                          <th scope="col">Amallar</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((row) => (
                          <React.Fragment key={row.id}>
                            <tr>
                              {schema.columns.map((c) => (
                                <td key={c}>
                                  {c === "timestamp" ? (
                                    new Date(row[c]).toLocaleString("uz-UZ")
                                  ) : (
                                    <span
                                      className={
                                        [
                                          "status",
                                          "criticality",
                                          "risk_score",
                                          "has_rpo_gap",
                                        ].includes(c)
                                          ? `badge ${row[c] === "CRITICAL" || row[c] === true || Number(row[c]) >= 15 ? "danger" : ""}`
                                          : ""
                                      }
                                    >
                                      {c === "from_id" || c === "to_id"
                                        ? `${(data[row[c === "from_id" ? "from_type" : "to_type"] === "PROCESS" ? "processes" : "assets"] || []).find((n) => n.id === row[c])?.name || row[c]}`
                                        : display(row[c])}
                                    </span>
                                  )}
                                </td>
                              ))}
                              <td>
                                <div className="row-actions">
                                  <button
                                    className="btn"
                                    onClick={() =>
                                      setSelected(
                                        selected?.id === row.id ? null : row,
                                      )
                                    }
                                  >
                                    Tafsilot
                                  </button>
                                  {canEdit &&
                                    current !== "audit" &&
                                    !(
                                      current === "bia" &&
                                      row.status === "APPROVED"
                                    ) &&
                                    !(
                                      current === "plans" &&
                                      row.is_frozen
                                    ) && (
                                      <button
                                        className="btn icon-button"
                                        aria-label={`${row.name || row.title || row.process_name || row.username} tahrirlash`}
                                        onClick={() => setEditing(row)}
                                      >
                                        <Pencil size={15} />
                                      </button>
                                    )}
                                  {canEdit &&
                                    current === "bia" &&
                                    row.status === "APPROVED" && (
                                      <button
                                        className="btn"
                                        disabled={busy}
                                        onClick={() => {
                                          if (
                                            window.confirm(
                                              "Tasdiqlangan yozuvni qoralamaga qaytarasizmi? Qayta tasdiqlash talab qilinadi.",
                                            )
                                          )
                                            mutate(
                                              () =>
                                                api.update(
                                                  schema.resource,
                                                  row.id,
                                                  { status: "DRAFT" },
                                                ),
                                              "Yozuv qoralamaga qaytarildi.",
                                            );
                                        }}
                                      >
                                        Qoralamaga qaytarish
                                      </button>
                                    )}
                                  {canEdit && current === "plans" && row.is_frozen && (
                                    <button
                                      className="btn"
                                      disabled={busy}
                                      onClick={() => {
                                        const version = window.prompt("Yangi reja versiyasi:");
                                        if (version?.trim())
                                          mutate(
                                            () => api.action("plans", row.id, "clone_version", { version: version.trim() }),
                                            "Yangi qoralama versiya yaratildi.",
                                          );
                                      }}
                                    >
                                      Yangi versiya
                                    </button>
                                  )}
                                  {current === "plans" &&
                                    row.status === "DRAFT" &&
                                    !row.is_frozen &&
                                    canEdit && (
                                      <button
                                        className="btn"
                                        disabled={busy}
                                        onClick={() =>
                                          act(
                                            row,
                                            "submit",
                                            "Rejani tasdiqqa yuborish",
                                          )
                                        }
                                      >
                                        Yuborish
                                      </button>
                                    )}
                                  {current === "bia" &&
                                    row.status === "DRAFT" &&
                                    canEdit && (
                                      <button
                                        className="btn"
                                        disabled={busy}
                                        onClick={() =>
                                          act(
                                            row,
                                            "submit",
                                            "Tasdiqqa yuborish",
                                          )
                                        }
                                      >
                                        Yuborish
                                      </button>
                                    )}
                                  {current === "bia" &&
                                    canApprove &&
                                    ["DRAFT", "SUBMITTED"].includes(
                                      row.status,
                                    ) && (
                                      <button
                                        className="btn"
                                        disabled={busy}
                                        onClick={() =>
                                          act(
                                            row,
                                            "approve",
                                            "BIAni tasdiqlash",
                                          )
                                        }
                                      >
                                        Tasdiqlash
                                      </button>
                                    )}
                                  {current === "plans" &&
                                    canApprove &&
                                    !["PUBLISHED", "ARCHIVED"].includes(
                                      row.status,
                                    ) && (
                                      <button
                                        className="btn"
                                        disabled={busy}
                                        onClick={() =>
                                          act(
                                            row,
                                            "publish",
                                            "Rejani e’lon qilish",
                                          )
                                        }
                                      >
                                        E’lon qilish
                                      </button>
                                    )}
                                  {current === "plans" && (
                                    <button
                                      className="btn icon-button"
                                      aria-label="Rejani PDF yuklash"
                                      disabled={busy}
                                      onClick={() =>
                                        download(
                                          `/plans/${row.id}/export_pdf/`,
                                          `UzHi-reja-${row.id}.pdf`,
                                        )
                                      }
                                    >
                                      <Download size={16} />
                                    </button>
                                  )}
                                  {current === "simulation" && !readonly && (
                                    <button
                                      className="btn btn-primary"
                                      disabled={busy}
                                      onClick={async () => {
                                        const response = await mutate(
                                          () =>
                                            api.action(
                                              "scenarios",
                                              row.id,
                                              "simulate",
                                            ),
                                          "Simulyatsiya bajarildi.",
                                        );
                                        if (response) setResult(response);
                                      }}
                                    >
                                      <Play size={15} /> Sinash
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                            {selected?.id === row.id && (
                              <tr>
                                <td colSpan={schema.columns.length + 1}>
                                  <Details row={row} module={current} />
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            )}
            {result && (
              <SimulationResult
                result={result}
                users={data.users || []}
                canImprove={["ADMIN", "BCMS_MANAGER", "RISK_ANALYST"].includes(
                  user.role,
                )}
                onNavigate={navigate}
              />
            )}
            {current === "users" && canEdit && (
              <Invite
                onSend={async (form) => {
                  await mutate(
                    () => api.post("/users/invite/", form),
                    "Taklifnoma yuborish so‘rovi qabul qilindi.",
                  );
                }}
              />
            )}
          </>
        )
      )}
      {editing !== undefined && schema && (
        <RecordForm
          schema={schema}
          module={current}
          row={editing}
          data={data}
          onClose={() => setEditing(undefined)}
          onSave={async (payload) => {
            const value = editing
              ? await api.update(schema.resource, editing.id, payload)
              : await api.create(schema.resource, payload);
            setEditing(undefined);
            setNotice("Yozuv saqlandi. Tegishli ko‘rsatkichlar yangilandi.");
            await load();
            return value;
          }}
        />
      )}
    </div>
  );
}

function Empty({
  title,
  text,
  action,
  label,
}: {
  title: string;
  text: string;
  action?: () => void;
  label?: string;
}) {
  return (
    <div className="domain-empty">
      <FileText size={30} />
      <h3>{title}</h3>
      <p>{text}</p>
      {action && (
        <button className="btn btn-primary" onClick={action}>
          <Plus size={16} />
          {label}
        </button>
      )}
    </div>
  );
}
function Details({ row, module }: { row: Row; module: string }) {
  if (module === "plans")
    return (
      <div className="domain-detail">
        <h3>Tiklanish ketma-ketligi</h3>
        {!(row.steps || []).length ? (
          <p>Reja qadamlarini tahrirlash orqali kiriting.</p>
        ) : (
          <ol className="timeline">
            {row.steps.map((s: Row) => (
              <li key={s.id || s.sequence}>
                <strong>
                  {s.sequence}. {s.title}
                </strong>
                <p>
                  {s.assigned_name || "Mas’ul belgilanmagan"} ·{" "}
                  {s.expected_duration_minutes} daqiqa
                </p>
                <p>{s.description}</p>
              </li>
            ))}
          </ol>
        )}
      </div>
    );
  if (module === "bia")
    return (
      <div className="domain-detail">
        <h3>Ta’sir va vaqt chegaralari</h3>
        <p>
          RTO {row.rto_hours} soat ≤ MTPD {row.mtpd_hours} soat. Zaxiralash:{" "}
          {row.backup_interval_minutes} daqiqa / RPO {row.rpo_minutes} daqiqa.
        </p>
        <p className={row.has_rpo_gap ? "danger-text" : "muted"}>
          {row.has_rpo_gap
            ? "Zaxiralash oralig‘i RPO maqsadidan katta. Tiklash strategiyasini qayta baholang."
            : "Zaxiralash oralig‘i RPO maqsadiga mos."}
        </p>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Vaqt · soat</th>
                <th>Moliyaviy zarar</th>
                <th>Operatsion</th>
                <th>Huquqiy</th>
                <th>Obro‘</th>
              </tr>
            </thead>
            <tbody>
              {(row.impacts || []).map((i: Row, idx: number) => (
                <tr key={i.id || idx}>
                  <td>{i.horizon_hours}</td>
                  <td>{i.financial_loss}</td>
                  <td>{i.operational_score}/5</td>
                  <td>{i.legal_score}/5</td>
                  <td>{i.reputational_score}/5</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>{row.comments}</p>
      </div>
    );
  if (module === "risks")
    return (
      <div className="domain-detail">
        <h3>Nazorat choralari</h3>
        <p>{row.vulnerability || "Zaiflik tavsifi kiritilmagan."}</p>
        <p>
          Risk: {row.likelihood} × {row.impact} = {row.risk_score}. Qoldiq:{" "}
          {row.residual_risk_score ?? "—"}.
        </p>
        {(row.controls || []).length ? (
          <ul>
            {row.controls.map((c: Row) => (
              <li key={c.id}>
                <strong>{c.title}</strong> · {c.status_display}
                <p>{c.effectiveness_evidence}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p>“Nazorat choralari” bo‘limida riskka chora qo‘shing.</p>
        )}
      </div>
    );
  return (
    <dl className="domain-detail detail-grid">
      {Object.entries(row)
        .filter(
          ([k, v]) =>
            !["id", "organization"].includes(k) &&
            !Array.isArray(v) &&
            typeof v !== "object",
        )
        .map(([key, value]) => (
          <div key={key}>
            <dt>{labels[key] || key.split("_").join(" ")}</dt>
            <dd>{display(value)}</dd>
          </div>
        ))}
    </dl>
  );
}

function RecordForm({
  schema,
  module,
  row,
  data,
  onClose,
  onSave,
}: {
  schema: Schema;
  module: string;
  row: Row | null;
  data: Record<string, Row[]>;
  onClose: () => void;
  onSave: (payload: Row) => Promise<any>;
}) {
  const [values, setValues] = useState<Row>(() =>
    Object.fromEntries(
      schema.fields.map((f) => [
        f.key,
        row?.[f.key] ?? f.value ?? (f.type === "checkbox" ? false : ""),
      ]),
    ),
  );
  const [steps, setSteps] = useState<Row[]>(row?.steps || []);
  const [impacts, setImpacts] = useState<Row[]>(row?.impacts || []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    panel.current
      ?.querySelector<HTMLElement>("input,select,textarea,button")
      ?.focus();
    const listener = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) onClose();
      if (event.key === "Tab") {
        const nodes = panel.current?.querySelectorAll<HTMLElement>(
          "input,select,textarea,button:not(:disabled)",
        );
        if (!nodes?.length) return;
        const first = nodes[0],
          last = nodes[nodes.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", listener);
    return () => {
      document.removeEventListener("keydown", listener);
      previous?.focus();
    };
  }, [busy]);
  const update = (key: string, value: any) =>
    setValues((v) => ({
      ...v,
      [key]: value,
      ...(key === "from_type"
        ? { from_id: "" }
        : key === "to_type"
          ? { to_id: "" }
          : {}),
    }));
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const payload = { ...values };
      schema.fields.forEach((f) => {
        if (f.type === "number") payload[f.key] = Number(payload[f.key]);
        if (f.resource && f.type !== "multiselect")
          payload[f.key] =
            payload[f.key] === "" ? null : Number(payload[f.key]);
      });
      if (module === "plans")
        payload.steps = steps.map(({ id, plan, assigned_name, ...s }) => ({
          ...s,
          assigned_to: s.assigned_to ? Number(s.assigned_to) : null,
        }));
      if (module === "bia") payload.impacts = impacts.map(({ id, ...i }) => i);
      await onSave(payload);
    } catch (e) {
      setError(errorText(e));
      setBusy(false);
    }
  };
  return (
    <div className="domain-modal-backdrop">
      <div
        className="domain-modal panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="record-form-title"
        ref={panel}
      >
        <form onSubmit={submit}>
          <div className="domain-modal-header">
            <div>
              <p className="eyebrow">{row ? "TAHRIRLASH" : "YANGI YOZUV"}</p>
              <h2 id="record-form-title">{schema.title}</h2>
            </div>
            <button
              type="button"
              className="btn icon-button"
              aria-label="Formani yopish"
              disabled={busy}
              onClick={onClose}
            >
              <X size={20} />
            </button>
          </div>
          {error && (
            <div className="alert error" role="alert">
              {error}
            </div>
          )}
          <div className="domain-form-grid">
            {schema.fields.map((f) => {
              const resource =
                f.resource === "from-node"
                  ? values.from_type === "ASSET"
                    ? "assets"
                    : "processes"
                  : f.resource === "to-node"
                    ? values.to_type === "PROCESS"
                      ? "processes"
                      : "assets"
                    : f.resource;
              const options = resource
                ? (data[resource] || []).map((r) => [
                    String(r.id),
                    r.name ||
                      r.title ||
                      r.threat ||
                      `${r.first_name || ""} ${r.last_name || ""}`.trim() ||
                      r.username,
                  ])
                : f.options;
              return (
                <label
                  className={`field ${f.type === "textarea" ? "wide" : ""}`}
                  key={f.key}
                >
                  {f.label}
                  {f.required ? " *" : ""}
                  {f.type === "checkbox" ? (
                    <input
                      type="checkbox"
                      checked={Boolean(values[f.key])}
                      onChange={(e) => update(f.key, e.target.checked)}
                    />
                  ) : options ? (
                    <select
                      aria-label={f.label}
                      required={f.required}
                      multiple={f.type === "multiselect"}
                      value={
                        f.type === "multiselect"
                          ? (values[f.key] || []).map(String)
                          : String(values[f.key] ?? "")
                      }
                      onChange={(e) =>
                        update(
                          f.key,
                          f.type === "multiselect"
                            ? Array.from(e.target.selectedOptions, (o) =>
                                Number(o.value),
                              )
                            : e.target.value,
                        )
                      }
                    >
                      {f.type !== "multiselect" && (
                        <option value="">Tanlang…</option>
                      )}
                      {options.map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  ) : f.type === "textarea" ? (
                    <textarea
                      rows={3}
                      required={f.required}
                      value={values[f.key]}
                      onChange={(e) => update(f.key, e.target.value)}
                    />
                  ) : (
                    <input
                      type={f.type || "text"}
                      required={f.required}
                      min={f.min}
                      max={f.max}
                      step={f.type === "number" ? "any" : undefined}
                      value={values[f.key]}
                      autoComplete={f.type === "email" ? "email" : "off"}
                      onChange={(e) => update(f.key, e.target.value)}
                    />
                  )}
                  {resource && !(data[resource] || []).length && (
                    <small>Avval tegishli reestrga yozuv kiriting.</small>
                  )}
                  {f.type === "multiselect" && (
                    <small>
                      Bir nechta aktiv uchun Ctrl / Cmd tugmasidan foydalaning.
                    </small>
                  )}
                </label>
              );
            })}
          </div>
          {module === "plans" && (
            <fieldset className="nested-fields">
              <legend>Tiklanish qadamlari</legend>
              {steps.map((step, i) => (
                <div className="nested-row" key={i}>
                  <label className="field">
                    Ketma-ketlik
                    <input
                      type="number"
                      min="1"
                      required
                      value={step.sequence}
                      onChange={(e) =>
                        setSteps((old) =>
                          old.map((s, j) =>
                            j === i
                              ? { ...s, sequence: Number(e.target.value) }
                              : s,
                          ),
                        )
                      }
                    />
                  </label>
                  <label className="field">
                    Qadam nomi
                    <input
                      required
                      value={step.title}
                      onChange={(e) =>
                        setSteps((old) =>
                          old.map((s, j) =>
                            j === i ? { ...s, title: e.target.value } : s,
                          ),
                        )
                      }
                    />
                  </label>
                  <label className="field">
                    Mas’ul
                    <select
                      value={step.assigned_to || ""}
                      onChange={(e) =>
                        setSteps((old) =>
                          old.map((s, j) =>
                            j === i ? { ...s, assigned_to: e.target.value } : s,
                          ),
                        )
                      }
                    >
                      <option value="">Belgilanmagan</option>
                      {(data.users || []).map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.username}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    Daqiqa
                    <input
                      type="number"
                      min="1"
                      required
                      value={step.expected_duration_minutes}
                      onChange={(e) =>
                        setSteps((old) =>
                          old.map((s, j) =>
                            j === i
                              ? {
                                  ...s,
                                  expected_duration_minutes: Number(
                                    e.target.value,
                                  ),
                                }
                              : s,
                          ),
                        )
                      }
                    />
                  </label>
                  <button
                    className="btn icon-button"
                    type="button"
                    aria-label="Qadamni olib tashlash"
                    onClick={() => setSteps((s) => s.filter((_, j) => j !== i))}
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
              <button
                className="btn"
                type="button"
                onClick={() =>
                  setSteps((s) => [
                    ...s,
                    {
                      sequence: s.length + 1,
                      title: "",
                      description: "",
                      assigned_to: null,
                      expected_duration_minutes: 30,
                    },
                  ])
                }
              >
                <Plus size={16} /> Qadam qo‘shish
              </button>
            </fieldset>
          )}
          {module === "bia" && (
            <fieldset className="nested-fields">
              <legend>Vaqt bo‘yicha ta’sir</legend>
              {impacts.map((impact, i) => (
                <div className="nested-row" key={i}>
                  {[
                    ["horizon_hours", "Gorizont · soat", 0.01],
                    ["financial_loss", "Moliyaviy zarar", 0],
                    ["operational_score", "Operatsion · 1–5", 1],
                    ["legal_score", "Huquqiy · 1–5", 1],
                    ["reputational_score", "Obro‘ · 1–5", 1],
                  ].map(([key, label, min]) => (
                    <label className="field" key={key}>
                      {label}
                      <input
                        type="number"
                        step="any"
                        min={min}
                        max={String(key).endsWith("_score") ? 5 : undefined}
                        required
                        value={impact[key]}
                        onChange={(e) =>
                          setImpacts((old) =>
                            old.map((s, j) =>
                              j === i
                                ? { ...s, [key]: Number(e.target.value) }
                                : s,
                            ),
                          )
                        }
                      />
                    </label>
                  ))}
                  <button
                    type="button"
                    className="btn icon-button"
                    aria-label="Ta’sir nuqtasini olib tashlash"
                    onClick={() =>
                      setImpacts((old) => old.filter((_, j) => j !== i))
                    }
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="btn"
                onClick={() =>
                  setImpacts((old) => [
                    ...old,
                    {
                      horizon_hours: 24,
                      financial_loss: 0,
                      operational_score: 1,
                      legal_score: 1,
                      reputational_score: 1,
                    },
                  ])
                }
              >
                <Plus size={16} /> Ta’sir nuqtasi
              </button>
            </fieldset>
          )}
          <div className="domain-form-footer">
            <button
              type="button"
              className="btn"
              disabled={busy}
              onClick={onClose}
            >
              Bekor qilish
            </button>
            <button className="btn btn-primary" type="submit" disabled={busy}>
              {busy ? "Saqlanmoqda…" : "Saqlash"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

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
            .filter((b) => b.has_rpo_gap || b.status !== "APPROVED")
            .slice(0, 6)
            .map((b) => (
              <li key={b.id}>
                <div>
                  <strong>{b.process_name}</strong>
                  <small>
                    {b.has_rpo_gap
                      ? `Zaxira ${b.backup_interval_minutes} daqiqa > RPO ${b.rpo_minutes} daqiqa`
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
        Barcha baholashlar <ArrowUpRight size={15} />
      </button>
    </section>
  );
}
function SimulationResult({
  result,
  users,
  canImprove,
  onNavigate,
}: {
  result: Row;
  users: Row[];
  canImprove: boolean;
  onNavigate: (key: string) => void;
}) {
  return (
    <section className="panel">
      <p className="eyebrow">SIMULYATSIYA NATIJASI</p>
      <h2>{result.scenario_title}</h2>
      <p>
        {result.estimated_outage_hours} soat uzilish ·{" "}
        {result.affected_processes_count} jarayonga ta’sir ·{" "}
        {result.rto_breaches_count} RTO buzilishi · {result.missing_plans_count}{" "}
        rejasiz jarayon
      </p>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Jarayon</th>
              <th>Xizmat</th>
              <th>RTO · soat</th>
              <th>MTPD · soat</th>
              <th>Natija</th>
              <th>Reja</th>
            </tr>
          </thead>
          <tbody>
            {(result.affected_processes || []).map((p: Row) => (
              <tr key={p.process_id}>
                <td>{p.process_name}</td>
                <td>{p.service_name}</td>
                <td>{p.target_rto_hours}</td>
                <td>{p.target_mtpd_hours}</td>
                <td>
                  {p.mtpd_breached
                    ? "MTPD buziladi"
                    : p.rto_breached
                      ? "RTO buziladi"
                      : "Maqsadga mos"}
                </td>
                <td>{p.has_published_plan ? "Mavjud" : "Yetishmaydi"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {canImprove && result.simulation_run_id && (
        <SimulationImprovement runId={result.simulation_run_id} users={users} />
      )}
      <div className="domain-actions">
        <button className="btn" onClick={() => onNavigate("tasks")}>
          Yaxshilash vazifalarini ochish
        </button>
        <button className="btn" onClick={() => onNavigate("plans")}>
          Tiklanish rejalarini ko‘rish
        </button>
      </div>
    </section>
  );
}
function Engine({
  data,
  onError,
}: {
  data: Record<string, Row[]>;
  onError: (s: string) => void;
}) {
  const [rank, setRank] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);
  return (
    <section className="panel">
      <h2>Ustuvorlik reytingi</h2>
      <p className="muted">
        Priority = 0.40 · Ta’sir + 0.25 · Shoshilinchlik + 0.20 · Risk + 0.15 ·
        Bog‘liqlik
      </p>
      <button
        className="btn btn-primary"
        disabled={busy || !(data.processes || []).length}
        onClick={async () => {
          setBusy(true);
          try {
            const r = await api.post("/analyses/priority", {});
            setRank(r.ranked_processes || []);
          } catch (e) {
            onError(errorText(e));
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "Hisoblanmoqda…" : "Haqiqiy ma’lumotlardan hisoblash"}
      </button>
      {!rank.length ? (
        <p className="muted">
          Jarayonlar bo‘yicha reyting olish uchun hisoblashni boshlang.
        </p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Jarayon</th>
                <th>Ustuvorlik</th>
                <th>Ta’sir</th>
                <th>Shoshilinchlik</th>
                <th>Risk</th>
                <th>Bog‘liqlik</th>
              </tr>
            </thead>
            <tbody>
              {rank.map((r) => (
                <tr key={r.process_id}>
                  <td>{r.process_name}</td>
                  <td>
                    <div className="priority-bar">
                      <span
                        style={{ width: `${Number(r.priority_score) * 100}%` }}
                      />
                    </div>
                    {Number(r.priority_score).toFixed(4)}
                  </td>
                  <td>{r.operands.impact_norm}</td>
                  <td>{r.operands.urgency_norm}</td>
                  <td>{r.operands.risk_norm}</td>
                  <td>{r.operands.dependency_norm}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
function StrategyComparison({
  data,
  onError,
}: {
  data: Record<string, Row[]>;
  onError: (s: string) => void;
}) {
  const [process, setProcess] = useState("");
  const [rto, setRto] = useState(4);
  const [rpo, setRpo] = useState(60);
  const [result, setResult] = useState<Row | null>(null);
  const [busy, setBusy] = useState(false);
  const candidates = (data.strategies || []).filter(
    (s) => !process || s.process === Number(process),
  );
  return (
    <section className="panel">
      <h2>Variantlarni solishtirish</h2>
      <div className="domain-toolbar">
        <label className="field">
          Jarayon
          <select
            aria-label="Jarayon"
            value={process}
            onChange={(e) => {
              setProcess(e.target.value);
              setResult(null);
              const bia = (data.bia || []).find(
                (b) => b.process === Number(e.target.value),
              );
              if (bia) {
                setRto(Number(bia.rto_hours));
                setRpo(Number(bia.rpo_minutes));
              }
            }}
          >
            <option value="">Jarayonni tanlang…</option>
            {(data.processes || []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Maqsad RTO · soat
          <input
            type="number"
            min="0.01"
            step="any"
            value={rto}
            onChange={(e) => setRto(Number(e.target.value))}
          />
        </label>
        <label className="field">
          Maqsad RPO · daqiqa
          <input
            type="number"
            min="1"
            value={rpo}
            onChange={(e) => setRpo(Number(e.target.value))}
          />
        </label>
        <button
          className="btn btn-primary"
          disabled={
            busy || !process || !candidates.length || rto <= 0 || rpo <= 0
          }
          onClick={async () => {
            setBusy(true);
            try {
              setResult(
                await api.post("/analyses/evaluate-strategy", {
                  target_rto_hours: rto,
                  target_rpo_minutes: rpo,
                  strategies: candidates.map((s) => ({
                    ...s,
                    cost: s.estimated_cost,
                  })),
                }),
              );
            } catch (e) {
              onError(errorText(e));
            } finally {
              setBusy(false);
            }
          }}
        >
          Solishtirish
        </button>
      </div>
      {result && (
        <div role="status" className="strategy-result">
          <h3>
            {result.recommended_strategy?.name || "Mos variant topilmadi"}
          </h3>
          <p>{result.message}</p>
          <ul>
            {(result.observations || []).map((o: string, i: number) => (
              <li key={i}>{o}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
function Invite({ onSend }: { onSend: (form: Row) => Promise<void> }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("PROCESS_OWNER");
  const [busy, setBusy] = useState(false);
  return (
    <section className="panel">
      <h2>Xavfsiz taklifnoma</h2>
      <p className="muted">
        Yangi a’zo parolini bir martalik email havolasi orqali o‘zi o‘rnatadi.
      </p>
      <form
        className="domain-toolbar"
        onSubmit={async (e) => {
          e.preventDefault();
          if (busy) return;
          setBusy(true);
          try {
            await onSend({ email, role });
          } finally {
            setBusy(false);
          }
        }}
      >
        <label className="field">
          Email
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label className="field">
          Rol
          <select value={role} onChange={(e) => setRole(e.target.value)}>
            {roles.map(([v, label]) => (
              <option key={v} value={v}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? "Yuborilmoqda…" : "Taklif qilish"}
        </button>
      </form>
    </section>
  );
}

function RiskEvaluation({ onError }: { onError: (s: string) => void }) {
  const [values, setValues] = useState<Row>({
    likelihood: 3,
    impact: 3,
    rto_hours: 4,
    rpo_minutes: 60,
    backup_interval_minutes: 60,
  });
  const [result, setResult] = useState<Row | null>(null);
  const [busy, setBusy] = useState(false);
  const fields = [
    number("likelihood", "Ehtimollik · 1–5", 3, 1, 5),
    number("impact", "Ta’sir · 1–5", 3, 1, 5),
    number("rto_hours", "RTO · soat", 4, 0.01),
    number("rpo_minutes", "RPO · daqiqa", 60, 1),
    number("backup_interval_minutes", "Zaxiralash · daqiqa", 60, 1),
  ];
  return (
    <section className="panel">
      <h2>Risk va RPO tafovutini hisoblash</h2>
      <p className="muted">
        Risk = ehtimollik × ta’sir. Zaxiralash oralig‘i RPO dan katta bo‘lsa
        tafovut aniqlanadi. Bu hisob reestrga yangi risk yozmaydi.
      </p>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (busy) return;
          setBusy(true);
          try {
            setResult(await api.post("/analyses/evaluate-risk", values));
          } catch (error) {
            onError(errorText(error));
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="domain-toolbar">
          {fields.map((f) => (
            <label className="field" key={f.key}>
              {f.label}
              <input
                type="number"
                required
                min={f.min}
                max={f.max}
                step={f.key === "rto_hours" ? "any" : 1}
                value={values[f.key]}
                onChange={(e) => {
                  setValues((v) => ({ ...v, [f.key]: Number(e.target.value) }));
                  setResult(null);
                }}
              />
            </label>
          ))}
        </div>
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? "Hisoblanmoqda…" : "Riskni baholash"}
        </button>
      </form>
      {result && (
        <div className="strategy-result" role="status">
          <h3>Risk balli: {result.risk_score} / 25</h3>
          <p>
            {result.risk_class === "high"
              ? "Yuqori risk"
              : result.risk_class === "medium"
                ? "O‘rta risk"
                : "Past risk"}{" "}
            ·{" "}
            {result.rpo_gap
              ? "RPO tafovuti mavjud"
              : "Zaxiralash RPO maqsadiga mos"}
          </p>
          <ul>
            {(result.observations || []).map((o: string, i: number) => (
              <li key={i}>{o}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function SimulationImprovement({
  runId,
  users,
}: {
  runId: number;
  users: Row[];
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [owner, setOwner] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  return (
    <form
      className="nested-fields"
      onSubmit={async (e) => {
        e.preventDefault();
        if (busy) return;
        setBusy(true);
        setError("");
        setMessage("");
        try {
          await api.action("simulation-runs", runId, "improvements", {
            title,
            description,
            owner: owner ? Number(owner) : null,
            due_date: dueDate || null,
          });
          setTitle("");
          setDescription("");
          setMessage(
            "Vazifa yaratildi va saqlangan simulyatsiya natijasiga bog‘landi.",
          );
        } catch (error) {
          setError(errorText(error));
        } finally {
          setBusy(false);
        }
      }}
    >
      <h3>Natijadan yaxshilash vazifasi yarating</h3>
      <p className="muted">Bu vazifa aynan ushbu sinov daliliga bog‘lanadi.</p>
      {message && (
        <p role="status" className="success alert">
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className="error alert">
          {error}
        </p>
      )}
      <div className="domain-form-grid">
        <label className="field">
          Vazifa nomi *
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        <label className="field">
          Mas’ul
          <select value={owner} onChange={(e) => setOwner(e.target.value)}>
            <option value="">Belgilanmagan</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.username}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Bajarish sanasi
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </label>
        <label className="field">
          Xulosa va taklif
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
          />
        </label>
      </div>
      <div className="domain-form-footer">
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? "Saqlanmoqda…" : "Yaxshilash vazifasini saqlash"}
        </button>
      </div>
    </form>
  );
}
