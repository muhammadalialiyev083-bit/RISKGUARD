import { useState } from 'react';
import { Download, FileText } from 'lucide-react';
import { api } from '../api/client';
import { createDashboardReport, downloadDashboardReport } from './dashboard';
import type { DashboardReportFormat } from './dashboard';

export function DashboardReportExport({ available, onNotify }: {
  available: boolean;
  onNotify: (message: string, type: 'success' | 'error') => void;
}) {
  const [exporting, setExporting] = useState<DashboardReportFormat | null>(null);

  const download = async (format: DashboardReportFormat) => {
    if (!available || exporting) return;
    setExporting(format);
    try {
      // Refresh through the authenticated API instead of exporting fallback zeros.
      const data = await api.getDashboard();
      const report = createDashboardReport({
        data,
        dashboardUrl: new URL(window.location.pathname, window.location.origin).href,
        sourceUrl: new URL('/api/v1/reports/organization', window.location.origin).href,
      });
      downloadDashboardReport(report, format);
      onNotify('Hisobot yuklab olishga tayyorlandi.', 'success');
    } catch (error) {
      onNotify(error instanceof Error ? error.message : 'Hisobotni yuklab olishda xatolik yuz berdi.', 'error');
    } finally {
      setExporting(null);
    }
  };

  return (
    <section className="card dashboard-report" aria-labelledby="dashboard-report-title" aria-busy={exporting !== null}>
      <div>
        <div id="dashboard-report-title" className="card-title dashboard-report-title">
          <FileText size={17} aria-hidden="true" /> Dashboard hisoboti
        </div>
        <p id="dashboard-report-description" className="card-subtitle">
          {available
            ? "Joriy ko'rsatkichlar, manba va ma'lumot olingan vaqt bilan hisobot."
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
          <Download size={14} aria-hidden="true" />
          {exporting === 'markdown' ? 'Tayyorlanmoqda...' : 'Markdown (.md)'}
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          disabled={!available || exporting !== null}
          aria-describedby="dashboard-report-description"
          onClick={() => download('json')}
        >
          <Download size={14} aria-hidden="true" />
          {exporting === 'json' ? 'Tayyorlanmoqda...' : 'JSON (.json)'}
        </button>
      </div>
    </section>
  );
}
