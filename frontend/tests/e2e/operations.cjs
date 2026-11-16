const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const base = (process.env.E2E_BASE_URL || "http://127.0.0.1:5173").replace(
  /\/$/,
  "",
);
const artifactDir = process.env.E2E_ARTIFACT_DIR || "/tmp/uzhi-e2e";
const username = process.env.E2E_USERNAME,
  password = process.env.E2E_PASSWORD;
assert.ok(
  username && password,
  "E2E_USERNAME and E2E_PASSWORD must name an existing local test account.",
);
fs.mkdirSync(artifactDir, { recursive: true });
let browser;
(async () => {
  browser = await chromium.launch({
    executablePath:
      process.env.CHROMIUM_PATH ||
      (fs.existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined),
    headless: true,
    args: ["--no-sandbox"],
  });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  const errors = [],
    responses = [],
    consoleErrors = [];
  let expectedCloseFailure = false;
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("response", (r) => {
    if (r.status() >= 400 && !r.url().endsWith("/auth/me")) {
      responses.push({ status: r.status(), url: r.url() });
    }
  });
  const stamp = Date.now(),
    provider = `QA Hamkor ${stamp}`,
    incident = `QA Hodisa ${stamp}`,
    task = `QA Hodisa chorasi ${stamp}`,
    improvement = `QA Tahlil chorasi ${stamp}`;
  const navigate = async (p) => {
    await page.goto(base + "/" + p);
    await page.locator(".operations-page").waitFor();
    await page
      .getByRole("status")
      .filter({ hasText: "Ma’lumotlar yuklanmoqda" })
      .waitFor({ state: "hidden" });
  };
  const save = async () => {
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Saqlash", exact: true })
      .click();
    await page.getByRole("dialog").waitFor({ state: "hidden" });
  };
  const selectFirst = async (id) => {
    const values = await page
      .locator(id + " option")
      .evaluateAll((os) => os.map((o) => o.value).filter(Boolean));
    assert.ok(values.length, id + " options available");
    await page.locator(id).selectOption(values[0]);
  };
  await page.goto(base);
  await page.getByLabel("Login", { exact: true }).fill(username);
  await page.locator('input[name="password"]').fill(password);
  await page
    .getByRole("button", { name: "Tizimga kirish", exact: true })
    .click();
  await page.locator(".app-shell").waitFor();
  const me = await (await page.request.get(base + "/api/v1/auth/me")).json();
  const create = async (resource, data) => {
    const csrf = await (
      await page.request.get(base + "/api/v1/auth/csrf")
    ).json();
    const response = await page.request.post(
      base + "/api/v1/" + resource + "/",
      {
        data,
        headers: {
          "X-CSRFToken": csrf.csrfToken,
          Origin: new URL(base).origin,
        },
      },
    );
    assert.equal(
      response.status(),
      201,
      resource + " prerequisite creation: " + (await response.text()),
    );
    return response.json();
  };
  const service = await create("services", {
    name: `QA Service ${stamp}`,
    owner: me.id,
  });
  const asset = await create("assets", {
    name: `QA Server ${stamp}`,
    type: "SERVER",
    owner: me.id,
  });
  const businessProcess = await create("processes", {
    name: `QA Process ${stamp}`,
    service: service.id,
    owner: me.id,
    criticality: "CRITICAL",
  });
  await create("dependencies", {
    from_type: "PROCESS",
    from_id: businessProcess.id,
    to_type: "ASSET",
    to_id: asset.id,
    dependency_criticality: "MANDATORY",
  });
  await navigate("providers");
  await page
    .getByRole("button", { name: "Provayder qo‘shish", exact: true })
    .click();
  await page.locator("#ops-name").fill(provider);
  await page.locator("#ops-contact_email").fill("qa@example.test");
  await page.locator("#ops-risk_rating").selectOption("HIGH");
  await page.locator("#ops-owner").selectOption(String(me.id));
  await page.locator("#ops-services").selectOption({ label: service.name });
  await page.locator("#ops-assets").selectOption({ label: asset.name });
  await save();
  await page
    .getByRole("row")
    .filter({ has: page.getByRole("button", { name: provider, exact: true }) })
    .getByRole("button", { name: "Tahrirlash", exact: true })
    .click();
  await page.locator("#ops-contact_email").fill("qa-updated@example.test");
  await save();
  await page.getByRole("button", { name: provider, exact: true }).click();
  await page
    .getByRole("button", { name: "Uzilish ta’sirini sinash", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Sinovni boshlash", exact: true })
    .click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  await page
    .getByRole("heading", { name: /Saqlangan ta’sir tahlili/ })
    .waitFor();
  await page
    .getByRole("cell", { name: businessProcess.name, exact: true })
    .waitFor();
  await page.screenshot({
    path: path.join(artifactDir, "operations-provider-desktop.png"),
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Natijadan vazifa yaratish", exact: true })
    .click();
  await page.locator("#ops-title").fill(improvement);
  await selectFirst("#ops-owner");
  await save();
  await navigate("tasks");
  await page.getByRole("button", { name: improvement, exact: true }).waitFor();
  await navigate("incidents");
  await page
    .getByRole("button", { name: "Hodisa ochish", exact: true })
    .last()
    .click();
  await page.locator("#ops-title").fill(incident);
  await page.locator("#ops-provider").selectOption({ label: provider });
  await selectFirst("#ops-owner");
  await selectFirst("#ops-asset");
  await save();
  await page.getByRole("button", { name: incident, exact: true }).click();
  await page.getByRole("button", { name: "Eskalatsiya", exact: true }).click();
  await page.locator("#ops-severity").selectOption("HIGH");
  await page
    .locator("#ops-reason")
    .fill("QA: xizmatga ta’sir kuchaygani sabab mas’ullarni jalb qilish.");
  await save();
  await page
    .getByText(/QA: xizmatga ta’sir kuchaygani sabab mas’ullarni jalb qilish/)
    .waitFor();
  await page
    .getByRole("button", { name: "Chora qo‘shish", exact: true })
    .click();
  await page.locator("#ops-title").fill(task);
  await selectFirst("#ops-owner");
  await page.locator("#ops-description").fill("Tiklanish va aloqa tekshiruvi");
  await save();
  await page.getByText(task, { exact: true }).waitFor();
  await page
    .getByLabel("Jurnalga izoh", { exact: true })
    .fill("QA: mas’ullar xabardor qilindi.");
  await page
    .getByRole("button", { name: "Izoh qo‘shish", exact: true })
    .click();
  await page
    .getByText("QA: mas’ullar xabardor qilindi.", { exact: true })
    .waitFor();
  const incidentRow = page
    .getByRole("row")
    .filter({ has: page.getByRole("button", { name: incident, exact: true }) });
  await incidentRow
    .getByRole("button", { name: "Tahrirlash", exact: true })
    .click();
  await page.locator("#ops-status").selectOption("CLOSED");
  await page
    .locator("#ops-conclusion")
    .fill("QA: tiklanish yakunlandi va sabab tahlil qilindi.");
  const rejected = page.waitForResponse(
    (r) => r.url().includes("/incidents/") && r.request().method() === "PATCH",
  );
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Saqlash", exact: true })
    .click();
  assert.equal((await rejected).status(), 400);
  expectedCloseFailure = true;
  await page
    .getByRole("dialog")
    .getByRole("alert")
    .filter({ hasText: "Avval hodisaning ochiq vazifalarini bajaring" })
    .waitFor();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Bekor qilish", exact: true })
    .click();
  await navigate("tasks");
  const taskRow = page
    .getByRole("row")
    .filter({ has: page.getByRole("button", { name: task, exact: true }) });
  await taskRow
    .getByRole("button", { name: "Tahrirlash", exact: true })
    .click();
  await page.locator("#ops-status").selectOption("DONE");
  await save();
  await navigate("incidents");
  await page
    .getByRole("row")
    .filter({ has: page.getByRole("button", { name: incident, exact: true }) })
    .getByRole("button", { name: "Tahrirlash", exact: true })
    .click();
  await page.locator("#ops-status").selectOption("CLOSED");
  await page
    .locator("#ops-conclusion")
    .fill("QA: tiklanish yakunlandi va sabab tahlil qilindi.");
  await save();
  await page.reload();
  await page
    .getByRole("row")
    .filter({ has: page.getByRole("button", { name: incident, exact: true }) })
    .getByText("Yopildi", { exact: true })
    .waitFor();
  await page.setViewportSize({ width: 390, height: 844 });
  for (const module of ["providers", "incidents", "tasks"]) {
    await navigate(module);
    await page.screenshot({
      path: path.join(artifactDir, `operations-${module}-mobile.png`),
      fullPage: true,
    });
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth + 1,
      ),
      module + " mobile page does not overflow viewport",
    );
  }
  await navigate("providers?q=" + encodeURIComponent(provider));
  assert.equal(await page.locator(".ops-search input").inputValue(), provider);
  assert.equal(await page.locator(".ops-table tbody tr").count(), 1);
  assert.equal(errors.length, 0, "no uncaught browser errors");
  assert.deepEqual(
    consoleErrors.filter(
      (message) =>
        !message.includes("the server responded with a status of 400") &&
        !message.includes("the server responded with a status of 403"),
    ),
    [],
    "no unexpected console errors",
  );
  assert.equal(responses.length, 1, "only expected failed-close 400");
  assert.ok(expectedCloseFailure);
  fs.writeFileSync(
    path.join(artifactDir, "operations-e2e-results.json"),
    JSON.stringify(
      {
        passed: true,
        workflows: [
          "provider create/edit with dedicated service and asset dependencies",
          "provider disruption and persisted simulation",
          "simulation improvement task",
          "incident create",
          "incident escalation and immutable timeline",
          "incident response task",
          "incident timeline note",
          "open task blocks closure 400",
          "complete task then close incident",
          "reload persistence",
          "390px mobile providers/incidents/tasks",
          "query-string record search",
        ],
        provider,
        incident,
        task,
        improvement,
        errors,
        consoleErrors,
        expectedResponses: responses,
      },
      null,
      2,
    ),
  );
  console.log(
    "PASS operations: connected workflows and search, 3 mobile pages, 0 uncaught browser errors; one expected close rejection 400",
  );
  await browser.close();
})().catch(async (e) => {
  console.error(e);
  if (browser) await browser.close();
  process.exitCode = 1;
});
