import { useEffect, useRef, useState } from 'react';
import { UzHiIcon } from "../components/icons/UzHiIcons";
import { api } from '../api/client';
import { createDashboardReport, downloadDashboardReport } from './dashboard';
import type { DashboardReportFormat } from './dashboard';
import './dashboard-report.css';

export function DashboardReportExport({ available, query = '', onNotify }: {
  available: boolean;
  query?: string;
  onNotify: (message: string, type: 'success' | 'error') => void;
}) {
  const [exporting, setExporting] = useState<DashboardReportFormat | null>(null);
  const active = useRef(true);
  useEffect(() => {
    active.current = true;
    return () => { active.current = false; };
  }, []);

  const download = async (format: DashboardReportFormat) => {
    if (!available || exporting) return;
    setExporting(format);
    try {
      // Refresh through the authenticated API instead of exporting fallback zeros.
      const endpoint = '/reports/organization' + (query ? '?' + query : '');
      const data = await api.get(endpoint);
      if (!active.current) return;
      const report = createDashboardReport({
        data,
        dashboardUrl: new URL(window.location.pathname, window.location.origin).href,
        sourceUrl: new URL('/api/v1' + endpoint, window.location.origin).href,
      });
      downloadDashboardReport(report, format);
      onNotify('Hisobot yuklab olishga tayyorlandi.', 'success');
    } catch (error) {
      if (active.current) onNotify(error instanceof Error ? error.message : 'Hisobotni yuklab olishda xatolik yuz berdi.', 'error');
    } finally {
      if (active.current) setExporting(null);
    }
  };

  return (
    <section className="panel dashboard-report" aria-labelledby="dashboard-report-title" aria-busy={exporting !== null}>
      <div>
        <h2 id="dashboard-report-title" className="dashboard-report-title">
          <UzHiIcon name="reports" size={17} /> Dashboard hisoboti
        </h2>
        <p id="dashboard-report-description" className="muted">
          {available
            ? "Tanlangan filtrlar, ko'rsatkichlar, manba va vaqt bilan hisobot."
            : "Hisobot olish uchun dashboard ma'lumotlari yuklanishi kerak."}
        </p>
      </div>
      <div className="dashboard-report-actions" role="group" aria-label="Hisobot formatlari">
        <button
          type="button"
          className="btn btn-primary"
          disabled={!available || exporting !== null}
          aria-describedby="dashboard-report-description"
          onClick={() => download('markdown')}
        >
          <UzHiIcon name="download" size={14} />
          {exporting === 'markdown' ? 'Tayyorlanmoqda...' : 'Markdown (.md)'}
        </button>
        <button
          type="button"
          className="btn"
          disabled={!available || exporting !== null}
          aria-describedby="dashboard-report-description"
          onClick={() => download('json')}
        >
          <UzHiIcon name="download" size={14} />
          {exporting === 'json' ? 'Tayyorlanmoqda...' : 'JSON (.json)'}
        </button>
      </div>
    </section>
  );
}
