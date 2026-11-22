const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const { chromium } = require("playwright");
const base = process.env.EXPERIENCE_BASE_URL || "http://127.0.0.1:5207";
const artifacts =
  process.env.EXPERIENCE_ARTIFACT_DIR || "/tmp/uzhi-experience-test";

const resources = {
  organizations: [
    {
      id: 1,
      name: "Sinov banki",
      sector: "Bank",
      timezone: "Asia/Tashkent",
      max_acceptable_loss: "1000000",
    },
  ],
  departments: [{ id: 1, name: "Operatsiyalar", head_name: "Sinov rahbari" }],
  services: [{ id: 1, name: "To‘lov xizmati", owner: 1 }],
  users: [
    {
      id: 1,
      username: "test",
      first_name: "Sinov",
      role: "ADMIN",
      role_display: "Administrator",
    },
  ],
  processes: [
    {
      id: 1,
      name: "To‘lovlar",
      service: 1,
      owner: 1,
      criticality: "CRITICAL",
      status: "ACTIVE",
    },
    {
      id: 2,
      name: "Hisoblar",
      service: 1,
      owner: 1,
      criticality: "HIGH",
      status: "ACTIVE",
    },
    {
      id: 3,
      name: "Qo‘llab-quvvatlash",
      service: 1,
      owner: 1,
      criticality: "LOW",
      status: "ACTIVE",
    },
  ],
  assets: [
    { id: 11, name: "Asosiy server", type: "SERVER", owner: 1 },
    { id: 12, name: "Ofis", type: "FACILITY", owner: 1 },
  ],
  dependencies: [
    {
      id: 1,
      from_type: "PROCESS",
      from_id: 1,
      to_type: "ASSET",
      to_id: 11,
      dependency_criticality: "MANDATORY",
    },
  ],
  bia: [
    {
      id: 1,
      process: 1,
      process_name: "To‘lovlar",
      revision: 1,
      rto_hours: "2",
      mtpd_hours: "8",
      rpo_minutes: 30,
      backup_interval_minutes: 60,
      has_rpo_gap: true,
      status: "APPROVED",
      impacts: [],
    },
  ],
  risks: [
    {
      id: 1,
      threat: "Server uzilishi",
      process: 1,
      process_name: "To‘lovlar",
      likelihood: 4,
      impact: 5,
      risk_score: 20,
      status: "ASSESSED",
    },
    {
      id: 2,
      threat: "Aloqa uzilishi",
      process: 2,
      process_name: "Hisoblar",
      likelihood: 2,
      impact: 4,
      risk_score: 8,
      status: "IDENTIFIED",
    },
  ],
  controls: [{ id: 1, title: "Zaxiralash", risk: 1, status: "IMPLEMENTED" }],
  strategies: [
    {
      id: 1,
      process: 1,
      process_name: "To‘lovlar",
      name: "Zaxira server",
      estimated_rto_hours: "1",
      estimated_rpo_minutes: 15,
      estimated_cost: "10000",
      is_selected: true,
    },
  ],
  plans: [
    {
      id: 1,
      process: 1,
      process_name: "To‘lovlar",
      title: "To‘lovlarni tiklash",
      version: "1.0",
      status: "PUBLISHED",
      status_display: "E’lon qilingan",
      steps: [],
    },
  ],
  scenarios: [
    {
      id: 1,
      title: "Server ishlamasligi",
      disrupted_asset_ids: [11],
      estimated_outage_hours: "8",
    },
  ],
  exercises: [
    {
      id: 1,
      plan: 1,
      scenario: 1,
      exercise_date: "2026-11-01",
      actual_recovery_hours: "1.5",
      outcome: "SUCCESS",
    },
  ],
  providers: [
    {
      id: 1,
      name: "Aloqa provayderi",
      risk_rating: "HIGH",
      services: [1],
      assets: [11],
      owner: 1,
    },
  ],
  incidents: [
    {
      id: 1,
      title: "Sinov hodisasi",
      status: "OPEN",
      severity: "HIGH",
      owner: 1,
      affected_assets: [11],
    },
  ],
  "improvement-tasks": [
    {
      id: 1,
      title: "Zaxira kanalni tekshirish",
      status: "OPEN",
      owner: 1,
      priority: "HIGH",
    },
    { id: 2, title: "Mashqni qayd etish", status: "DONE", owner: 1 },
  ],
  audit: [
    {
      id: "a1",
      action: "CREATE",
      entity: "BusinessProcess",
      entity_id: "1",
      actor_username: "test",
      actor_role: "ADMIN",
      timestamp: "2026-11-01T10:00:00Z",
    },
  ],
};
const summary = {
  total_processes: 3,
  critical_processes: 1,
  total_assets: 2,
  total_risks: 2,
  high_risks_count: 1,
  unplanned_processes_count: 2,
  rpo_gap_count: 1,
  approved_bias_count: 1,
  published_plans_count: 1,
  completed_exercises_count: 1,
};

