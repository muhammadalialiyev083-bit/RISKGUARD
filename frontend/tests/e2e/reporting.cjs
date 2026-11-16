const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { chromium } = require('playwright');

const base = process.env.REPORT_BASE_URL || 'http://127.0.0.1:5176';
const summary = {
  total_processes: 1234, critical_processes: 12, total_assets: 38,
  total_risks: 22, high_risks_count: 3, unplanned_processes_count: 6,
  rpo_gap_count: 2, approved_bias_count: 8, published_plans_count: 14,
  completed_exercises_count: 0,
};

(async () => {
  const artifacts = process.env.REPORT_ARTIFACT_DIR || await fs.mkdtemp(path.join(os.tmpdir(), 'uzhi-report-test-'));
  await fs.mkdir(artifacts, { recursive: true });
  const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
  const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    let requests = 0, downloads = 0, failure = 0;
    const exceptions = [];
    page.on('pageerror', error => exceptions.push(error.message));
    page.on('download', () => downloads++);
    await page.route('**/api/v1/**', async route => {
      assert.equal(route.request().method(), 'GET', 'this test must not mutate server records');
      const url = new URL(route.request().url());
      let data = { results: [], count: 0, next: null, previous: null }, status = 200;
      if (url.pathname.endsWith('/auth/me')) {
        data = {
          id: 1, username: 'report-test-user', first_name: 'Sinov', last_name: 'Egasi',
          role: 'ADMIN', role_display: 'Administrator', organization: 1,
          organization_detail: { id: 1, name: 'Sinov tashkiloti', timezone: 'Asia/Tashkent' },
          preferences: { notifications: false },
        };
      } else if (url.pathname.endsWith('/reports/organization')) {
        requests++;
        status = failure || 200;
        data = failure ? { detail: 'Sinov: server javob bermayapti.' } : {
          organization: 'Sinov tashkiloti',
          filters: Object.fromEntries(url.searchParams),
          summary: { ...summary, total_processes: requests > 1 ? 4321 : 1234 },
          process_ids: [], risk_distribution: {}, criticality_distribution: {},
        };
      } else if (url.pathname.endsWith('/services/')) {
        data = { ...data, results: [{ id: 7, name: 'Sinov xizmati' }], count: 1 };
      }
      await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data) });
    });

    const json = page.getByRole('button', { name: 'JSON (.json)', exact: true });
    const markdown = page.getByRole('button', { name: 'Markdown (.md)', exact: true });
    await page.goto(base + '/dashboard', { waitUntil: 'networkidle' });
    await json.waitFor({ state: 'visible' });
    const before = requests;
    const [download] = await Promise.all([page.waitForEvent('download'), json.click()]);
    const report = JSON.parse(await fs.readFile(await download.path(), 'utf8'));
    assert.equal(requests, before + 1);
    assert.equal(report.metrics.find(metric => metric.key === 'total_processes').value, 4321);
    assert.equal(report.metrics.find(metric => metric.key === 'completed_exercises_count').value, 0);
    assert.equal(report.metrics.length, 10);
    assert.equal(report.organization, 'Sinov tashkiloti');

    await page.getByLabel('Jarayon yaratilgan davr · dan').fill('2026-11-01');
    await json.waitFor({ state: 'visible' });
    await page.getByLabel('Davr · gacha').fill('2026-11-16');
    await json.waitFor({ state: 'visible' });
    await page.getByLabel('Xizmat', { exact: true }).selectOption('7');
    await json.waitFor({ state: 'visible' });
    const [filteredDownload] = await Promise.all([page.waitForEvent('download'), json.click()]);
    const filtered = JSON.parse(await fs.readFile(await filteredDownload.path(), 'utf8'));
    assert.deepEqual(filtered.filters, { from: '2026-11-01', to: '2026-11-16', service: '7' });
    assert.ok(filtered.dashboards[0].sourceUrl.endsWith('?from=2026-11-01&to=2026-11-16&service=7'));
    const [mdDownload] = await Promise.all([page.waitForEvent('download'), markdown.click()]);
    const text = await fs.readFile(await mdDownload.path(), 'utf8');
    assert.match(text, /\| Jami jarayonlar \| 4321 \|/);
    assert.match(text, /Jarayon yaratilgan davr: 2026-11-01 — 2026-11-16/);
    assert.match(text, /Xizmat ID: 7/);
    await page.screenshot({ path: path.join(artifacts, 'dashboard-desktop.png'), fullPage: true });

    failure = 503;
    await json.click();
    await page.getByRole('alert').filter({ hasText: 'Sinov: server javob bermayapti.' }).waitFor();
    assert.equal(downloads, 3, 'a failed request must not create a file');
    failure = 0;
    await page.goto(base + '/reports', { waitUntil: 'networkidle' });
    await json.waitFor({ state: 'visible' });
    assert.equal(await page.getByRole('button', { name: 'PDF hisobot', exact: true }).isVisible(), true);
    assert.equal(await page.getByRole('button', { name: 'CSV hisobot', exact: true }).isVisible(), true);
    await page.setViewportSize({ width: 390, height: 844 });
    const bounds = await page.locator('.dashboard-report').boundingBox();
    assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= 390);
    for (const button of [json, markdown]) {
      const box = await button.boundingBox();
      assert.ok(box.x >= bounds.x && box.x + box.width <= bounds.x + bounds.width);
    }
    await page.screenshot({ path: path.join(artifacts, 'dashboard-mobile.png'), fullPage: true });
    assert.deepEqual(exceptions, []);
    console.log(JSON.stringify({ passed: true, downloads, checks: [
      'fresh JSON values', 'date/service filters', 'Markdown content', 'no file after a server error',
      'existing PDF/CSV controls retained', 'mobile layout', 'no browser exceptions',
    ], dataSource: 'isolated API fixtures; no production writes', artifacts }, null, 2));
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
