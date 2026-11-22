const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const os = require("node:os");
const { chromium } = require("playwright");
const base = process.env.MAP_BASE_URL || "http://127.0.0.1:5180";

(async () => {
  const artifacts =
    process.env.MAP_ARTIFACT_DIR ||
    (await fs.mkdtemp(path.join(os.tmpdir(), "uzhi-map-test-")));
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
    const exceptions = [],
      apiWrites = [];
    let userId = 41;
    let failure = false;
    const maps = new Map();
    page.on("pageerror", (error) => exceptions.push(error.message));
    await page.route("**/api/v1/**", async (route) => {
      if (route.request().method() !== "GET")
        apiWrites.push(route.request().method() + " " + route.request().url());
      const pathname = new URL(route.request().url()).pathname;
      const organization = userId === 42 ? 8 : 7;
      let status = 200;
      let data = { results: [], count: 0, next: null, previous: null };
      if (pathname.endsWith("/auth/csrf")) {
        data = { csrfToken: "test-token" };
      } else if (pathname.endsWith("/continuity-map")) {
        if (route.request().method() === "PUT") {
          const payload = route.request().postDataJSON();
          if (failure) {
            status = 503;
            data = { detail: "Xarita saqlanmadi." };
          } else {
            maps.set(organization, { ...payload, revision: payload.revision + 1 });
          }
        }
        if (status === 200) data = maps.get(organization) || { version: 1, revision: 0, stops: [] };
      } else if (pathname.endsWith("/auth/me"))
        data = {
          id: userId,
          username: "map-test-" + userId,
          first_name: "Sinov",
          role: "ADMIN",
          role_display: "Administrator",
          organization,
          organization_detail: {
            id: organization,
            name: "Sinov tashkiloti",
            timezone: "Asia/Tashkent",
          },
          preferences: { notifications: false },
        };
      else if (pathname.endsWith("/reports/organization"))
        data = {
          organization: "Sinov tashkiloti",
          summary: { total_processes: 0, total_risks: 0, total_assets: 0 },
          risk_distribution: {},
          criticality_distribution: {},
        };
      await route.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify(data),
      });
    });
    await page.goto(base + "/dashboard", { waitUntil: "networkidle" });
    await page
      .getByRole("button", { name: "Xaritani ochish", exact: true })
      .click();
    await page
      .getByRole("heading", { name: "Hududiy tiklanish xaritasi", exact: true })
      .waitFor();
    await page.locator(".map-route-list li").last().waitFor();
    assert.equal(await page.locator(".map-demo-note").isVisible(), true);
    assert.match(
      await page.locator(".map-mode-switch").innerText(),
      /Tashkilot rejasi\s*0/,
    );
    assert.equal(
      await page
        .getByRole("button", { name: "GeoJSON nusxa", exact: true })
        .isDisabled(),
      true,
    );
    await page.screenshot({
      path: path.join(artifacts, "map-demo-dark.png"),
      fullPage: true,
    });
    const svg = page.locator(".continuity-map");
    async function seek(frame) {
      await page
        .getByRole("slider", { name: "Animatsiya kadri" })
        .evaluate((input, value) => {
          Object.getOwnPropertyDescriptor(
            HTMLInputElement.prototype,
            "value",
          ).set.call(input, String(value));
          input.dispatchEvent(new Event("input", { bubbles: true }));
          input.dispatchEvent(new Event("change", { bubbles: true }));
        }, frame);
      await page.waitForFunction(
        (value) =>
          document
            .querySelector(".continuity-map")
            ?.getAttribute("data-frame") === String(value),
        frame,
      );
    }
    for (const frame of [0, 24, 96, 239]) {
      await seek(frame);
      await svg.screenshot({
        path: path.join(artifacts, `map-frame-${frame}.png`),
      });
    }
    await seek(96);
    const graphicState = () =>
      page
        .locator("[data-route-progress]")
        .evaluateAll((paths) =>
          paths.map((path) => path.getAttribute("stroke-dashoffset")),
        );
    const graphics96 = await graphicState(),
      camera96 = await page
        .locator("[data-map-camera]")
        .getAttribute("transform");
    const strokeCoverage = await page
      .locator("[data-route-progress]")
      .first()
      .evaluate((path) => {
        const length = path.getTotalLength();
        return [0.25, 0.75].map((part) =>
          path.isPointInStroke(path.getPointAtLength(length * part)),
        );
      });
    assert.deepEqual(
      strokeCoverage,
      [true, false],
      "half-drawn route must start at the first stop and leave its second half hidden",
    );
    await seek(97);
    assert.equal(await svg.getAttribute("data-overlay-frame"), "96");
    assert.deepEqual(await graphicState(), graphics96);
    assert.notEqual(
      await page.locator("[data-map-camera]").getAttribute("transform"),
      camera96,
    );
    await seek(98);
    assert.notDeepEqual(await graphicState(), graphics96);
    await page
      .getByRole("button", { name: "Animatsiyani boshlash", exact: true })
      .click();
    await page.waitForFunction(
      () =>
        Number(
          document.querySelector(".continuity-map")?.getAttribute("data-frame"),
        ) > 100,
    );
    await page
      .getByRole("button", { name: "Animatsiyani to‘xtatish", exact: true })
      .click();
    async function add(name, city, kind) {
      await page.getByLabel("Manzil nomi", { exact: true }).fill(name);
      await page
        .getByLabel("Shahar markazi", { exact: true })
        .selectOption(String(city));
      await page.getByLabel("Manzil turi", { exact: true }).selectOption(kind);
      await page
        .getByRole("button", { name: "Rejaga qo‘shish", exact: true })
        .click();
      if (!failure) await page.locator(".map-route-list").getByText(name, { exact: true }).waitFor();
    }
    await add("Toshkent bosh ofisi", 0, "office");
    await add("Samarqand zaxira markazi", 1, "backup");
    assert.equal(await page.locator(".map-demo-note").count(), 0);
    assert.equal(await page.locator(".map-route-list li").count(), 2);
    await page.reload({ waitUntil: "networkidle" });
    await page.locator(".map-route-list li").last().waitFor();
    assert.equal(await page.locator(".map-route-list li").count(), 2);
    await page
      .getByRole("button", {
        name: "Samarqand zaxira markazi: yuqoriga",
        exact: true,
      })
      .click();
    await page.locator(".map-route-list li").first().getByText("Samarqand zaxira markazi", {exact: true}).waitFor();
    await page
      .getByRole("button", {
        name: "Toshkent bosh ofisi: tahrirlash",
        exact: true,
      })
      .click();
    await page
      .getByLabel("Manzil nomi", { exact: true })
      .fill("Toshkent asosiy ofis");
    await page
      .getByRole("button", { name: "O‘zgarishni saqlash", exact: true })
      .click();
    await page
      .locator(".map-route-list")
      .getByText("Toshkent asosiy ofis", { exact: true })
      .waitFor();
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "GeoJSON nusxa", exact: true }).click(),
    ]);
    const exported = JSON.parse(
      await fs.readFile(await download.path(), "utf8"),
    );
    assert.deepEqual(
      exported.features[0].geometry.coordinates,
      [66.9597, 39.6542],
    );
    assert.equal(exported.features[1].properties.name, "Toshkent asosiy ofis");
    const invalid = structuredClone(exported);
    invalid.features[0].geometry.type = "LineString";
    await page
      .locator(".map-file-input")
      .setInputFiles({
        name: "bad.geojson",
        mimeType: "application/geo+json",
        buffer: Buffer.from(JSON.stringify(invalid)),
      });
    await page
      .getByRole("alert")
      .filter({ hasText: /faqat.*Point/ })
      .waitFor();
    assert.equal(await page.locator(".map-route-list li").count(), 2);
    const global = structuredClone(exported);
    global.features.push({
      type: "Feature",
      geometry: { type: "Point", coordinates: [-0.1276, 51.5072] },
      properties: {
        id: "london",
        name: "London hamkori",
        kind: "partner",
        order: 3,
      },
    });
    await page
      .locator(".map-file-input")
      .setInputFiles({
        name: "global.geojson",
        mimeType: "application/geo+json",
        buffer: Buffer.from(JSON.stringify(global)),
      });
    await page.getByRole("region", { name: "Yuklanadigan reja" }).waitFor();
    assert.equal(await page.locator(".map-route-list li").count(), 2);
    await page
      .getByRole("button", { name: "Rejani almashtirish", exact: true })
      .click();
    await page.locator(".map-route-list li").nth(2).waitFor();
    assert.equal(await page.locator(".map-route-list li").count(), 3);
    await page
      .getByRole("button", {
        name: "Hamkor manzili: London hamkori",
        exact: true,
      })
      .focus();
    await page.keyboard.press("Enter");
    assert.equal(await page.locator(".map-pin.is-selected").count(), 1);
    await page
      .getByRole("button", { name: "Umumiy ko‘rinish", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Temani almashtirish", exact: true })
      .click();
    await page.screenshot({
      path: path.join(artifacts, "map-plan-light.png"),
      fullPage: true,
    });
    await page.setViewportSize({ width: 390, height: 844 });
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
      "mobile page must not overflow",
    );
    await page.screenshot({
      path: path.join(artifacts, "map-mobile.png"),
      fullPage: true,
    });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.waitForFunction(() =>
      document.querySelector(".map-motion-note"),
    );
    assert.equal(
      await page
        .getByRole("button", { name: "Animatsiyani boshlash", exact: true })
        .isDisabled(),
      true,
    );
    userId = 42;
    await page.reload({ waitUntil: "networkidle" });
    await page.locator(".map-demo-note").waitFor();
    assert.match(
      await page.locator(".map-mode-switch").innerText(),
      /Tashkilot rejasi\s*0/,
    );
    assert.equal(
      await page
        .locator(".map-route-list")
        .getByText("London hamkori", { exact: true })
        .count(),
      0,
    );
    userId = 41;
    await page.reload({ waitUntil: "networkidle" });
    await page
      .locator(".map-route-list")
      .getByText("London hamkori", { exact: true })
      .waitFor();
    await page
      .getByRole("button", { name: "London hamkori: o‘chirish", exact: true })
      .click();
    await page.locator(".map-route-list").getByText("London hamkori", {exact: true}).waitFor({state: "hidden"});
    assert.equal(await page.locator(".map-route-list li").count(), 2);
    const dateline = structuredClone(exported);
    dateline.features[0].geometry.coordinates = [179, 0];
    dateline.features[1].geometry.coordinates = [-179, 0];
    await page
      .locator(".map-file-input")
      .setInputFiles({
        name: "dateline.geojson",
        mimeType: "application/geo+json",
        buffer: Buffer.from(JSON.stringify(dateline)),
      });
    await page
      .getByRole("button", { name: "Rejani almashtirish", exact: true })
      .click();
    await page.locator(".map-notice").getByText("Xarita rejasi saqlandi.", {exact: true}).waitFor();
    const routePath = await page
      .locator("[data-route-progress]")
      .first()
      .getAttribute("d");
    assert.ok(
      (routePath.match(/M/g) || []).length >= 2,
      "dateline route should clip at both map edges",
    );
    assert.doesNotMatch(routePath, /NaN|Infinity/);
    failure = true;
    await add("Saqlanmagan sinov manzili", 0, "office");
    await page.getByRole("alert").filter({ hasText: /Xarita saqlanmadi/ }).waitFor();
    assert.equal(await page.locator(".map-route-list li").count(), 2);
    await page.reload({ waitUntil: "networkidle" });
    await page.locator(".map-route-list li").last().waitFor();
    assert.equal(
      await page.locator(".map-route-list li").count(),
      2,
      "failed persistence must not report a saved record",
    );
    assert.deepEqual(exceptions, []);
    assert.ok(apiWrites.length > 0 && apiWrites.every((call) => call.endsWith("/api/v1/continuity-map") && call.startsWith("PUT ")));
    console.log(
      JSON.stringify(
        {
          passed: true,
          artifacts,
          checks: [
            "dashboard entry",
            "explicit sample",
            "deterministic frames",
            "12fps overlay and smooth camera",
            "actual stroke coverage",
            "play/pause",
            "create/edit/reorder/delete",
            "reload persistence",
            "GeoJSON export/import review",
            "invalid import retains plan",
            "global projection and dateline clipping",
            "keyboard pins",
            "light/dark/mobile",
            "reduced motion",
            "organization isolation",
            "server save failure is explicit",
            "only the mocked map API was mutated",
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