(async () => {
  await fs.mkdir(artifacts, { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    executablePath:
      process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || "/usr/bin/chromium",
    args: ["--no-sandbox"],
  });
  try {
    const page = await browser.newPage({
      viewport: { width: 1600, height: 1100 },
    });
    const errors = [],
      writes = [], apiPaths = [];
    let empty = false,
      failure = "",
      role = "ADMIN",
      authenticated = true;
    page.on("pageerror", (error) => errors.push(error.message));
    await page.route("**/api/v1/**", async (route) => {
      const request = route.request(),
        pathname = new URL(request.url()).pathname;
      apiPaths.push(pathname);
      const resource = pathname.replace("/api/v1/", "").split("/")[0];
      if (request.method() !== "GET")
        writes.push(request.method() + " " + pathname);
      let data = {
          results: empty ? [] : resources[resource] || [],
          count: empty ? 0 : (resources[resource] || []).length,
          next: null,
          previous: null,
        },
        status = resource === failure ? 503 : 200;
      if (empty && resource === "organizations")
        data = {
          results: [{ ...resources.organizations[0], sector: "" }],
          count: 1,
          next: null,
          previous: null,
        };
      if (pathname.endsWith("/auth/csrf")) {
        data = { csrfToken: "test-token" };
      } else if (pathname.endsWith("/auth/me")) {
        status = authenticated ? 200 : 403;
        data = authenticated
          ? {
              id: 1,
              username: "test",
              first_name: "Sinov",
              last_name: "Egasi",
              email: "test@example.com",
              phone: "+998900000000",
              role,
              role_display: role === "AUDITOR" ? "Auditor" : "Administrator",
              organization: 1,
              organization_detail: {
                ...resources.organizations[0],
                sector: empty ? "" : "Bank",
              },
              preferences: { notifications: false },
            }
          : { detail: "Authentication credentials were not provided." };
      } else if (pathname.endsWith("/auth/config"))
        data = { google_enabled: false, password_reset_enabled: false };
      else if (pathname.endsWith("/reports/organization"))
        data = {
          organization: "Sinov banki",
          summary: empty
            ? Object.fromEntries(Object.keys(summary).map((k) => [k, 0]))
            : summary,
          process_ids: empty ? [] : [1, 2, 3],
          risk_distribution: {},
          criticality_distribution: {},
          filters: {},
        };
      if (status === 503)
        data = { detail: "Sinov: ma’lumot vaqtincha olinmadi." };
      await route.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify(data),
      });
    });
    await page.goto(base + "/dashboard", { waitUntil: "networkidle" });
    await page.locator(".executive-kpi").first().waitFor();
    await page.evaluate(() => document.fonts.ready);
    assert.equal(
      await page.locator(".executive-kpi strong").first().innerText(),
      "3",
    );
    assert.equal(
      await page.locator(".getting-started .is-complete").count(),
      8,
    );
    await page.waitForFunction(() => document.querySelector(".sidebar-brand .uzhi-logo-svg")?.getBBox().width > 450);
    const sidebarLogo = page.locator(".sidebar-brand .uzhi-logo-svg");
    assert.deepEqual(
      await sidebarLogo.locator("use").evaluateAll((parts) => parts.map((part) => getComputedStyle(part).color)),
      ["rgb(36, 255, 0)", "rgb(107, 76, 255)"],
    );
    assert.equal(
      await sidebarLogo.locator(".group-primary").evaluate((part) => getComputedStyle(part).animationDuration),
      "2.2s",
    );
    const headerBefore = await page.locator(".shell-header").boundingBox();
    await page.evaluate(() => scrollTo(0, 900));
    const headerAfter = await page.locator(".shell-header").boundingBox();
    assert.ok(
      Math.abs(headerAfter.y) < 1 &&
        Math.abs(headerAfter.height - headerBefore.height) < 1,
      "header and context must stay at the top",
    );
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({
      path: path.join(artifacts, "dashboard-dark.png"),
      fullPage: true,
    });
    assert.equal(await page.locator(".motion-background, .motion-controls, video").count(), 0);
    await page
      .getByRole("button", { name: "Temani almashtirish", exact: true })
      .click();
    await page.waitForFunction(() => {
      const logo = document.querySelector(".sidebar-brand .uzhi-logo-svg");
      const primary = logo?.querySelector(".group-primary");
      const secondary = logo?.querySelector(".group-secondary");
      return primary && secondary && getComputedStyle(primary).color === "rgb(38, 25, 104)"
        && getComputedStyle(secondary).color === "rgb(22, 230, 0)";
    });
    await page.screenshot({
      path: path.join(artifacts, "dashboard-light.png"),
      fullPage: true,
    });
    const navigation = page.getByRole("navigation", {
      name: "Asosiy navigatsiya",
    });
    for (const title of [
      "Tashkilot",
      "Jarayonlar",
      "Aktivlar va bog‘liqliklar",
      "Provayderlar",
      "Biznes ta’siri · BIA",
      "Risklar reestri",
      "Hisoblash yadrosi",
      "Tiklash strategiyalari",
      "Ssenariy sinovlari",
      "Hodisalar markazi",
      "BCP / DRP rejalari",
      "Yaxshilash vazifalari",
      "Hisobotlar",
      "Audit jurnali",
      "Profil va xavfsizlik",
    ]) {
      await navigation
        .getByRole("button", { name: title, exact: true })
        .click();
      await page.waitForLoadState("networkidle");
      const help = page.locator(".module-help");
      await help.waitFor();
      assert.equal(await help.getAttribute("open"), null, "help is collapsed: " + title);
      await help.locator("summary").click();
      assert.equal(await help.locator("li").count(), 3, "missing help steps: " + title);
      await help.locator("summary").click();
      assert.equal(
        await page.locator("main .alert.error").count(),
        0,
        "unexpected section error: " + title,
      );
    }
    await page.locator(".module-help summary").click();
    await page
      .locator(".module-help")
      .getByRole("button", { name: "Profil formasi", exact: true })
      .click();
    assert.equal(
      await page
        .locator("#main form input")
        .first()
        .evaluate((input) => input === document.activeElement),
      true,
    );
    await page
      .locator(".module-help")
      .getByRole("button", { name: "Hisob xavfsizligi", exact: true })
      .click();
    assert.equal(
      await page
        .locator('input[name="current_password"]')
        .evaluate((input) => input === document.activeElement),
      true,
    );
    await page.goto(base + "/map", { waitUntil: "networkidle" });
    await page.waitForURL(base + "/dashboard");
    assert.equal(await navigation.getByRole("button", { name: "Hududiy xarita", exact: true }).count(), 0);
    await page.locator(".dependency-svg").waitFor();

    await page.goto(base + "/organizations?action=edit", { waitUntil: "networkidle" });
    const profile = page.getByRole("dialog", { name: "Tashkilot profili" });
    const lossBefore = await profile.getByLabel("Maksimal qabul qilinadigan zarar", { exact: true }).inputValue();
    await profile.getByLabel("Namunaviy nom").selectOption("Navro‘z universiteti");
    assert.equal(await profile.getByLabel("Tashkilot nomi", { exact: true }).inputValue(), "Navro‘z universiteti");
    assert.equal(await profile.getByLabel("Faoliyat sohasi", { exact: true }).inputValue(), "Oliy ta’lim");
    assert.equal(await profile.getByLabel("Maksimal qabul qilinadigan zarar", { exact: true }).inputValue(), lossBefore);
    await page.keyboard.press("Escape");
    await profile.waitFor({ state: "hidden" });

    for (const [section, label, sample] of [
      ["departments", "Bo‘lim nomi", "Raqamli ta’lim markazi"],
      ["services", "Xizmat nomi", "Elektron ta’lim xizmati"],
    ]) {
      await page.goto(base + "/" + section + "?action=create", { waitUntil: "networkidle" });
      const form = page.getByRole("dialog");
      await form.getByLabel("Namunaviy nom").selectOption(sample);
      const name = form.getByLabel(label, { exact: true });
      assert.equal(await name.inputValue(), sample);
      await name.fill(sample + " 2");
      assert.equal(await name.inputValue(), sample + " 2");
      await page.keyboard.press("Escape");
      await form.waitFor({ state: "hidden" });
    }
    await page.locator(".sidebar-brand .brand-approved").click();
    await page.locator(".executive-dashboard").waitFor();
    assert.equal(new URL(page.url()).pathname, "/dashboard");
    await page
      .getByRole("button", {
        name: "Ehtimollik 4, ta’sir 5, ball 20, 1 risk",
        exact: true,
      })
      .click();
    await page.waitForLoadState("networkidle");
    assert.equal(new URL(page.url()).pathname, "/risks");
    await page.locator(".domain-registry tbody tr").first().waitFor();
    assert.equal(
      await page.locator(".domain-registry tbody tr").count(),
      1,
      "matrix link should filter the matching risk",
    );
    await page.locator(".module-help summary").click();
    await page
      .locator(".module-help")
      .getByRole("button", { name: "Hisoblash yadrosi", exact: true })
      .click();
    assert.equal(new URL(page.url()).pathname, "/engine");
    await page.waitForLoadState("networkidle");
    await page.locator(".sidebar-brand .brand-approved").click();
    await page.locator(".executive-dashboard").waitFor();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({
      path: path.join(artifacts, "dashboard-mobile.png"),
      fullPage: true,
    });
    const mobileLayout = await page.evaluate(() => ({
      width: innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      offenders: [...document.querySelectorAll("main *, .shell-header *")]
        .map((el) => ({
          tag: el.tagName,
          cls: el.getAttribute("class"),
          right: el.getBoundingClientRect().right,
          width: el.getBoundingClientRect().width,
        }))
        .filter((el) => el.right > innerWidth + 1)
        .slice(0, 15),
    }));
    assert.ok(
      mobileLayout.scrollWidth <= mobileLayout.width + 1,
      "mobile dashboard overflow: " + JSON.stringify(mobileLayout),
    );
    await page
      .getByRole("button", { name: "Menyuni ochish", exact: true })
      .click();
    assert.equal(await navigation.getByRole("button", { name: "Hududiy xarita", exact: true }).count(), 0);
    await navigation.getByRole("button", { name: "Tashkilot", exact: true }).click();
    await page.getByRole("heading", { name: "Tashkilot profili", exact: true }).waitFor();
    await page.locator(".mobile-brand .brand-approved").click();
    await page.locator(".executive-dashboard").waitFor();
    assert.equal(new URL(page.url()).pathname, "/dashboard");
    await page.goto(base + "/dashboard", { waitUntil: "networkidle" });
    await page.emulateMedia({ reducedMotion: "reduce" });
    const reducedMotion = page.getByRole("button", {
      name: "Interfeys harakati kamaytirilgan",
      exact: true,
    });
    await reducedMotion.waitFor();
    assert.equal(await reducedMotion.isDisabled(), true);
    assert.equal(
      await page.locator(".mobile-brand .group-primary").evaluate((part) => getComputedStyle(part).animationName),
      "none",
    );
    assert.equal(await page.locator(".motion-background, .motion-controls, video").count(), 0);
    await page.emulateMedia({ reducedMotion: "no-preference" });
    empty = true;
    await page.goto(base + "/dashboard", { waitUntil: "networkidle" });
    await page
      .getByRole("button", { name: /Boshlash: Tashkilot profilini/ })
      .click();
    await page.getByRole("dialog").waitFor();
    await page.keyboard.press("Escape");
    await page.getByRole("dialog").waitFor({ state: "hidden" });
    empty = false;
    failure = "processes";
    await page.goto(base + "/processes", { waitUntil: "networkidle" });
    await page
      .getByRole("alert").filter({ hasText: "Sinov:" })
      .waitFor();
    assert.equal(await page.locator(".domain-registry tbody tr").count(), 0);
    failure = "";
    await page
      .getByRole("button", { name: "Qayta urinish", exact: true })
      .click();
    await page.locator(".domain-registry tbody tr").first().waitFor();
    authenticated = false;
    await page.goto(base + "/auth/login", { waitUntil: "networkidle" });
    await page
      .getByRole("heading", { name: "Hisobingizga kirish", exact: true })
      .waitFor();
    await page.locator(".auth-mobile-brand .uzhi-logo-svg").waitFor();
    await page.waitForFunction(() =>
      document.querySelector(".auth-mobile-brand .uzhi-logo-svg")?.getBBox().width > 450
    );
    await page.screenshot({
      path: path.join(artifacts, "login-logo-mobile.png"),
      fullPage: true,
    });
    assert.deepEqual(errors, []);
    assert.deepEqual(writes, []);
    assert.ok(!apiPaths.includes("/api/v1/continuity-map"));
    console.log(
      JSON.stringify(
        {
          passed: true,
          artifacts,
          checks: [
            "fixed header/context",
            "full logo/home link",
            "Fusion-style real-data dashboard",
            "first task opens real editor",
            "all primary sections and collapsible help",
            "linked sections and risk filters",
            "retired map links and API calls",
            "editable organization, department and service presets",
            "static dashboard and reduced-motion preference",
            "mobile layout and branding",
            "API failure and recovery",
            "no browser exceptions or production writes",
          ],
        },
        null,
        2,
      ),
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
