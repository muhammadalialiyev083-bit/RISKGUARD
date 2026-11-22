import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

const source = readFileSync(new URL('../src/reports/dashboard.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext },
}).outputText;
const { createDashboardReport, dashboardReportFile } = await import(
  `data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`
);

const summary = {
  total_processes: 1234, critical_processes: 12, total_assets: 38,
  total_risks: 22, high_risks_count: 3, unplanned_processes_count: 6,
  rpo_gap_count: 2, approved_bias_count: 8, published_plans_count: 14,
  completed_exercises_count: 0, ready_plans_count: 12, verified_plans_count: 0, plans_needing_review_count: 2,
};
const options = {
  data: { organization: 'Sinov tashkiloti', summary },
  dashboardUrl: 'https://example.com/dashboard',
  sourceUrl: 'https://example.com/api/v1/reports/organization',
  reportedAt: new Date('2026-11-16T12:30:45.123Z'),
};

test('JSON export preserves API totals, organization, source and snapshot time', () => {
  const report = createDashboardReport(options);
  const file = dashboardReportFile(report, 'json');
  const exported = JSON.parse(file.content);
  assert.equal(exported.organization, 'Sinov tashkiloti');
  assert.equal(exported.reportedAt, '2026-11-16T12:30:45.123Z');
  assert.deepEqual(exported.dateRange, { type: 'snapshot', at: exported.reportedAt, processCreatedFrom: null, processCreatedTo: null });
  assert.equal(exported.collectionMethod, 'authenticated-dashboard-api');
  assert.deepEqual(Object.fromEntries(exported.metrics.map(item => [item.key, item.value])), summary);
  assert.ok(exported.metrics.every(item => item.sourceUrl === options.sourceUrl && item.change === null));
  assert.equal(exported.tables[0].rows.length, Object.keys(summary).length);
  assert.equal(exported.exports.length, 1);
  assert.deepEqual(exported.exports[0], { format: 'json', filename: file.filename, contentType: file.contentType });
  assert.match(file.filename, /^uzhi-dashboard-[\w-]+\.json$/);
  assert.deepEqual(report.exports, [], 'serializing a format must not mutate the report');
});

test('a real empty organization exports zeros without inventing historical changes', () => {
  const zeros = Object.fromEntries(Object.keys(summary).map(key => [key, 0]));
  const report = createDashboardReport({ ...options, data: { organization: 'Yangi tashkilot', summary: zeros } });
  assert.ok(report.metrics.every(metric => metric.value === 0 && metric.change === null));
  assert.match(report.notes.join(' '), /tarixiy davr/);
});

test('missing, string, negative and non-finite counts are unavailable rather than zero', () => {
  const report = createDashboardReport({
    ...options,
    data: { organization: 'Qisman javob', summary: {
      total_processes: 9, total_assets: '12', high_risks_count: -1,
      approved_bias_count: NaN, total_risks: Infinity, rpo_gap_count: 1.5,
    } },
  });
  assert.equal(report.metrics.find(metric => metric.key === 'total_processes').value, 9);
  assert.ok(report.metrics.filter(metric => metric.key !== 'total_processes').every(metric => metric.value === null));
  assert.match(report.notes.join(' '), /nol deb hisoblanmagan/);
  assert.match(dashboardReportFile(report, 'markdown').content, /Mavjud emas/);
});

test('failed or malformed dashboard responses cannot become a successful report', () => {
  for (const data of [null, {}, { detail: 'Authentication required.' }, { summary: null },
    { summary: [] }, { summary: {} }, { summary: { total_processes: '0' } }]) {
    assert.throws(() => createDashboardReport({ ...options, data }), /Hisobot yaratilmadi/);
  }
});

test('reports omit session parameters, fragments and unrelated response fields', () => {
  const report = createDashboardReport({
    ...options,
    data: { ...options.data, csrfToken: 'secret-csrf', user: { password: 'secret-password' } },
    dashboardUrl: `${options.dashboardUrl}?session=secret-session#secret-fragment`,
    sourceUrl: `${options.sourceUrl}?token=secret-token`,
  });
  const content = dashboardReportFile(report, 'json').content;
  assert.ok(!content.includes('secret-'));
  assert.equal(report.dashboards[0].url, options.dashboardUrl);
  assert.equal(report.dashboards[0].sourceUrl, options.sourceUrl);
});

test('Markdown keeps Uzbek text and safely quotes organization-supplied markup', () => {
  const report = createDashboardReport({
    ...options,
    data: { organization: '<script>alert(1)</script> | [Havola](https://example.org)\n# sarlavha', summary },
  });
  const file = dashboardReportFile(report, 'markdown');
  assert.equal(file.contentType, 'text/markdown;charset=utf-8');
  assert.match(file.filename, /\.md$/);
  assert.match(file.content, /&lt;script&gt;/);
  assert.ok(!file.content.includes('<script>'));
  assert.ok(!file.content.includes('[Havola]('));
  assert.ok(!file.content.includes('\n# sarlavha'));
  assert.match(file.content, /\| Jami jarayonlar \| 1234 \| jarayon \| Joriy holat \|/);
  assert.match(file.content, /workflow: firecrawl-dashboard-reporting/);
  assert.match(file.content, /Manba: <https:\/\/example.com\/api\/v1\/reports\/organization>/);
});

test('date and service filters are retained without carrying authentication parameters', () => {
  const report = createDashboardReport({
    ...options,
    sourceUrl: `${options.sourceUrl}?from=2026-11-01&to=2026-11-16&service=7&token=secret`,
  });
  assert.deepEqual(report.filters, { from: '2026-11-01', to: '2026-11-16', service: '7' });
  assert.equal(report.dateRange.processCreatedFrom, '2026-11-01');
  assert.equal(report.dateRange.processCreatedTo, '2026-11-16');
  assert.equal(report.dashboards[0].sourceUrl, `${options.sourceUrl}?from=2026-11-01&to=2026-11-16&service=7`);
  assert.match(report.metrics.find(metric => metric.key === 'total_processes').period, /2026-11-01/);
  assert.equal(report.metrics.find(metric => metric.key === 'total_assets').period, 'Tashkilotning joriy holati');
  assert.ok(!dashboardReportFile(report, 'json').content.includes('secret'));
});
