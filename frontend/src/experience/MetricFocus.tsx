import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { UzHiIcon } from "../components/icons/UzHiIcons";

export function MetricFocus({ label, value, description, onNavigate, children }: {
  label: string; value: string; description: string; onNavigate: () => void; children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return <div className="kpi-focus-card">
    {children}
    <button className="kpi-expand" aria-label={`${label}: ko‘rsatkichni kengaytirish`} title="Ko‘rsatkichni kengaytirish" onClick={() => setOpen(true)}><UzHiIcon name="expand" size={13} /></button>
    {open && <MetricDialog label={label} value={value} description={description} onClose={() => setOpen(false)} onNavigate={onNavigate} />}
  </div>;
}

function MetricDialog({ label, value, description, onClose, onNavigate }: {
  label: string; value: string; description: string; onClose: () => void; onNavigate: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const node = dialog.current;
    const overflow = document.body.style.overflow;
    node?.showModal(); document.body.style.overflow = "hidden";
    return () => { node?.close(); document.body.style.overflow = overflow; previous?.focus(); };
  }, []);
  return <dialog ref={dialog} className="panel kpi-focus-dialog" role="dialog" aria-labelledby={id}
    onCancel={e => { e.preventDefault(); onClose(); }}>
    <div className="metric-focus-heading"><p className="eyebrow">BOSHQARUV KO‘RSATKICHI</p><button className="btn btn-icon" aria-label="Ko‘rsatkichni yopish" onClick={onClose}><UzHiIcon name="close" size={18} /></button></div>
    <h2 id={id}>{label}</h2><strong className="metric-focus-value">{value}</strong>
    <p className="muted">{description}</p>
    <p className="metric-focus-source">Dashboarddagi joriy filtrlar va tashkilot hisoboti asosida.</p>
    <button className="btn btn-primary" onClick={() => { onClose(); onNavigate(); }}>Reestrni ochish <UzHiIcon name="arrowRight" size={15} /></button>
  </dialog>;
}
