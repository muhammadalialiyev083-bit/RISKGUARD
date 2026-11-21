import { useId, useState } from "react";
import { ArrowLeft, ArrowRight, BookOpen, Plus } from "lucide-react";
import { distribution, guides, labels } from "./workflow";
import type { RecordRow } from "./workflow";

export function SectionGuide({
  module,
  rows = [],
  user,
  loading = false,
  unavailable = false,
  onNavigate,
  onStart,
  sample = false,
}: {
  module: string;
  rows?: RecordRow[];
  user: RecordRow;
  loading?: boolean;
  unavailable?: boolean;
  onNavigate: (target: string) => void;
  onStart?: () => void;
  sample?: boolean;
}) {
  const id = useId();
  const [expanded, setExpanded] = useState(true);
  const guide = guides[module];
  if (!guide) return null;
  const profile =
    module === "organizations"
      ? rows[0] || user.organization_detail || {}
      : user;
  const values =
    guide.field === "profile"
      ? (module === "organizations"
          ? [
              ["Nomi", profile.name],
              ["Faoliyat sohasi", profile.sector],
              ["Vaqt mintaqasi", profile.timezone],
            ]
          : [
              ["Ism", profile.first_name],
              ["Familiya", profile.last_name],
              ["Email", profile.email],
              ["Telefon", profile.phone],
            ]
        ).map(([label, value]) => ({
          label: String(label),
          value: value ? 1 : 0,
        }))
      : distribution(rows, guide.field);
  const maximum = Math.max(1, ...values.map((value) => value.value));
  const readonly =
    user.role === "AUDITOR" && module !== "map" && module !== "settings";
  const go = (target: string) =>
    onNavigate(readonly ? target.split("?")[0] : target);
  return (
    <section
      className={`section-guide section-guide-${module}`}
      id="section-guide"
      aria-labelledby={id}
    >
      <img
        className="section-illustration"
        src={`/illustrations/${guides[module] ? module : "organizations"}.svg`}
        alt=""
        aria-hidden="true"
      />
      <div className="section-guide-body">
        <div className="section-guide-title">
          <BookOpen size={18} aria-hidden="true" />
          <h2 id={id}>{guide.title}</h2>
          <button
            className="text-button"
            aria-expanded={expanded}
            aria-controls={id + "-steps"}
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? "Qadamlarni yig‘ish" : "Qadamlarni ko‘rish"}
          </button>
        </div>
        <p>{guide.purpose}</p>
        {expanded && (
          <ol id={id + "-steps"}>
            {guide.steps.map((step, index) => (
              <li key={index}>
                <span className="guide-step-number">{index + 1}</span>
                <div>
                  <p>{step.text}</p>
                  <button
                    className="text-button"
                    onClick={() => go(step.target)}
                  >
                    {step.label}
                    <ArrowRight size={13} />
                  </button>
                </div>
              </li>
            ))}
          </ol>
        )}
        <div className="section-guide-actions">
          {onStart && (
            <button className="btn btn-small" onClick={onStart}>
              <Plus size={14} />
              {readonly ? "Reestrni ko‘rish" : guide.primary}
            </button>
          )}
          <button className="btn btn-small" onClick={() => go(guide.previous)}>
            <ArrowLeft size={13} />
            {labels[guide.previous] || guide.previous}
          </button>
          <button className="btn btn-small" onClick={() => go(guide.next)}>
            {labels[guide.next] || guide.next}
            <ArrowRight size={13} />
          </button>
        </div>
      </div>
      <div
        className="section-mini-chart"
        role="img"
        aria-label={
          unavailable
            ? "Diagramma ma’lumotlari olinmadi"
            : `${sample ? "Namuna" : "Joriy ma’lumot"}: ${guide.field === "profile" ? "to‘ldirilgan maydonlar" : rows.length + " ta yozuv"}`
        }
      >
        <div>
          <strong>
            {guide.field === "profile"
              ? "Profil maydonlari"
              : (
                  {
                    criticality: "Jarayonlar muhimligi",
                    status: "Holatlar bo‘yicha",
                    type: "Aktiv turlari",
                    risk_class: "Risk darajalari",
                    is_selected: "Strategiya tanlovi",
                    estimated_outage_hours: "Uzilish davomiyligi",
                    outcome: "Mashq natijalari",
                    owner: "Mas’ullar",
                    action: "Amallar bo‘yicha",
                    kind: "Manzil turlari",
                  } as Record<string, string>
                )[guide.field] || "Reestr ko‘rinishi"}
          </strong>
          <small>
            {loading
              ? "Yuklanmoqda…"
              : sample
                ? "Namuna manzillari"
                : "Joriy ma’lumotlar"}
          </small>
        </div>
        {loading ? (
          <div className="mini-chart-loading" aria-hidden="true" />
        ) : unavailable ? (
          <p className="muted">
            Ma’lumot olinmadi. Reestrdagi qayta urinish tugmasidan foydalaning.
          </p>
        ) : values.length ? (
          values.slice(0, 5).map((item, index) => (
            <div className="mini-chart-row" key={item.label}>
              <span>{item.label}</span>
              <i>
                <b
                  style={{
                    width: `${(item.value / maximum) * 100}%`,
                    opacity: 1 - index * 0.1,
                  }}
                />
              </i>
              <strong>{item.value}</strong>
            </div>
          ))
        ) : (
          <div className="mini-chart-empty">
            <svg viewBox="0 0 180 64" aria-hidden="true">
              <path d="M10 52H170 M10 12V52" />
              <path d="M40 46V46 M80 46V46 M120 46V46" />
            </svg>
            <p>Yozuvlar kiritilgach diagramma shu yerda shakllanadi.</p>
          </div>
        )}
      </div>
    </section>
  );
}
