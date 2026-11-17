const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const { chromium } = require("playwright");
const dist = path.resolve(__dirname, "../../dist");
const artifacts = process.env.EFFECTS_ARTIFACT_DIR || path.resolve(__dirname, "../../../../work/motion-effects/qa");
const origin = process.env.EXPERIENCE_BASE_URL || "http://127.0.0.1:5207";
const offline = !process.env.EXPERIENCE_BASE_URL;
const resources = {
  organizations: [{ id: 1, name: "Sinov tashkiloti", sector: "Bank", timezone: "Asia/Tashkent" }],
  processes: [{ id: 1, name: "To‘lovlar", criticality: "CRITICAL", status: "ACTIVE" }, { id: 2, name: "Hisoblar", criticality: "HIGH", status: "ACTIVE" }, { id: 3, name: "Yordam", criticality: "LOW", status: "ACTIVE" }],
  assets: [{ id: 11, name: "Server", type: "SERVER" }],
  dependencies: [{ id: 1, from_type: "PROCESS", from_id: 1, to_type: "ASSET", to_id: 11, dependency_criticality: "MANDATORY" }],
  risks: [{ id: 1, threat: "Server uzilishi", process: 1, likelihood: 4, impact: 5, risk_score: 20, status: "ASSESSED" }],
  bia: [{ id: 1, process: 1, status: "APPROVED", rto_hours: 2, mtpd_hours: 8 }],
  plans: [{ id: 1, process: 1, title: "Tiklanish", status: "PUBLISHED" }],
};
const summary = { total_processes: 3, high_risks_count: 1, rpo_gap_count: 0, unplanned_processes_count: 2, published_plans_count: 1, approved_bias_count: 1 };
const mime = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".webp": "image/webp", ".jpg": "image/jpeg", ".woff2": "font/woff2", ".mp4": "video/mp4" };
async function builtAssets(page) {
  if (!offline) return;
  // Serve the actual production bundle through the runner; no preview service is required.
  await page.route(origin + "/**", async route => {
    const pathname = decodeURIComponent(new URL(route.request().url()).pathname);
    const file = path.extname(pathname) ? path.join(dist, pathname) : path.join(dist, "index.html");
    assert.ok(file.startsWith(dist + path.sep));
    try { await route.fulfill({ status: 200, contentType: mime[path.extname(file)] || "application/octet-stream", body: await fs.readFile(file) }); }
    catch { await route.fulfill({ status: 404, body: "Missing build asset" }); }
  });
}
async function apiFixtures(page, state) {
  await page.route("**/api/v1/**", async route => {
    assert.equal(route.request().method(), "GET", "motion interactions must not write domain data");
    const name = new URL(route.request().url()).pathname.replace(/^\/api\/v1\//, "").replace(/\/$/, "");
    let status = 200, body = { results: resources[name] || [], count: (resources[name] || []).length };
    if (name === "auth/me") {
      status = state.auth ? 200 : 403;
      body = state.auth ? { id: 1, username: "motion-test", first_name: "Sinov", role: "ADMIN", organization: 1, organization_detail: resources.organizations[0], preferences: { notifications: false } } : { detail: "Authentication credentials were not provided." };
    }
    if (name === "auth/config") body = { google_enabled: false };
    if (name === "reports/organization") body = { organization: "Sinov tashkiloti", summary: state.empty ? Object.fromEntries(Object.keys(summary).map(k => [k, 0])) : summary, process_ids: [1, 2, 3] };
    if (state.empty && resources[name]) body = { results: [], count: 0 };
    await route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
  });
}
const settle = page => page.evaluate(async () => { await document.fonts.ready; for (const animation of document.getAnimations()) if (Number.isFinite(animation.effect?.getComputedTiming().endTime)) animation.finish(); });
async function expectRunning(frame) {
  await frame.waitForFunction(() => window.__playing === true);
  const before = await frame.evaluate(() => window.__time);
  await frame.waitForFunction(time => window.__time > time + .1, before);
}
async function expectPaused(frame) {
  await frame.waitForFunction(() => window.__playing === false);
  const before = await frame.evaluate(() => window.__time);
  await frame.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  assert.equal(await frame.evaluate(() => window.__time), before, "pause must freeze the real animation clock");
}
(async () => {
  await fs.mkdir(artifacts, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || "/usr/bin/chromium", args: ["--no-sandbox"] });
  const errors = [];
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
    page.on("pageerror", e => errors.push(e.message));
    await builtAssets(page);
    let captureRequests = true;
    const external = [];
    page.on("request", req => { if (captureRequests && req.resourceType() !== "document" && !req.url().startsWith("data:")) external.push(req.url()); });
    await page.goto(origin + "/effect.html?render");
    await page.waitForFunction(() => window.__ready);
    const frames = {};
    for (const time of [0, 1, 2.2, 4.4, 6.6, 7.9, 8]) {
      await page.evaluate(t => window.seek(t), time);
      frames[time] = await page.screenshot({ path: path.join(artifacts, `effect-${time}.png`) });
    }
    assert.ok(frames[0].equals(frames[8]), "8-second seam must be pixel-identical");
    assert.ok(!frames[0].equals(frames[1]) && !frames[1].equals(frames[2.2]), "the opening must actually move");
    await page.evaluate(() => window.seek(1));
    assert.ok(frames[1].equals(await page.screenshot()), "seeking backwards must reproduce the exact frame");
    await page.evaluate(() => window.seek(4.4));
    const clippedText = await page.locator("svg text").evaluateAll(nodes => nodes.filter(n => { const b = n.getBBox(); return b.x < 0 || b.y < 0 || b.x + b.width > 1920 || b.y + b.height > 1080; }).map(n => n.textContent));
    assert.deepEqual(clippedText, []);
    assert.deepEqual(external, [], "the standalone effect must work without external assets");
    captureRequests = false;
    const state = { auth: true, empty: false };
    await apiFixtures(page, state);
    await page.goto(origin + "/dashboard");
    await page.locator(".executive-kpi").first().waitFor();
    await settle(page);
    assert.equal(await page.locator(".executive-kpi strong").first().innerText(), "3");
    const borders = await page.locator(".executive-kpi").evaluateAll(cards => cards.slice(0, 2).map(n => getComputedStyle(n).borderTopColor));
    assert.notEqual(borders[0], borders[1], "KPI expansion wrappers must preserve the distinct risk color");
    const values = await page.locator(".morph-value").allTextContents();
    assert.deepEqual(values, ["1", "1", "0", "1"]);
    await page.getByRole("button", { name: "Jarayonlar: ko‘rsatkichni kengaytirish", exact: true }).click();
    await page.getByRole("dialog").waitFor();
    assert.equal(await page.locator(".metric-focus-value").innerText(), "3");
    await page.keyboard.press("Escape");
    assert.equal(await page.getByRole("button", { name: "Jarayonlar: ko‘rsatkichni kengaytirish", exact: true }).evaluate(n => n === document.activeElement), true);
    await page.getByRole("button", { name: "Chiziqli ko‘rinish", exact: true }).click();
    await page.waitForFunction(() => Number(document.querySelector(".morph-line").style.strokeDashoffset) === 0);
    assert.deepEqual(await page.locator(".morph-value").allTextContents(), values, "morphing must not invent or change values");
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({ path: path.join(artifacts, "dashboard-dark.png"), fullPage: true });
    await page.getByRole("button", { name: "UzHi qanday ishlaydi?", exact: true }).click();
    await page.getByRole("dialog").waitFor();
    const player = page.frameLocator(".walkthrough-dialog iframe");
    await player.locator("#shared-title").waitFor();
    await page.getByRole("button", { name: "Ko‘rinishni to‘xtatish", exact: true }).click();
    const iframe = page.frames().find(f => f.url().includes("/effect.html"));
    await iframe.waitForFunction(() => window.__playing === false);
    const stopped = await iframe.evaluate(() => window.__time);
    await iframe.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    assert.equal(await iframe.evaluate(() => window.__time), stopped, "pausing must freeze the scene clock");
    await page.getByRole("button", { name: "Ko‘rinishni boshidan ko‘rish", exact: true }).click();
    await expectRunning(iframe);
    assert.ok(await iframe.evaluate(() => window.__time < 2.2), "replay must restart and play the opening");
    assert.ok(stopped >= 0);
    await page.keyboard.press("Escape");
    assert.equal(await page.getByRole("dialog").count(), 0);
    assert.equal(await page.getByRole("button", { name: "UzHi qanday ishlaydi?", exact: true }).evaluate(el => el === document.activeElement), true, "closing the player restores keyboard focus");
    await page.getByRole("button", { name: "Interfeys harakatini to‘xtatish", exact: true }).click();
    await page.waitForFunction(() => document.documentElement.dataset.uiMotion === "off");
    await page.reload();
    await page.getByRole("button", { name: "Interfeys harakatini yoqish", exact: true }).waitFor();
    await page.getByRole("button", { name: "Chiziqli ko‘rinish", exact: true }).click();
    assert.equal(await page.locator(".morph-line").evaluate(n => n.style.strokeDashoffset), "0", "paused motion still updates the final chart immediately");
    await page.getByRole("button", { name: "UzHi qanday ishlaydi?", exact: true }).click();
    const pausedFrame = page.frames().find(frame => frame.url().includes("/effect.html"));
    await pausedFrame.waitForFunction(() => window.__ready && window.__time === 4.4 && !window.__playing);
    assert.ok(await page.getByRole("button", { name: "Ko‘rinishni ijro etish", exact: true }).isEnabled(), "interface pause must never disable the player's Play button");
    await page.getByRole("button", { name: "Ko‘rinishni ijro etish", exact: true }).click();
    await expectRunning(pausedFrame);
    assert.ok(await pausedFrame.evaluate(() => window.__time < 2.2), "the first manual play must start at the opening, rather than hold at 4.4 seconds");
    assert.equal(await page.evaluate(() => localStorage.getItem("uzhi-ui-motion")), "paused", "manual playback must preserve the interface preference");
    await page.getByRole("button", { name: "Ko‘rinishni to‘xtatish", exact: true }).click();
    await expectPaused(pausedFrame);
    await page.getByRole("button", { name: "Ko‘rinishni boshidan ko‘rish", exact: true }).click();
    await expectRunning(pausedFrame);
    assert.equal(await page.evaluate(() => document.documentElement.dataset.uiMotion), "off");
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Temani almashtirish", exact: true }).click();
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({ path: path.join(artifacts, "dashboard-light.png"), fullPage: true });
    const navigation = page.getByRole("navigation", { name: "Asosiy navigatsiya", exact: true });
    await navigation.getByRole("button", { name: "Tashkilot", exact: true }).click();
    await page.getByRole("navigation", { name: "Modul bo‘limlari" }).waitFor();
    const tabs = page.getByRole("navigation", { name: "Modul bo‘limlari" });
    await tabs.getByRole("button", { name: "Bo‘limlar", exact: true }).click();
    assert.equal(await tabs.locator('[aria-current="page"]').innerText(), "Bo‘limlar");
    assert.ok(await tabs.evaluate(nav => {
      const selected = nav.querySelector('[aria-current="page"]').getBoundingClientRect();
      const marker = nav.querySelector('.motion-selection').getBoundingClientRect();
      return Math.abs(selected.x-marker.x)<1 && Math.abs(selected.y-marker.y)<1 && Math.abs(selected.width-marker.width)<1;
    }), "selection surface must land on the actual tab");
    await page.getByRole("button", { name: "Yangi yozuv", exact: true }).click();
    await page.getByRole("dialog").waitFor();
    await page.keyboard.press("Escape");
    assert.equal(await page.getByRole("dialog").count(), 0, "forms retain their Escape behavior");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await navigation.getByRole("button", { name: "Boshqaruv paneli", exact: true }).click();
    await page.locator(".executive-kpi").first().waitFor();
    assert.ok(await page.getByRole("button", { name: "Interfeys harakati kamaytirilgan" }).isDisabled());
    assert.equal(await page.locator(".dependency-pulse").first().evaluate(n => getComputedStyle(n).opacity), "0");
    await page.getByRole("button", { name: "UzHi qanday ishlaydi?", exact: true }).click();
    const reducedFrame = page.frames().find(f => f.url().includes("/effect.html"));
    await reducedFrame.waitForFunction(() => window.__ready && window.__time === 4.4);
    await expectPaused(reducedFrame);
    assert.ok(await page.getByRole("button", { name: "Ko‘rinishni ijro etish", exact: true }).isEnabled(), "reduced motion must still allow an explicit Play action");
    await page.getByRole("button", { name: "Ko‘rinishni ijro etish", exact: true }).click();
    await expectRunning(reducedFrame);
    const titleBefore = await reducedFrame.locator("#shared-title").getAttribute("y");
    await reducedFrame.waitForFunction(() => window.__time > 1.2);
    assert.notEqual(await reducedFrame.locator("#shared-title").getAttribute("y"), titleBefore, "manual playback must move the artwork with reduced motion enabled");
    await page.getByRole("button", { name: "Ko‘rinishni to‘xtatish", exact: true }).click();
    await expectPaused(reducedFrame);
    await page.getByRole("button", { name: "Ko‘rinishni boshidan ko‘rish", exact: true }).click();
    await expectRunning(reducedFrame);
    assert.ok(await reducedFrame.evaluate(() => window.__time < 1.2), "Replay must restart from zero even when the OS reduces motion");
    assert.equal(await page.evaluate(() => document.documentElement.dataset.uiMotion), "off");
    await page.keyboard.press("Escape");
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: path.join(artifacts, "dashboard-mobile.png"), fullPage: true });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "mobile must not overflow horizontally");
    state.auth = false;
    await page.goto(origin + "/auth/login");
    await page.locator('input[name="username"]').waitFor();
    await page.getByRole("button", { name: "UzHi qanday ishlaydi?", exact: true }).click();
    await page.getByRole("dialog").waitFor();
    await page.screenshot({ path: path.join(artifacts, "player-mobile.png") });
    await page.keyboard.press("Escape");
    assert.ok(await page.locator('input[name="username"]').isVisible());
    state.auth = true; state.empty = true;
    await page.goto(origin + "/dashboard");
    await page.locator(".executive-kpi").first().waitFor();
    assert.equal(await page.locator(".morph-chart").count(), 0, "empty data must not show invented chart values");
    await page.goto(origin + "/effect.html");
    await page.waitForFunction(() => window.__ready && window.__time === 4.4 && !window.__playing);
    await page.getByRole("button", { name: "Animatsiyani ijro etish", exact: true }).click();
    await expectRunning(page);
    await page.getByRole("button", { name: "Animatsiyani to‘xtatish", exact: true }).click();
    await expectPaused(page);
    await page.getByRole("button", { name: "Qayta", exact: true }).click();
    await expectRunning(page);
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ passed: true, artifacts, checks: ["seven seekable frames", "pixel-identical loop", "reverse seeking", "embedded assets", "real chart values", "player controls and focus", "persistent pause", "module tabs and record forms", "light/dark", "reduced motion", "manual playback with interface paused", "manual playback with reduced motion", "replay restarts and plays", "standalone playback controls", "mobile layout", "login page", "empty dataset", "no API writes or browser errors"] }, null, 2));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
