import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Shield, Activity, Layers, AlertTriangle, Cpu, FileText,
  PlayCircle, Clock, CheckCircle2, Download, Building,
  RefreshCw, PlusCircle, Sun, Moon, LogOut, ChevronRight,
  Database, BarChart3, Users, Settings, Zap, Target,
  TrendingDown, GitBranch, BookOpen, X, Info, Check
} from 'lucide-react';
import { api } from './api/client';
import type {
  BusinessProcess, Asset, BIAAssessment, Risk,
  ContinuityPlan, DashboardSummary, AuditLog
} from './types';

/* ────────────────────────────────────────────────
   THEME HOOK
──────────────────────────────────────────────── */
function useTheme() {
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('bcms-theme') as 'dark' | 'light') || 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('bcms-theme', theme);
  }, [theme]);

  const toggle = useCallback(() => setTheme(t => t === 'dark' ? 'light' : 'dark'), []);
  return { theme, toggle };
}

/* ────────────────────────────────────────────────
   TOAST SYSTEM
──────────────────────────────────────────────── */
interface Toast { id: number; type: 'success' | 'error'; message: string; }

function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          {t.type === 'success'
            ? <Check size={16} style={{ flexShrink: 0, color: 'var(--color-low)' }} />
            : <AlertTriangle size={16} style={{ flexShrink: 0, color: 'var(--color-critical)' }} />
          }
          <span style={{ flex: 1, fontSize: 13 }}>{t.message}</span>
          <button
            className="btn-ghost btn-icon"
            style={{ padding: 2 }}
            onClick={() => onDismiss(t.id)}
          >
            <X size={13} />
          </button>
        </div>
      ))}
    </div>
  );
}

/* ────────────────────────────────────────────────
   BADGE HELPER
──────────────────────────────────────────────── */
function Badge({ type, children }: { type: 'critical' | 'high' | 'medium' | 'low' | 'info' | 'neutral'; children: React.ReactNode }) {
  return <span className={`badge badge-${type}`}>{children}</span>;
}

function criticalityBadge(c: string) {
  if (c === 'CRITICAL') return <Badge type="critical">Kritik</Badge>;
  if (c === 'HIGH')     return <Badge type="high">Yuqori</Badge>;
  if (c === 'MEDIUM')   return <Badge type="medium">O'rta</Badge>;
  return <Badge type="neutral">Past</Badge>;
}

function statusBadge(s: string) {
  if (s === 'APPROVED' || s === 'PUBLISHED') return <Badge type="low">{s}</Badge>;
  if (s === 'DRAFT')   return <Badge type="neutral">{s}</Badge>;
  if (s === 'REJECTED') return <Badge type="critical">{s}</Badge>;
  return <Badge type="medium">{s}</Badge>;
}

function riskBadge(cls: string) {
  if (cls === 'high')   return <Badge type="critical">YUQORI</Badge>;
  if (cls === 'medium') return <Badge type="high">O'RTA</Badge>;
  return <Badge type="low">PAST</Badge>;
}

function actionBadge(action: string) {
  if (action === 'CREATE' || action === 'APPROVE') return <Badge type="low">{action}</Badge>;
  if (action === 'DELETE') return <Badge type="critical">{action}</Badge>;
  if (action === 'LOGIN' || action === 'LOGOUT')   return <Badge type="info">{action}</Badge>;
  return <Badge type="medium">{action}</Badge>;
}

/* ────────────────────────────────────────────────
   EMPTY STATE
──────────────────────────────────────────────── */
function EmptyState({ icon: Icon, title, desc }: { icon: React.ElementType; title: string; desc?: string }) {
  return (
    <div className="empty-state">
      <Icon className="empty-state-icon" />
      <div style={{ fontWeight: 600, color: 'var(--color-text-secondary)', fontSize: 14 }}>{title}</div>
      {desc && <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{desc}</div>}
    </div>
  );
}

