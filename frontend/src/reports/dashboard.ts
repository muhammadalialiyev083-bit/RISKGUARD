import type { DashboardSummary } from '../types';

const METRICS: { key: keyof DashboardSummary; label: string; unit: string }[] = [
  { key: 'total_processes', label: 'Jami jarayonlar', unit: 'jarayon' },
  { key: 'critical_processes', label: 'Kritik jarayonlar', unit: 'jarayon' },
  { key: 'total_assets', label: 'Jami aktivlar', unit: 'aktiv' },
  { key: 'total_risks', label: 'Jami xavflar', unit: 'xavf' },
  { key: 'high_risks_count', label: 'Yuqori xavflar', unit: 'xavf' },
  { key: 'unplanned_processes_count', label: 'Amaldagi rejasi yo‘q jarayonlar', unit: 'jarayon' },
  { key: 'rpo_gap_count', label: "RPO bo'shliqlari", unit: 'baholash' },
  { key: 'approved_bias_count', label: 'Tasdiqlangan BIA', unit: 'baholash' },
  { key: 'published_plans_count', label: "E'lon qilingan rejalar", unit: 'reja' },
  { key: 'ready_plans_count', label: 'Amaldagi rejaga ega jarayonlar', unit: 'jarayon' },
  { key: 'verified_plans_count', label: 'Mashqda tekshirilgan rejaga ega jarayonlar', unit: 'jarayon' },
  { key: 'plans_needing_review_count', label: 'Qayta ko‘rib chiqish kerak bo‘lgan rejalar', unit: 'reja' },
  { key: 'completed_exercises_count', label: "O'tkazilgan mashqlar", unit: 'mashq' },
];

export type DashboardReportFormat = 'json' | 'markdown';

export interface DashboardReport {
  workflow: 'firecrawl-dashboard-reporting';
  collectionMethod: 'authenticated-dashboard-api';
  organization: string;
  reportedAt: string;
  dateRange: { type: 'snapshot'; at: string; processCreatedFrom: string | null; processCreatedTo: string | null };
  filters: { from: string | null; to: string | null; service: string | null };
  dashboards: { name: string; url: string; sourceUrl: string }[];
  metrics: {
    key: keyof DashboardSummary;
    label: string;
    value: number | null;
    unit: string;
    change: null;
    period: string;
    sourceUrl: string;
  }[];
  tables: {
    title: string;
    sourceUrl: string;
    columns: string[];
    rows: (string | number | null)[][];
  }[];
  exports: { format: DashboardReportFormat; filename: string; contentType: string }[];
  summary: string[];
  notes: string[];
}

function reportUrl(value: string, preserveFilters = false): string {
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw new Error("Hisobot manbasi manzili noto'g'ri.");
  }
  const filters = new URLSearchParams();
  if (preserveFilters) {
    for (const key of ['from', 'to', 'service']) {
      const filter = url.searchParams.get(key);
      if (filter && (key === 'service' ? /^\d+$/.test(filter) : /^\d{4}-\d{2}-\d{2}$/.test(filter))) {
        filters.set(key, filter);
      }
    }
  }
  // Preserve only report filters; session parameters and fragments are excluded.
  url.search = '';
  if (preserveFilters) url.search = filters.toString();
  url.hash = '';
  return url.href;
}

