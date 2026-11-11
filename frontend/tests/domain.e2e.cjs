/* Run against an isolated local database only:
 * UZHI_E2E_PASSWORD=<local account password> node tests/domain.e2e.cjs
 * Chromium and Playwright must be installed; credentials are never embedded.
 */
const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");

const base =
  process.env.E2E_BASE_URL ||
  process.env.UZHI_E2E_URL ||
  "http://127.0.0.1:5173";
if (!["127.0.0.1", "localhost", "[::1]"].includes(new URL(base).hostname))
  throw new Error("Domain tests require an isolated loopback environment.");
const password = process.env.E2E_PASSWORD || process.env.UZHI_E2E_PASSWORD;
if (!password)
  throw new Error("Set UZHI_E2E_PASSWORD for the isolated local account.");
const tag = `QA-${Date.now()}`;
const names = Object.fromEntries(
  [
    "service",
    "process",
    "asset",
    "risk",
    "control",
    "strategy",
    "plan",
    "scenario",
    "task",
  ].map((key) => [key, `${tag}-${key}`]),
);
const artifactDir =
  process.env.E2E_ARTIFACT_DIR ||
  process.env.UZHI_E2E_ARTIFACTS ||
  "/tmp/uzhi-domain-e2e";

(async () => {
  await fs.mkdir(artifactDir, { recursive: true });
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    headless: true,
    args: ["--no-sandbox"],
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    acceptDownloads: true, reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  page.setDefaultTimeout(20000);
  const failures = [],
    pageErrors = [],
    completed = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("response", (response) => {
    if (response.url().includes("/api/") && response.status() >= 500)
      failures.push(`${response.status()} ${response.url()}`);
  });
  page.on("dialog", (dialog) => dialog.accept());
  async function visit(module, title) {
    await page.goto(`${base}/${module}`);
    await page.getByRole("heading", { name: title, exact: true }).waitFor();
    await page.locator(".domain-page .loading").waitFor({ state: "hidden" });
    const alerts = page.locator(".domain-page > .alert.error");
    assert.equal(
      await alerts.count(),
      0,
      `Unexpected module error: ${await alerts.allTextContents()}`,
    );
  }
  async function create(fill) {
    await page
      .getByRole("button", { name: "Yangi yozuv", exact: true })
      .click();
    const dialog = page.getByRole("dialog");
    await fill(dialog);
    await dialog.getByRole("button", { name: "Saqlash", exact: true }).click();
    await dialog.waitFor({ state: "hidden" });
    await page.locator(".domain-page .loading").waitFor({ state: "hidden" });
  }
  const row = (name) =>
    page
      .locator(".domain-registry tbody tr")
      .filter({ has: page.getByText(name, { exact: true }) })
      .first();
  async function action(name, label, expected) {
    await row(name).getByRole("button", { name: label, exact: true }).click();
    await page.locator(".domain-page .loading").waitFor({ state: "hidden" });
    if (expected)
      await row(name).getByText(expected, { exact: true }).waitFor();
  }
  async function downloaded(trigger, ext, signature) {
    const event = page.waitForEvent("download");
    await trigger();
    const download = await event;
    const target = path.join(artifactDir, `${tag}-${ext}`);
    await download.saveAs(target);
    const bytes = await fs.readFile(target);
    assert(bytes.length > 100, `${ext} export must contain data`);
    if (signature) {
      const expected = Buffer.from(signature);
      assert(
        bytes.subarray(0, expected.length).equals(expected),
        `${ext} signature`,
      );
    }
    return target;
  }
  try {
    await page.goto(base);
    await page
      .getByLabel("Login", { exact: true })
      .fill(
        process.env.E2E_USERNAME || process.env.UZHI_E2E_USERNAME || "admin",
      );
    await page.locator("input[name=password]").fill(password);
    await page
      .getByRole("button", { name: "Tizimga kirish", exact: true })
      .click();
    await page
      .getByRole("heading", { name: "Boshqaruv markazi", exact: true })
      .waitFor();
    completed.push("session login");

    await visit("organizations", "Tashkilot profili");
    await page
      .locator("tbody tr")
      .first()
      .getByRole("button", { name: "Tafsilot", exact: true })
      .click();
    completed.push("organization profile read");
    await visit("services", "Xizmatlar");
    await create(async (d) => {
      await d.getByLabel("Xizmat nomi").fill(names.service);
      await d.getByLabel("Tavsif").fill("Izolyatsiyalangan brauzer sinovi");
    });
    await row(names.service).waitFor();
    completed.push("service create");

    await visit("processes", "Jarayonlar reestri");
    await create(async (d) => {
      await d.getByLabel("Jarayon nomi").fill(names.process);
      await d.getByLabel("Xizmat").selectOption({ label: names.service });
      await d.getByLabel("Kritiklik").selectOption("CRITICAL");
    });
    await row(names.process).waitFor();
    await row(names.process)
      .getByRole("button", { name: /tahrirlash/ })
      .click();
    await page
      .getByRole("dialog")
      .getByLabel("Tavsif")
      .fill("Reload va API bilan saqlangan jarayon");
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Saqlash", exact: true })
      .click();
    await page.getByRole("dialog").waitFor({ state: "hidden" });
    completed.push("process create and edit");

    await visit("assets", "Aktivlar va resurslar");
    await create(async (d) => {
      await d.getByLabel("Aktiv nomi").fill(names.asset);
      await d.getByLabel("Turi").selectOption("SERVER");
    });
    await visit("dependencies", "Bog‘liqlik xaritasi");
    await create(async (d) => {
      await d
        .getByLabel("Bog‘liq obyekt", { exact: true })
        .selectOption({ label: names.process });
      await d
        .getByLabel("Tayanch obyekt", { exact: true })
        .selectOption({ label: names.asset });
    });
    completed.push("asset and dependency create");

    await visit("bia", "Biznes ta’sirini baholash");
    await create(async (d) => {
      await d.getByLabel("Jarayon").selectOption({ label: names.process });
      await d.getByLabel("MTPD · soat").fill("4");
      await d.getByLabel("RTO · soat").fill("2");
      await d.getByLabel("RPO · daqiqa").fill("30");
      await d.getByLabel("Zaxiralash oralig‘i").fill("60");
      await d.getByRole("button", { name: "Ta’sir nuqtasi" }).click();
      await d.getByLabel("Gorizont · soat").fill("4");
      await d.getByLabel("Moliyaviy zarar").fill("100000");
      await d.getByLabel("Operatsion · 1–5").fill("4");
    });
    await action(names.process, "Yuborish", "Yuborilgan");
    await action(names.process, "Tasdiqlash", "Tasdiqlangan");
    completed.push("BIA impacts, submit and approve");

    await visit("risks", "Risklar reestri");
    await create(async (d) => {
      await d.getByLabel("Jarayon").selectOption({ label: names.process });
      await d
        .getByLabel("Aktiv", { exact: false })
        .selectOption({ label: names.asset });
      await d.getByLabel("Tahdid").fill(names.risk);
      await d
        .getByLabel("Ehtimollik · 1–5", { exact: false })
        .first()
        .fill("4");
      await d.getByLabel("Ta’sir · 1–5", { exact: false }).first().fill("5");
    });
    await page
      .getByRole("button", {
        name: "Ehtimollik 4, ta’sir 5, ball 20",
        exact: false,
      })
      .click();
    await row(names.risk).waitFor();
    await visit("controls", "Nazorat choralari");
    await create(async (d) => {
      await d
        .getByLabel("Risk", { exact: false })
        .selectOption({ label: names.risk });
      await d.getByLabel("Chora nomi").fill(names.control);
      await d.getByLabel("Holat").selectOption("IMPLEMENTED");
    });
    completed.push("risk create, matrix drilldown, control create");

    await visit("engine", "Hisoblash yadrosi");
    await page
      .getByRole("button", {
        name: "Haqiqiy ma’lumotlardan hisoblash",
        exact: true,
      })
      .click();
    await page
      .getByRole("cell", { name: names.process, exact: true })
      .waitFor();
    await page
      .getByRole("button", { name: "Riskni baholash", exact: true })
      .click();
    await page
      .getByRole("heading", { name: "Risk balli: 9 / 25", exact: true })
      .waitFor();
    completed.push("priority and risk formula calculations");

    await visit("strategies", "Tiklash strategiyalari");
    await create(async (d) => {
      await d.getByLabel("Jarayon").selectOption({ label: names.process });
      await d.getByLabel("Strategiya nomi").fill(names.strategy);
    });
    await page
      .getByLabel("Jarayon", { exact: true })
      .selectOption({ label: names.process });
    await page
      .getByRole("button", { name: "Solishtirish", exact: true })
      .click();
    await page
      .getByRole("heading", { name: names.strategy, exact: true })
      .waitFor();
    completed.push("strategy create and compare");

    await visit("plans", "BCP / DRP rejalari");
    await create(async (d) => {
      await d.getByLabel("Jarayon").selectOption({ label: names.process });
      await d.getByLabel("Reja nomi").fill(names.plan);
      await d
        .getByRole("button", { name: "Qadam qo‘shish", exact: true })
        .click();
      await d.getByLabel("Qadam nomi").fill("Zaxira serverga o‘tish");
    });
    await action(names.plan, "Yuborish", /Tekshiruvda|Ko.rib chiqilmoqda/);
    await action(names.plan, "E’lon qilish", /E.lon qilingan/);
    await downloaded(
      () =>
        row(names.plan)
          .getByRole("button", { name: "Rejani PDF yuklash", exact: true })
          .click(),
      "plan.pdf",
      "%PDF-",
    );
    completed.push("plan with step, submit, publish and PDF");

    await visit("simulation", "Ssenariy sinovlari");
    await create(async (d) => {
      await d.getByLabel("Ssenariy nomi").fill(names.scenario);
      await d
        .getByLabel("Uzilgan aktivlar")
        .selectOption({ label: names.asset });
    });
    await action(names.scenario, "Sinash");
    await page
      .getByRole("heading", { name: names.scenario, exact: true })
      .waitFor();
    await page.getByLabel("Vazifa nomi").fill(names.task);
    await page
      .getByRole("button", {
        name: "Yaxshilash vazifasini saqlash",
        exact: true,
      })
      .click();
    await page
      .getByText(
        "Vazifa yaratildi va saqlangan simulyatsiya natijasiga bog‘landi.",
        { exact: true },
      )
      .waitFor();
    completed.push("scenario simulation snapshot and improvement task");

    await visit("reports", "Rahbariyat hisobotlari");
    await page
      .getByLabel("Xizmat", { exact: true })
      .selectOption({ label: names.service });
    await page.locator(".domain-page .loading").waitFor({ state: "hidden" });
    await downloaded(
      () =>
        page.getByRole("button", { name: "CSV hisobot", exact: true }).click(),
      "report.csv",
      "\ufeff",
    );
    await downloaded(
      () =>
        page.getByRole("button", { name: "PDF hisobot", exact: true }).click(),
      "report.pdf",
      "%PDF-",
    );
    completed.push("filtered CSV and PDF report exports");

    await visit("audit", "Audit jurnali");
    await page
      .getByRole("textbox", { name: "Reestrda qidirish", exact: true })
      .fill("SIMULATE");
    assert(
      (await page.locator("tbody tr").count()) > 0,
      "simulation persisted in audit",
    );
    await page.goto(`${base}/processes?q=${encodeURIComponent(names.process)}`);
    await row(names.process).waitFor();
    assert.equal(
      await page
        .getByRole("textbox", { name: "Reestrda qidirish", exact: true })
        .inputValue(),
      names.process,
    );
    completed.push("audit filter, deep-link search, reload persistence");

    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForFunction(() => document.querySelector('.sidebar').getBoundingClientRect().right <= 1);
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'mobile page must not overflow horizontally');
    await page.screenshot({
      path: path.join(artifactDir, `${tag}-mobile.png`),
      fullPage: true,
    });
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.screenshot({
      path: path.join(artifactDir, `${tag}-desktop.png`),
      fullPage: true,
    });
    assert.deepEqual(pageErrors, [], "no unhandled browser exceptions");
    assert.deepEqual(failures, [], "no server errors during browser workflows");
    console.log(
      JSON.stringify(
        {
          status: "passed",
          tag,
          completed,
          pageErrors,
          serverErrors: failures,
          artifactDir,
        },
        null,
        2,
      ),
    );
  } catch (error) {
    await page.screenshot({
      path: path.join(artifactDir, `${tag}-failure.png`),
      fullPage: true,
    });
    console.error(
      JSON.stringify(
        {
          status: "failed",
          tag,
          completed,
          url: page.url(),
          pageErrors,
          serverErrors: failures,
          error: error.message,
        },
        null,
        2,
      ),
    );
    throw error;
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