/* ────────────────────────────────────────────────
   MODAL WRAPPER
──────────────────────────────────────────────── */
function Modal({ title, onClose, children, footer }: {
  title: string; onClose: () => void;
  children: React.ReactNode; footer?: React.ReactNode;
}) {
  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-panel">
        <div className="modal-header">
          <span style={{ fontWeight: 700, fontSize: 15 }}>{title}</span>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────
   SIDEBAR
──────────────────────────────────────────────── */
type TabKey = 'dashboard' | 'processes' | 'bia' | 'risks' | 'engine' | 'simulation' | 'plans' | 'audit';

const NAV_ITEMS: { key: TabKey; label: string; icon: React.ElementType; frCode: string }[] = [
  { key: 'dashboard',   label: 'Dashboard',              icon: BarChart3,    frCode: 'FR-11' },
  { key: 'processes',   label: 'Jarayonlar & Aktivlar',  icon: Layers,       frCode: 'FR-03,04' },
  { key: 'bia',         label: 'BIA Baholash',           icon: Clock,        frCode: 'FR-05' },
  { key: 'risks',       label: 'Xavf Reestri',           icon: AlertTriangle,frCode: 'FR-06' },
  { key: 'engine',      label: 'Hisoblash Yadrosi',      icon: Cpu,          frCode: 'FR-07,08' },
  { key: 'simulation',  label: 'Ssenariy Simulyatsiyasi',icon: PlayCircle,   frCode: 'FR-10' },
  { key: 'plans',       label: 'BCP/DRP Rejalari',       icon: FileText,     frCode: 'FR-09' },
  { key: 'audit',       label: 'Audit Jurnali',          icon: CheckCircle2, frCode: 'FR-12' },
];

function Sidebar({ activeTab, setActiveTab, dashboard }: {
  activeTab: TabKey;
  setActiveTab: (t: TabKey) => void;
  dashboard: DashboardSummary | null;
}) {
  return (
    <aside className="app-sidebar">
      {/* Brand Section */}
      <div style={{ padding: '8px 4px 20px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div className="brand-logo">
          <Shield size={18} color="white" />
        </div>
        <div>
          <div style={{ fontWeight: 800, fontSize: 13, color: 'white', letterSpacing: '-0.02em' }}>BCMS Designer</div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.04em' }}>ISO 22301 Platform</div>
        </div>
      </div>

      <div className="nav-section-label">Asosiy Modullar</div>

      {NAV_ITEMS.map(item => {
        const Icon = item.icon;
        const hasAlert = (
          (item.key === 'risks' && dashboard && dashboard.high_risks_count > 0) ||
          (item.key === 'bia'   && dashboard && dashboard.rpo_gap_count > 0)
        );
        return (
          <button
            key={item.key}
            className={`nav-item ${activeTab === item.key ? 'active' : ''}`}
            onClick={() => setActiveTab(item.key)}
            title={item.frCode}
          >
            <Icon size={16} className="nav-icon" />
            <span style={{ flex: 1, fontSize: 13 }}>{item.label}</span>
            {hasAlert && (
              <span className="nav-badge">
                {item.key === 'risks' ? dashboard?.high_risks_count : dashboard?.rpo_gap_count}
              </span>
            )}
          </button>
        );
      })}

      {/* Bottom: ISO Badge */}
      <div style={{ marginTop: 'auto', padding: '16px 8px 8px' }}>
        <div style={{
          background: 'rgba(59,130,246,0.08)',
          border: '1px solid rgba(59,130,246,0.2)',
          borderRadius: 10,
          padding: '10px 12px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <BookOpen size={12} color="#60A5FA" />
            <span style={{ fontSize: 10, fontWeight: 700, color: '#60A5FA', letterSpacing: '0.06em' }}>STANDARTLAR ASOSI</span>
          </div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', lineHeight: 1.6 }}>
            ISO 22301:2019<br />
            ISO/TS 22317:2021<br />
            NIST SP 800-34<br />
            OWASP ASVS v5.0
          </div>
        </div>
      </div>
    </aside>
  );
}

/* ────────────────────────────────────────────────
   HEADER
──────────────────────────────────────────────── */
function Header({ currentUser, onSwitchUser, onRefresh, loading, theme, onThemeToggle }: {
  currentUser: any;
  onSwitchUser: (u: string) => void;
  onRefresh: () => void;
  loading: boolean;
  theme: string;
  onThemeToggle: () => void;
}) {
  return (
    <header className="app-header">
      {/* Left: Logo area (mirrored sidebar brand, hidden on desktop) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
        <div className="brand-logo" style={{ width: 32, height: 32, flexShrink: 0, display: 'none' }}>
          <Shield size={16} color="white" />
        </div>

        {/* Org Badge */}
        {currentUser?.organization_detail && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'var(--color-bg-card)',
            border: '1px solid var(--color-border)',
            borderRadius: 8, padding: '5px 12px',
            fontSize: 12, color: 'var(--color-text-secondary)',
          }}>
            <Building size={13} style={{ color: 'var(--color-accent-primary)', flexShrink: 0 }} />
            <span style={{ fontWeight: 600, color: 'var(--color-text-primary)', maxWidth: 240 }} className="truncate">
              {currentUser.organization_detail.name}
            </span>
            <ChevronRight size={11} />
            <span>{currentUser.organization_detail.sector}</span>
          </div>
        )}
      </div>

      {/* Right controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {/* Role Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--color-text-muted)' }}>
          <Users size={13} />
          <span style={{ fontWeight: 500 }}>Foydalanuvchi:</span>
          <select
            className="input-field"
            style={{ padding: '5px 28px 5px 10px', fontSize: 12, width: 'auto', minWidth: 190, borderRadius: 8 }}
            value={currentUser?.username || 'bcms_manager'}
            onChange={e => onSwitchUser(e.target.value)}
          >
            <option value="admin">Muhammadali Aliyev — ADMIN</option>
            <option value="bcms_manager">BCMS Menejeri — BCMS_MANAGER</option>
            <option value="director">Mamirjon Turdimatov — APPROVER</option>
          </select>
        </div>

        {currentUser && (
          <div style={{
            background: 'var(--color-accent-primary-light)',
            border: '1px solid rgba(59,130,246,0.25)',
            borderRadius: 8, padding: '5px 10px',
            fontSize: 11, fontWeight: 700,
            color: '#60A5FA', letterSpacing: '0.04em',
          }}>
            {currentUser.role}
          </div>
        )}

        {/* Refresh */}
        <button
          className="theme-toggle"
          onClick={onRefresh}
          title="Ma'lumotlarni yangilash"
          disabled={loading}
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} style={{ color: loading ? 'var(--color-accent-primary)' : undefined }} />
        </button>

        {/* Theme Toggle */}
        <button className="theme-toggle" onClick={onThemeToggle} title="Tema o'zgartirish">
          {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
        </button>
      </div>
    </header>
  );
}

/* ────────────────────────────────────────────────
   DASHBOARD TAB
──────────────────────────────────────────────── */
function DashboardTab({ dashboard, processes, bias, risks }: {
  dashboard: DashboardSummary | null;
  processes: BusinessProcess[];
  bias: BIAAssessment[];
  risks: Risk[];
}) {
  const d = dashboard;

  const metrics = [
    {
      label: 'JAMI JARAYONLAR',
      value: d?.total_processes ?? processes.length,
      sub: `${d?.critical_processes ?? 0} ta kritik jarayon`,
      icon: Layers,
      accent: '#3B82F6',
      accentBg: 'rgba(59,130,246,0.12)',
    },
    {
      label: 'YUQORI XAVFLAR',
      value: d?.high_risks_count ?? 0,
      sub: `Jami ${d?.total_risks ?? risks.length} ta xavfdan`,
      icon: AlertTriangle,
      accent: '#EF4444',
      accentBg: 'rgba(239,68,68,0.12)',
    },
    {
      label: "RPO BO'SHLIQLARI",
      value: d?.rpo_gap_count ?? 0,
      sub: 'Zaxiralash intervali > RPO',
      icon: TrendingDown,
      accent: '#F59E0B',
      accentBg: 'rgba(245,158,11,0.12)',
    },
    {
      label: "E'LON QILINGAN REJALAR",
      value: d?.published_plans_count ?? 0,
      sub: `${d?.unplanned_processes_count ?? 0} ta jarayonga reja kerak`,
      icon: FileText,
      accent: '#10B981',
      accentBg: 'rgba(16,185,129,0.12)',
    },
    {
      label: 'TASDIQLANGAN BIA',
      value: d?.approved_bias_count ?? 0,
      sub: `${d?.completed_exercises_count ?? 0} ta mashq o'tkazilgan`,
      icon: CheckCircle2,
      accent: '#06B6D4',
      accentBg: 'rgba(6,182,212,0.12)',
    },
    {
      label: 'JAMI AKTIVLAR',
      value: d?.total_assets ?? 0,
      sub: 'Server, Tizim, Xodim, Provayder',
      icon: Database,
      accent: '#8B5CF6',
      accentBg: 'rgba(139,92,246,0.12)',
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* RPO Gap Alert */}
      {d && d.rpo_gap_count > 0 && (
        <div className="alert alert-high">
          <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <div style={{ fontWeight: 700, marginBottom: 3 }}>Diqqat: Zaxiralash Oralig'i Buzilishi!</div>
            <div style={{ fontSize: 12, opacity: 0.85 }}>
              {d.rpo_gap_count} ta jarayonda zaxira nusxalash oralig'i ruxsat etilgan RPO chegarasidan katta.
              Nosozlik vaqtida ma'lumotlar yo'qolishi xavfi mavjud.
            </div>
          </div>
        </div>
      )}

      {/* Metrics Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        {metrics.map((m, i) => {
          const Icon = m.icon;
          return (
            <div key={i} className="metric-card" style={{ '--metric-accent': m.accent, '--metric-accent-bg': m.accentBg } as React.CSSProperties}>
              <div className="metric-icon">
                <Icon size={18} style={{ color: m.accent }} />
              </div>
              <div className="metric-label">{m.label}</div>
              <div className="metric-value" style={{ color: m.accent }}>{m.value}</div>
              <div className="metric-sub">{m.sub}</div>
            </div>
          );
        })}
      </div>

      {/* Processes Quick Table */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Kritik Biznes Jarayonlari</div>
            <div className="card-subtitle">FR-03 va FR-05 bo'yicha eng muhim jarayonlar va ularning BIA holati</div>
          </div>
          <a
            href="/api/v1/reports/organization/export_excel"
            target="_blank"
            rel="noreferrer"
            className="btn btn-secondary btn-sm"
          >
            <Download size={13} /> Tashkilot Excel Hisoboti
          </a>
        </div>
        {processes.length === 0 ? (
          <EmptyState icon={Layers} title="Jarayonlar mavjud emas" desc="Demo ma'lumotlarini yuklang" />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Jarayon Nomi</th>
                  <th>Kritiklik</th>
                  <th>Xizmat</th>
                  <th>BIA Holati</th>
                  <th>RTO (Maqsad)</th>
                </tr>
              </thead>
              <tbody>
                {processes.slice(0, 8).map(p => {
                  const bia = bias.find(b => b.process === p.id);
                  return (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 600 }}>{p.name}</td>
                      <td>{criticalityBadge(p.criticality)}</td>
                      <td style={{ color: 'var(--color-text-secondary)', fontSize: 12 }}>{p.service_name || '—'}</td>
                      <td>{bia ? statusBadge(bia.status) : <Badge type="neutral">BIA Yo'q</Badge>}</td>
                      <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: 'var(--color-info-text)' }}>
                        {bia ? `${bia.rto_hours}h / MTPD: ${bia.mtpd_hours}h` : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────
   PROCESSES & ASSETS TAB
──────────────────────────────────────────────── */
function ProcessesTab({ processes, assets, onNewProcess }: {
  processes: BusinessProcess[];
  assets: Asset[];
  onNewProcess: () => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Processes */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Biznes Jarayonlar Reestri</div>
            <div className="card-subtitle">FR-03: Jarayon nomi, egasi, kritikligi va holati</div>
          </div>
          <button className="btn btn-primary btn-sm" onClick={onNewProcess}>
            <PlusCircle size={14} /> Yangi Jarayon
          </button>
        </div>
        <div style={{ overflowX: 'auto' }}>
          {processes.length === 0 ? (
            <EmptyState icon={Layers} title="Jarayonlar mavjud emas" />
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Jarayon Nomi</th>
                  <th>Kritiklik</th>
                  <th>Xizmat</th>
                  <th>Mas'ul Egasi</th>
                  <th>Holati</th>
                </tr>
              </thead>
              <tbody>
                {processes.map(p => (
                  <tr key={p.id}>
                    <td style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--color-text-muted)' }}>#{p.id}</td>
                    <td style={{ fontWeight: 600 }}>{p.name}</td>
                    <td>{criticalityBadge(p.criticality)}</td>
                    <td style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{p.service_name || '—'}</td>
                    <td style={{ fontSize: 12 }}>{p.owner_name || 'BCMS Menejeri'}</td>
                    <td><Badge type="low">{p.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Assets */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Aktivlar va Resurslar (Assets)</div>
            <div className="card-subtitle">FR-04: Server, Tizim, Xodim, Provayder va Infratuzilma</div>
          </div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          {assets.length === 0 ? (
            <EmptyState icon={Database} title="Aktivlar mavjud emas" />
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Aktiv Nomi</th>
                  <th>Turi</th>
                  <th>Mas'ul Shaxs</th>
                </tr>
              </thead>
              <tbody>
                {assets.map(a => (
                  <tr key={a.id}>
                    <td style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--color-text-muted)' }}>#{a.id}</td>
                    <td style={{ fontWeight: 600 }}>{a.name}</td>
                    <td><Badge type="info">{a.type_display}</Badge></td>
                    <td style={{ fontSize: 12 }}>{a.owner_name || 'Tizim ma\'muri'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────
   BIA TAB
──────────────────────────────────────────────── */
function BIATab({ bias, currentUser, onApproveBIA }: {
  bias: BIAAssessment[];
  currentUser: any;
  onApproveBIA: (id: number) => void;
}) {
  const canApprove = currentUser?.role === 'ADMIN' || currentUser?.role === 'APPROVER';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Summary Cards */}
      {bias.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          <div className="metric-card" style={{ '--metric-accent': '#3B82F6', '--metric-accent-bg': 'rgba(59,130,246,0.12)' } as React.CSSProperties}>
            <div className="metric-icon"><Clock size={18} style={{ color: '#3B82F6' }} /></div>
            <div className="metric-label">JAMI BIA</div>
            <div className="metric-value" style={{ color: '#3B82F6' }}>{bias.length}</div>
            <div className="metric-sub">Baholash kartochkalari</div>
          </div>
          <div className="metric-card" style={{ '--metric-accent': '#10B981', '--metric-accent-bg': 'rgba(16,185,129,0.12)' } as React.CSSProperties}>
            <div className="metric-icon"><CheckCircle2 size={18} style={{ color: '#10B981' }} /></div>
            <div className="metric-label">TASDIQLANGAN</div>
            <div className="metric-value" style={{ color: '#10B981' }}>{bias.filter(b => b.status === 'APPROVED').length}</div>
            <div className="metric-sub">Rahbariyat tasdig'i bilan</div>
          </div>
          <div className="metric-card" style={{ '--metric-accent': '#F59E0B', '--metric-accent-bg': 'rgba(245,158,11,0.12)' } as React.CSSProperties}>
            <div className="metric-icon"><TrendingDown size={18} style={{ color: '#F59E0B' }} /></div>
            <div className="metric-label">RPO BO'SHLIQLARI</div>
            <div className="metric-value" style={{ color: '#F59E0B' }}>{bias.filter(b => b.has_rpo_gap).length}</div>
            <div className="metric-sub">Zaxira oralig&apos;i &gt; RPO</div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">BIA So'rovnomasi — Baholash Natijalari</div>
            <div className="card-subtitle">FR-05: MTPD, RTO, RPO oraliqlari va Rahbariyat tasdig'i (RTO ≤ MTPD qat'iy talabi)</div>
          </div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          {bias.length === 0 ? (
            <EmptyState icon={Clock} title="BIA baholashlari mavjud emas" />
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Jarayon</th>
                  <th>RTO (Maqsad)</th>
                  <th>MTPD (Chegara)</th>
                  <th>RPO</th>
                  <th>Zaxiralash Oralig'i</th>
                  <th>RPO Bo'shlig'i</th>
                  <th>Holati</th>
                  <th>Amal</th>
                </tr>
              </thead>
              <tbody>
                {bias.map(b => (
                  <tr key={b.id}>
                    <td style={{ fontWeight: 600 }}>{b.process_name}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--color-info-text)' }}>{b.rto_hours} soat</td>
                    <td style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--color-text-secondary)' }}>{b.mtpd_hours} soat</td>
                    <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{b.rpo_minutes} min</td>
                    <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{b.backup_interval_minutes} min</td>
                    <td>
                      {b.has_rpo_gap
                        ? <Badge type="critical">GAP MAVJUD</Badge>
                        : <Badge type="low">QONIQARLI</Badge>}
                    </td>
                    <td>{statusBadge(b.status)}</td>
                    <td>
                      {b.status !== 'APPROVED' && canApprove ? (
                        <button className="btn btn-success btn-sm" onClick={() => onApproveBIA(b.id)}>
                          <Check size={13} /> Tasdiqlash
                        </button>
                      ) : b.status === 'APPROVED' ? (
                        <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>✓ Tasdiqlangan</span>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────
   RISKS TAB
──────────────────────────────────────────────── */
function RisksTab({ risks }: { risks: Risk[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* 5×5 Matrix */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">5×5 Risk Matritsasi</div>
            <div className="card-subtitle">FR-06: ISO 22301 / NIST SP 800-34 • Ehtimollik (1–5) × Ta'sir (1–5) = Risk Balli (1–25)</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Badge type="low">Past ≤ 6</Badge>
            <Badge type="high">O'rta 7–14</Badge>
            <Badge type="critical">Yuqori ≥ 15</Badge>
          </div>
        </div>
        <div className="card-body">
          <div style={{ display: 'flex', gap: 8 }}>
            {/* Y-axis label */}
            <div style={{ display: 'flex', alignItems: 'center', writingMode: 'vertical-rl', transform: 'rotate(180deg)', fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginRight: 4 }}>
              Ta'sir Darajasi ↑
            </div>
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6, maxWidth: 360 }}>
                {[5, 4, 3, 2, 1].map(impactRow =>
                  [1, 2, 3, 4, 5].map(likeCol => {
                    const score = impactRow * likeCol;
                    const count = risks.filter(r => r.likelihood === likeCol && r.impact === impactRow).length;
                    const cls = score >= 15 ? 'risk-cell-high' : score >= 7 ? 'risk-cell-medium' : 'risk-cell-low';
                    return (
                      <div key={`${impactRow}-${likeCol}`} className={`risk-cell ${cls}`} title={`Ehtimollik: ${likeCol}, Ta'sir: ${impactRow}, Ball: ${score}`}>
                        <span style={{ fontSize: 13, fontWeight: 800 }}>{score}</span>
                        {count > 0 && <span style={{ fontSize: 10, marginTop: 1 }}>{count} xavf</span>}
                      </div>
                    );
                  })
                )}
              </div>
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 10, textAlign: 'center', letterSpacing: '0.04em' }}>
                ← Ehtimollik Darajasi (1–5) →
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Risk Table */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Xavf Reestri — To'liq Ro'yxat</div>
            <div className="card-subtitle">FR-06: Tahdid, aktiv, ehtimollik, ta'sir, qoldiq risk va nazorat choralari</div>
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
            <strong style={{ color: 'var(--color-text-primary)' }}>{risks.length}</strong> ta xavf qayd etilgan
          </div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          {risks.length === 0 ? (
            <EmptyState icon={AlertTriangle} title="Xavflar mavjud emas" />
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Tahdid Tavsifi</th>
                  <th>Jarayon</th>
                  <th style={{ textAlign: 'center' }}>Ehtimollik</th>
                  <th style={{ textAlign: 'center' }}>Ta'sir</th>
                  <th style={{ textAlign: 'center' }}>Risk Balli</th>
                  <th style={{ textAlign: 'center' }}>Qoldiq</th>
                  <th style={{ textAlign: 'center' }}>ΔR</th>
                  <th>Klass</th>
                </tr>
              </thead>
              <tbody>
                {risks.map(r => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 600, maxWidth: 220 }} className="truncate">{r.threat}</td>
                    <td style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{r.process_name}</td>
                    <td style={{ textAlign: 'center', fontFamily: 'monospace', fontWeight: 700 }}>{r.likelihood}</td>
                    <td style={{ textAlign: 'center', fontFamily: 'monospace', fontWeight: 700 }}>{r.impact}</td>
                    <td style={{ textAlign: 'center' }}>
                      <span style={{
                        fontFamily: 'monospace', fontSize: 14, fontWeight: 800,
                        color: r.risk_score >= 15 ? 'var(--color-critical-text)' : r.risk_score >= 7 ? 'var(--color-high-text)' : 'var(--color-low-text)'
                      }}>
                        {r.risk_score}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center', fontFamily: 'monospace', color: 'var(--color-low-text)', fontSize: 13 }}>
                      {r.residual_risk_score ?? '—'}
                    </td>
                    <td style={{ textAlign: 'center', fontFamily: 'monospace', color: 'var(--color-info-text)', fontSize: 13 }}>
                      {r.risk_reduction > 0 ? `+${r.risk_reduction}` : '—'}
                    </td>
                    <td>{riskBadge(r.risk_class)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────
   ENGINE TAB
──────────────────────────────────────────────── */
function EngineTab({ algoInput, setAlgoInput, algoOutput, onRunAlgo, priorityResults, onRunPriority, loading }: {
  algoInput: any; setAlgoInput: (v: any) => void;
  algoOutput: any; onRunAlgo: () => void;
  priorityResults: any; onRunPriority: () => void;
  loading: boolean;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Section 10.1 Tester */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Zap size={16} style={{ color: '#3B82F6' }} />
              Texnik Topshiriq 10.1 — Algoritm Sinovi
            </div>
            <div className="card-subtitle">FR-07: Risk Balli, RPO bo'shliq aniqlash va kuzatuv xulosalari</div>
          </div>
        </div>
        <div className="card-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginBottom: 18 }}>
            {[
              { key: 'likelihood', label: 'Likelihood (1–5)', type: 'int', min: 1, max: 5 },
              { key: 'impact',     label: 'Impact (1–5)',     type: 'int', min: 1, max: 5 },
              { key: 'rto_hours',  label: 'RTO (soat)',       type: 'float' },
              { key: 'rpo_minutes',label: 'RPO (daqiqa)',     type: 'int' },
              { key: 'backup_interval', label: 'Backup interval (daqiqa)', type: 'int' },
            ].map(f => (
              <div className="form-group" key={f.key}>
                <label className="form-label">{f.label}</label>
                <input
                  type="number"
                  className="input-field"
                  min={f.min}
                  max={f.max}
                  value={(algoInput as any)[f.key]}
                  onChange={e => {
                    const raw = e.target.value;
                    const val = f.type === 'float' ? parseFloat(raw) || 0 : parseInt(raw) || 0;
                    setAlgoInput({ ...algoInput, [f.key]: val });
                  }}
                />
              </div>
            ))}
          </div>
          <button className="btn btn-primary" onClick={onRunAlgo}>
            <Cpu size={15} /> Algoritmni Hisoblash
          </button>

          {algoOutput && (
            <div style={{ marginTop: 20 }}>
              {/* Human-readable result */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 14 }}>
                <div className="metric-card" style={{ '--metric-accent': algoOutput.risk_class === 'high' ? '#EF4444' : algoOutput.risk_class === 'medium' ? '#F59E0B' : '#10B981', '--metric-accent-bg': 'rgba(59,130,246,0.08)' } as React.CSSProperties}>
                  <div className="metric-label">RISK BALLI</div>
                  <div className="metric-value" style={{ color: algoOutput.risk_class === 'high' ? '#EF4444' : algoOutput.risk_class === 'medium' ? '#F59E0B' : '#10B981' }}>{algoOutput.risk_score}</div>
                  <div className="metric-sub">{algoOutput.risk_class?.toUpperCase()} darajasi</div>
                </div>
                <div className="metric-card" style={{ '--metric-accent': algoOutput.rpo_gap ? '#F59E0B' : '#10B981', '--metric-accent-bg': 'rgba(16,185,129,0.08)' } as React.CSSProperties}>
                  <div className="metric-label">RPO BO'SHLIQ</div>
                  <div className="metric-value" style={{ color: algoOutput.rpo_gap ? '#F59E0B' : '#10B981' }}>{algoOutput.rpo_gap ? 'MAVJUD' : 'YO\'Q'}</div>
                  <div className="metric-sub">{algoOutput.rpo_gap ? 'Zaxira oralig\'i katta!' : 'Qoniqarli holat'}</div>
                </div>
                <div className="metric-card" style={{ '--metric-accent': '#06B6D4', '--metric-accent-bg': 'rgba(6,182,212,0.08)' } as React.CSSProperties}>
                  <div className="metric-label">KUZATUVLAR</div>
                  <div className="metric-value" style={{ color: '#06B6D4' }}>{algoOutput.observations?.length ?? 0}</div>
                  <div className="metric-sub">Aniqlangan muammo</div>
                </div>
              </div>
              <div style={{ marginBottom: 6, fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>JSON natija</div>
              <div className="code-block">
                <pre>{JSON.stringify(algoOutput, null, 2)}</pre>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Priority Engine */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Target size={16} style={{ color: '#8B5CF6' }} />
              Ustuvorlik Indeksi Tahlili (Priority Score Engine)
            </div>
            <div className="card-subtitle">
              FR-07: Priority = 0.40×Impact + 0.25×Urgency + 0.20×Risk + 0.15×Dependency
            </div>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={onRunPriority} disabled={loading}>
            {loading ? <div className="spinner" style={{ width: 14, height: 14 }} /> : <RefreshCw size={13} />}
            Qayta Hisoblash
          </button>
        </div>
        <div className="card-body">
          {priorityResults?.ranked_processes ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {priorityResults.ranked_processes.map((p: any, idx: number) => {
                const score = Number(p.priority_score);
                const pct = Math.round(score * 100);
                const barColor = score >= 0.7 ? '#EF4444' : score >= 0.45 ? '#F59E0B' : '#10B981';
                return (
                  <div key={idx} className="rank-card">
                    <div className="rank-number" style={{
                      background: idx < 3 ? 'rgba(239,68,68,0.15)' : 'rgba(59,130,246,0.1)',
                      color: idx < 3 ? '#FCA5A5' : '#93C5FD',
                      border: `1px solid ${idx < 3 ? 'rgba(239,68,68,0.3)' : 'rgba(59,130,246,0.25)'}`,
                    }}>
                      {idx + 1}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }} className="truncate">
                        {p.process_name}
                      </div>
                      <div className="progress-bar-track">
                        <div className="progress-bar-fill" style={{ width: `${pct}%`, background: barColor }} />
                      </div>
                      <div style={{ display: 'flex', gap: 12, marginTop: 5, fontSize: 11, color: 'var(--color-text-muted)' }}>
                        <span>Impact: <strong style={{ color: 'var(--color-text-secondary)' }}>{p.operands.impact_norm}</strong></span>
                        <span>Urgency: <strong style={{ color: 'var(--color-text-secondary)' }}>{p.operands.urgency_norm}</strong></span>
                        <span>Risk: <strong style={{ color: 'var(--color-text-secondary)' }}>{p.operands.risk_norm}</strong></span>
                        <span>Dep: <strong style={{ color: 'var(--color-text-secondary)' }}>{p.operands.dependency_norm}</strong></span>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{
                        fontFamily: 'JetBrains Mono, monospace',
                        fontSize: 20,
                        fontWeight: 900,
                        color: barColor,
                      }}>
                        {score.toFixed(4)}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--color-text-muted)', marginTop: 1 }}>Priority Score</div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState icon={BarChart3} title="Tahlil boshlash uchun «Qayta Hisoblash» tugmasini bosing" />
          )}
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────
   SIMULATION TAB
──────────────────────────────────────────────── */
function SimulationTab({ scenarios, simOutput, onRunSimulation }: {
  scenarios: any[];
  simOutput: any;
  onRunSimulation: (id: number) => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div className="alert alert-info">
        <Info size={16} style={{ flexShrink: 0, marginTop: 1 }} />
        <div>
          <strong>FR-10: Zanjirsimon Ta'sir Simulyatsiyasi (Cascade Disruption)</strong>
          <div style={{ fontSize: 12, marginTop: 3, opacity: 0.85 }}>
            Nosoz aktivlarning butun tashkilot bo'ylab RTO/MTPD buzilishlarini modellashtirish (NetworkX graf tahlili).
          </div>
        </div>
      </div>

      {scenarios.length === 0 ? (
        <div className="card">
          <EmptyState icon={PlayCircle} title="Ssenariylari mavjud emas" desc="Demo ma'lumotlarni yuklang" />
        </div>
      ) : (
        scenarios.map(sc => (
          <div key={sc.id} className="card" style={{ borderColor: simOutput?.scenario_id === sc.id ? 'rgba(245,158,11,0.3)' : undefined }}>
            <div className="card-header">
              <div>
                <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <GitBranch size={16} style={{ color: '#F59E0B' }} />
                  {sc.title}
                </div>
                {sc.description && (
                  <div className="card-subtitle">{sc.description}</div>
                )}
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <Badge type="high">Taxminiy uzilish: {sc.estimated_outage_hours} soat</Badge>
                  {sc.disrupted_asset_ids?.length > 0 && (
                    <Badge type="critical">{sc.disrupted_asset_ids.length} ta nosoz aktiv</Badge>
                  )}
                </div>
              </div>
              <button className="btn btn-primary" onClick={() => onRunSimulation(sc.id)}>
                <PlayCircle size={15} /> Simulyatsiyani Boshlash
              </button>
            </div>

            {simOutput && simOutput.scenario_id === sc.id && (
              <div className="card-body" style={{ borderTop: '1px solid var(--color-border)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 20 }}>
                  {[
                    { label: "Ta'sirlangan Jarayonlar", value: simOutput.affected_processes_count, color: '#EF4444' },
                    { label: 'RTO Buzilishlari',         value: simOutput.rto_breaches_count,       color: '#F59E0B' },
                    { label: "Rejasi Yo'q Jarayonlar",   value: simOutput.missing_plans_count,      color: '#06B6D4' },
                  ].map((m, i) => (
                    <div key={i} className="metric-card" style={{ '--metric-accent': m.color, '--metric-accent-bg': `${m.color}18` } as React.CSSProperties}>
                      <div className="metric-label">{m.label}</div>
                      <div className="metric-value" style={{ color: m.color }}>{m.value}</div>
                    </div>
                  ))}
                </div>
                {simOutput.affected_processes.length > 0 && (
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Ta'sirlangan Jarayon</th>
                        <th>Xizmat</th>
                        <th>RTO Maqsad</th>
                        <th>RTO Buzilishi</th>
                        <th>BCP Mavjudligi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {simOutput.affected_processes.map((proc: any) => (
                        <tr key={proc.process_id}>
                          <td style={{ fontWeight: 600 }}>{proc.process_name}</td>
                          <td style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{proc.service_name}</td>
                          <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{proc.target_rto_hours} soat</td>
                          <td>
                            {proc.rto_breached
                              ? <Badge type="critical">BUZILDI ({simOutput.estimated_outage_hours}h &gt; {proc.target_rto_hours}h)</Badge>
                              : <Badge type="low">XAVFSIZ</Badge>}
                          </td>
                          <td>
                            {proc.has_published_plan
                              ? <Badge type="low">BCP MAVJUD</Badge>
                              : <Badge type="critical">REJA YO'Q</Badge>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────
   PLANS TAB
──────────────────────────────────────────────── */
function PlansTab({ plans, currentUser, onPublishPlan }: {
  plans: ContinuityPlan[];
  currentUser: any;
  onPublishPlan: (id: number) => void;
}) {
  const canPublish = currentUser?.role === 'ADMIN' || currentUser?.role === 'APPROVER';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {plans.length === 0 ? (
        <div className="card">
          <EmptyState icon={FileText} title="BCP/DRP rejalari mavjud emas" />
        </div>
      ) : (
        plans.map(pl => (
          <div key={pl.id} className="card">
            <div className="card-header">
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 700, fontSize: 15 }} className="truncate">{pl.title}</span>
                  <Badge type="info">v{pl.version}</Badge>
                  {statusBadge(pl.status)}
                </div>
                <div className="card-subtitle" style={{ marginTop: 4 }}>
                  Jarayon: <strong>{pl.process_name}</strong>
                  {pl.approved_by_name && <> &nbsp;•&nbsp; Tasdiqlovchi: <strong>{pl.approved_by_name}</strong></>}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                {pl.status !== 'PUBLISHED' && canPublish && (
                  <button className="btn btn-success btn-sm" onClick={() => onPublishPlan(pl.id)}>
                    <Check size={13} /> Rasmiy E'lon
                  </button>
                )}
                <a
                  href={`/api/v1/plans/${pl.id}/export_pdf/`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-secondary btn-sm"
                >
                  <Download size={13} /> PDF Eksport
                </a>
                <a
                  href={`/api/v1/plans/${pl.id}/export_excel/`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-secondary btn-sm"
                >
                  <Download size={13} /> Excel Eksport
                </a>
              </div>
            </div>

            {pl.steps && pl.steps.length > 0 && (
              <div className="card-body" style={{ borderTop: '1px solid var(--color-border)' }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: 10 }}>
                  Tiklash Bosqichlari ({pl.steps.length} ta qadam)
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {pl.steps.map(st => (
                    <div key={st.id} className="step-item">
                      <div className="step-number">{st.sequence}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{st.title}</div>
                        <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>
                          Mas'ul: {st.assigned_name || 'Belgilanmagan'} &nbsp;•&nbsp;
                          <Clock size={10} style={{ display: 'inline', marginRight: 3, verticalAlign: 'middle' }} />
                          {st.expected_duration_minutes} daqiqa
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────
   AUDIT LOG TAB
──────────────────────────────────────────────── */
function AuditTab({ auditLogs }: { auditLogs: AuditLog[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div className="alert alert-info">
        <Info size={16} style={{ flexShrink: 0 }} />
        <div>
          <strong>FR-12: Immutable Audit Ledger</strong>
          <div style={{ fontSize: 12, marginTop: 3, opacity: 0.85 }}>
            Kim, qachon va qaysi obyektni o'zgartirganini qayd qiluvchi o'zgarmas jurnal.
            Barcha yozuvlar PostgreSQL/SQLite darajasida himoyalangan (o'chirish va tahrirlash taqiqlangan).
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Audit Harakatlar Jurnali</div>
            <div className="card-subtitle">
              <strong style={{ color: 'var(--color-text-primary)' }}>{auditLogs.length}</strong> ta yozuv
            </div>
          </div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          {auditLogs.length === 0 ? (
            <EmptyState icon={CheckCircle2} title="Audit yozuvlari mavjud emas" />
          ) : (
            <table className="data-table" style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>
              <thead>
                <tr>
                  <th>Vaqt</th>
                  <th>Foydalanuvchi</th>
                  <th>Rol</th>
                  <th>Amal</th>
                  <th>Obyekt</th>
                  <th>ID</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map(log => (
                  <tr key={log.id}>
                    <td style={{ color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>
                      {log.timestamp.replace('T', ' ').substring(0, 19)}
                    </td>
                    <td style={{ fontWeight: 700, color: '#60A5FA' }}>{log.actor_username || 'Tizim'}</td>
                    <td><Badge type="medium">{log.actor_role || '—'}</Badge></td>
                    <td>{actionBadge(log.action)}</td>
                    <td style={{ color: 'var(--color-text-secondary)' }}>{log.entity}</td>
                    <td style={{ color: 'var(--color-text-muted)' }}>#{log.entity_id}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────
   PAGE HEADER
──────────────────────────────────────────────── */
const PAGE_META: Record<TabKey, { title: string; desc: string; icon: React.ElementType }> = {
  dashboard:  { title: 'Tashkilot Uzluksizligi Holati', desc: 'FR-11: Asosiy KPI ko\'rsatkichlar, kritik jarayonlar va RPO bo\'shliqlari konsolidatsiyasi', icon: BarChart3 },
  processes:  { title: 'Biznes Jarayonlar & Aktivlar', desc: 'FR-03, FR-04: Jarayonlar reestri, aktivlar va bog\'liqliklar grafigi', icon: Layers },
  bia:        { title: 'Biznesga Ta\'sir Tahlili (BIA)', desc: 'FR-05: MTPD, RTO, RPO parametrlari va Rahbariyat tasdig\'i (RTO ≤ MTPD)', icon: Clock },
  risks:      { title: 'Xavf Reestri & 5×5 Matritsa', desc: 'FR-06: Likelihood × Impact = RiskScore (1..25), qoldiq risk va nazorat choralari', icon: AlertTriangle },
  engine:     { title: 'Hisoblash Yadrosi & Algoritmlar', desc: 'FR-07, FR-08: Ustuvorlik formulasi, 10.1 Algoritm va Strategiyalar baholash', icon: Cpu },
  simulation: { title: 'Ssenariy Simulyatsiyasi', desc: 'FR-10: Nosoz aktivlar zanjirsimon ta\'siri, RTO/MTPD buzilishlari (NetworkX)', icon: PlayCircle },
  plans:      { title: 'BCP / DRP Uzluksizlik Rejalari', desc: 'FR-09: Versiyalangan rejalar, tiklash bosqichlari, tasdiqlash va PDF eksport', icon: FileText },
  audit:      { title: 'Audit Jurnali (Immutable Ledger)', desc: 'FR-12: Kim/qachon/nima — o\'zgarmas tarixiy yozuvlar', icon: CheckCircle2 },
};

/* ────────────────────────────────────────────────
   MAIN APP
──────────────────────────────────────────────── */
export function App() {
  const { theme, toggle: toggleTheme } = useTheme();

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('dashboard');
  const [loading, setLoading] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastIdRef = useRef(0);

  // Data
  const [dashboard, setDashboard]   = useState<DashboardSummary | null>(null);
  const [processes, setProcesses]   = useState<BusinessProcess[]>([]);
  const [assets, setAssets]         = useState<Asset[]>([]);
  const [bias, setBias]             = useState<BIAAssessment[]>([]);
  const [risks, setRisks]           = useState<Risk[]>([]);
  const [plans, setPlans]           = useState<ContinuityPlan[]>([]);
  const [scenarios, setScenarios]   = useState<any[]>([]);
  const [auditLogs, setAuditLogs]   = useState<AuditLog[]>([]);

  // Engine
  const [algoInput, setAlgoInput]         = useState({ likelihood: 4, impact: 5, rto_hours: 4, rpo_minutes: 60, backup_interval: 360 });
  const [algoOutput, setAlgoOutput]       = useState<any>(null);
  const [priorityResults, setPriorityResults] = useState<any>(null);
  const [simOutput, setSimOutput]         = useState<any>(null);

  // Modal
  const [showNewProcessModal, setShowNewProcessModal] = useState(false);
  const [newProcName, setNewProcName]   = useState('');
  const [newProcCrit, setNewProcCrit]   = useState<'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'>('HIGH');

  /* Toast helper */
  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    const id = ++toastIdRef.current;
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4500);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  /* Auth init */
  useEffect(() => {
    (async () => {
      try {
        const user = await api.getMe();
        setCurrentUser(user);
      } catch {
        try {
          const res = await api.login({ username: 'bcms_manager', password: 'Admin123!' });
          setCurrentUser(res.user);
        } catch { /* wait */ }
      }
    })();
  }, []);

  /* Load data */
  const loadData = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const [dRes, pRes, aRes, bRes, rRes, plRes, scRes, audRes] = await Promise.all([
        api.getDashboard().catch(() => ({ summary: null })),
        api.getProcesses().catch(() => ({ results: [] })),
        api.getAssets().catch(() => ({ results: [] })),
        api.getBIA().catch(() => ({ results: [] })),
        api.getRisks().catch(() => ({ results: [] })),
        api.getPlans().catch(() => ({ results: [] })),
        api.getScenarios().catch(() => ({ results: [] })),
        api.getAuditLogs().catch(() => ({ results: [] })),
      ]);
      setDashboard((dRes as any).summary);
      setProcesses((pRes as any).results || []);
      setAssets((aRes as any).results || []);
      setBias((bRes as any).results || []);
      setRisks((rRes as any).results || []);
      setPlans((plRes as any).results || []);
      setScenarios((scRes as any).results || []);
      setAuditLogs((audRes as any).results || []);
    } catch {
      showToast("Ma'lumotlarni yuklashda xatolik yuz berdi.", 'error');
    } finally {
      setLoading(false);
    }
  }, [currentUser, showToast]);

  useEffect(() => { if (currentUser) loadData(); }, [currentUser]);

  /* Actions */
  const handleSwitchUser = async (username: string) => {
    setLoading(true);
    try {
      await api.logout().catch(() => {});
      const res = await api.login({ username, password: 'Admin123!' });
      setCurrentUser(res.user);
      showToast(`Foydalanuvchi: ${res.user.username} (${res.user.role_display})`);
    } catch {
      showToast("Foydalanuvchini almashtirishda xatolik", 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProcess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProcName.trim()) return;
    try {
      await api.createProcess({ name: newProcName, criticality: newProcCrit, service: 1 });
      showToast("Yangi biznes jarayon muvaffaqiyatli kiritildi!");
      setShowNewProcessModal(false);
      setNewProcName('');
      loadData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleApproveBIA = async (id: number) => {
    try {
      await api.approveBIA(id);
      showToast("BIA baholashi tasdiqlandi!");
      loadData();
    } catch (err: any) { showToast(err.message, 'error'); }
  };

  const handlePublishPlan = async (id: number) => {
    try {
      await api.publishPlan(id);
      showToast("Reja rasmiy versiyada e'lon qilindi!");
      loadData();
    } catch (err: any) { showToast(err.message, 'error'); }
  };

  const handleRunAlgo = async () => {
    try {
      const res = await api.evaluateRiskAlgo({
        process_id: 1,
        likelihood: algoInput.likelihood,
        impact: algoInput.impact,
        rto_hours: algoInput.rto_hours,
        rpo_minutes: algoInput.rpo_minutes,
        backup_interval_minutes: algoInput.backup_interval,
      });
      setAlgoOutput(res);
      showToast("Algoritm hisoblash natijasi olindi!");
    } catch (err: any) { showToast(err.message, 'error'); }
  };

  const handleRunPriority = async () => {
    setLoading(true);
    try {
      const res = await api.getPriorityAnalysis();
      setPriorityResults(res);
      showToast("Ustuvorlik tahlili qayta hisoblandi!");
    } catch (err: any) { showToast(err.message, 'error'); }
    finally { setLoading(false); }
  };

  const handleRunSimulation = async (scenarioId: number) => {
    setLoading(true);
    try {
      const res = await api.runSimulation(scenarioId);
      setSimOutput(res);
      showToast("Zanjirsimon simulyatsiya o'tkazildi!");
    } catch (err: any) { showToast(err.message, 'error'); }
    finally { setLoading(false); }
  };

  /* Page meta */
  const meta = PAGE_META[activeTab];

  return (
    <div className="app-shell">
      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Header */}
      <Header
        currentUser={currentUser}
        onSwitchUser={handleSwitchUser}
        onRefresh={loadData}
        loading={loading}
        theme={theme}
        onThemeToggle={toggleTheme}
      />

      {/* Sidebar */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} dashboard={dashboard} />

      {/* Main Content */}
      <main className="app-main">
        <div className="page-content">
          {/* Loading bar */}
          {loading && (
            <div style={{
              position: 'fixed', top: 60, left: 0, right: 0, height: 2, zIndex: 80,
              background: 'linear-gradient(90deg, #2563EB, #0EA5E9, #2563EB)',
              backgroundSize: '200% 100%',
              animation: 'loadingBar 1.2s linear infinite',
            }} />
          )}

          {/* Page Header */}
          <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: 'var(--color-accent-primary-light)',
                border: '1px solid rgba(59,130,246,0.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, marginTop: 2,
              }}>
                <meta.icon size={20} style={{ color: '#60A5FA' }} />
              </div>
              <div>
                <h1 className="page-title">{meta.title}</h1>
                <p className="page-desc">{meta.desc}</p>
              </div>
            </div>
          </div>

          {/* Tab Content */}
          {activeTab === 'dashboard' && (
            <DashboardTab dashboard={dashboard} processes={processes} bias={bias} risks={risks} />
          )}
          {activeTab === 'processes' && (
            <ProcessesTab processes={processes} assets={assets} onNewProcess={() => setShowNewProcessModal(true)} />
          )}
          {activeTab === 'bia' && (
            <BIATab bias={bias} currentUser={currentUser} onApproveBIA={handleApproveBIA} />
          )}
          {activeTab === 'risks' && (
            <RisksTab risks={risks} />
          )}
          {activeTab === 'engine' && (
            <EngineTab
              algoInput={algoInput} setAlgoInput={setAlgoInput}
              algoOutput={algoOutput} onRunAlgo={handleRunAlgo}
              priorityResults={priorityResults} onRunPriority={handleRunPriority}
              loading={loading}
            />
          )}
          {activeTab === 'simulation' && (
            <SimulationTab scenarios={scenarios} simOutput={simOutput} onRunSimulation={handleRunSimulation} />
          )}
          {activeTab === 'plans' && (
            <PlansTab plans={plans} currentUser={currentUser} onPublishPlan={handlePublishPlan} />
          )}
          {activeTab === 'audit' && (
            <AuditTab auditLogs={auditLogs} />
          )}
        </div>
      </main>

      {/* Modal: New Process */}
      {showNewProcessModal && (
        <Modal
          title="Yangi Biznes Jarayon Kiritish"
          onClose={() => setShowNewProcessModal(false)}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setShowNewProcessModal(false)}>Bekor qilish</button>
              <button className="btn btn-primary" form="new-process-form" type="submit">Saqlash</button>
            </>
          }
        >
          <form id="new-process-form" onSubmit={handleCreateProcess} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="form-group">
              <label className="form-label required">Jarayon Nomi</label>
              <input
                type="text"
                required
                placeholder="masalan: Imtihon qabul qilish jarayoni"
                value={newProcName}
                onChange={e => setNewProcName(e.target.value)}
                className="input-field"
                autoFocus
              />
            </div>
            <div className="form-group">
              <label className="form-label required">Kritiklik Darajasi</label>
              <select
                value={newProcCrit}
                onChange={(e: any) => setNewProcCrit(e.target.value)}
                className="input-field"
              >
                <option value="CRITICAL">Kritik (Juda yuqori) — Uzilish 1 soatdan ko'p bo'lmasin</option>
                <option value="HIGH">Yuqori — RTO 4–8 soat</option>
                <option value="MEDIUM">O'rta — RTO 24 soatgacha</option>
                <option value="LOW">Past — Uzilish maqbul</option>
              </select>
            </div>
          </form>
        </Modal>
      )}

      {/* Loading bar animation style */}
      <style>{`
        @keyframes loadingBar {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .animate-spin { animation: spin 0.8s linear infinite; }
      `}</style>
    </div>
  );
}