export function createDashboardReport({ data, dashboardUrl, sourceUrl, reportedAt = new Date() }: {
  data: unknown;
  dashboardUrl: string;
  sourceUrl: string;
  reportedAt?: Date;
}): DashboardReport {
  const payload = data as { organization?: unknown; summary?: unknown } | null;
  if (!payload || !payload.summary || typeof payload.summary !== 'object' || Array.isArray(payload.summary)) {
    throw new Error("Dashboard ma'lumotlari olinmadi. Hisobot yaratilmadi.");
  }

  const source = reportUrl(sourceUrl, true);
  const params = new URL(source).searchParams;
  const filters = { from: params.get('from'), to: params.get('to'), service: params.get('service') };
  const period = filters.from || filters.to
    ? `Jarayon yaratilgan davr: ${filters.from || 'boshlanishdan'} — ${filters.to || 'hozirgacha'}`
    : 'Joriy holat';
  const timestamp = reportedAt.toISOString();
  const values = payload.summary as Record<string, unknown>;
  const metrics = METRICS.map(metric => {
    const value = values[metric.key];
    return {
      ...metric,
      value: typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null,
      change: null,
      period: metric.key === 'total_assets' ? 'Tashkilotning joriy holati' : period,
      sourceUrl: source,
    };
  });
  if (metrics.every(metric => metric.value === null)) {
    throw new Error("Dashboard ko'rsatkichlari olinmadi. Hisobot yaratilmadi.");
  }

  const notes = [
    "Hisobot joriy holatni aks ettiradi. Sana filtri jarayon yaratilgan sanaga qo'llanadi; bu tarixiy davr bo'yicha trend hisoboti emas.",
    "Oldingi davr ma'lumotlari mavjud emas, shu sababli o'zgarish va trend hisoblanmagan.",
    "Qiymatlar tashkilotning dashboard API javobidan olingan. Jarayonlar ro'yxatining sahifalangan qismidan hisoblanmagan.",
    "Jami aktivlar tashkilot bo'yicha hisoblanadi; qolgan KPI qiymatlari tanlangan jarayonlar bo'yicha olinadi.",
  ];
  const unavailable = metrics.filter(metric => metric.value === null);
  if (unavailable.length) {
    notes.push(`Quyidagi ko'rsatkichlar olinmadi (nol deb hisoblanmagan): ${unavailable.map(metric => metric.label).join(', ')}.`);
  }
  const organization = typeof payload.organization === 'string' && payload.organization.trim()
    ? payload.organization.trim()
    : 'Tashkilot nomi mavjud emas';
  if (organization === 'Tashkilot nomi mavjud emas') notes.push('Server tashkilot nomini qaytarmadi.');

  const summary = [`${metrics.length - unavailable.length} ta dashboard ko'rsatkichi olindi.`];
  for (const key of ['high_risks_count', 'rpo_gap_count', 'unplanned_processes_count'] as const) {
    const metric = metrics.find(item => item.key === key)!;
    if (metric.value !== null) summary.push(`${metric.label}: ${metric.value} ta.`);
  }

  return {
    workflow: 'firecrawl-dashboard-reporting',
    collectionMethod: 'authenticated-dashboard-api',
    organization,
    reportedAt: timestamp,
    dateRange: { type: 'snapshot', at: timestamp, processCreatedFrom: filters.from, processCreatedTo: filters.to },
    filters,
    dashboards: [{ name: 'UzHi Dashboard', url: reportUrl(dashboardUrl), sourceUrl: source }],
    metrics,
    tables: [{
      title: "Dashboard ko'rsatkichlari",
      sourceUrl: source,
      columns: ["Ko'rsatkich", 'Qiymat', 'Birlik', 'Davr'],
      rows: metrics.map(metric => [metric.label, metric.value, metric.unit, metric.period]),
    }],
    exports: [],
    summary,
    notes,
  };
}

function markdownCell(value: string | number | null): string {
  return String(value ?? 'Mavjud emas')
    .replace(/[\r\n]+/g, ' ')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/([\\`*_{}\[\]()#+|])/g, '\\$1');
}

function toMarkdown(report: DashboardReport): string {
  const dashboard = report.dashboards[0];
  const table = report.tables[0];
  return [
    '# Dashboard hisoboti',
    '',
    `Tashkilot: ${markdownCell(report.organization)}`,
    `Ma'lumot olingan vaqt (UTC): ${report.reportedAt}`,
    `Jarayon yaratilgan davr: ${report.filters.from || 'boshlanishdan'} — ${report.filters.to || 'hozirgacha'}`,
    `Xizmat ID: ${report.filters.service || 'barcha xizmatlar'}`,
    `Dashboard: <${dashboard.url}>`,
    `Manba: <${dashboard.sourceUrl}>`,
    '',
    '## Qisqa xulosa',
    '',
    ...report.summary.map(line => `- ${markdownCell(line)}`),
    '',
    "## Dashboard ko'rsatkichlari",
    '',
    `| ${table.columns.map(markdownCell).join(' | ')} |`,
    `| ${table.columns.map(() => '---').join(' | ')} |`,
    ...table.rows.map(row => `| ${row.map(markdownCell).join(' | ')} |`),
    '',
    '## Jadvallar va eksport',
    '',
    ...report.exports.map(item => `- ${markdownCell(item.filename)} (${item.format}); ${table.rows.length} ta KPI.`),
    '',
    '## Izohlar va cheklovlar',
    '',
    ...report.notes.map(note => `- ${markdownCell(note)}`),
    '',
    '## Qayta olish parametrlari',
    '',
    '```text',
    `workflow: ${report.workflow}`,
    `dashboards: ${dashboard.url}`,
    `source: ${dashboard.sourceUrl}`,
    `date_range: joriy holat (${report.reportedAt}); from=${report.filters.from || ''}; to=${report.filters.to || ''}`,
    `metrics: ${report.metrics.map(metric => metric.key).join(', ')}`,
    'output: markdown',
    '```',
    '',
  ].join('\n');
}

export function dashboardReportFile(report: DashboardReport, format: DashboardReportFormat) {
  const extension = format === 'json' ? 'json' : 'md';
  const filename = `uzhi-dashboard-${report.reportedAt.replace(/[:.]/g, '-')}.${extension}`;
  const contentType = format === 'json' ? 'application/json;charset=utf-8' : 'text/markdown;charset=utf-8';
  const exported = { ...report, exports: [{ format, filename, contentType }] };
  return {
    filename,
    contentType,
    content: format === 'json' ? `${JSON.stringify(exported, null, 2)}\n` : toMarkdown(exported),
  };
}

export function downloadDashboardReport(report: DashboardReport, format: DashboardReportFormat): void {
  const file = dashboardReportFile(report, format);
  const url = URL.createObjectURL(new Blob([file.content], { type: file.contentType }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = file.filename;
  try {
    document.body.appendChild(anchor);
    anchor.click();
  } finally {
    anchor.remove();
    // Keep the object URL alive until the browser starts reading the download.
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
