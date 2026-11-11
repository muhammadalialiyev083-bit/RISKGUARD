const assert = require("node:assert/strict");
const { chromium } = require("playwright");
const fs = require("node:fs");
const base = process.env.E2E_BASE_URL || "http://127.0.0.1:5173";
const username = process.env.E2E_USERNAME;
const password = process.env.E2E_PASSWORD;
if (!username || !password)
  throw new Error(
    "Set E2E_USERNAME and E2E_PASSWORD for an isolated test account.",
  );
(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    headless: true,
    args: ["--no-sandbox"],
  });
  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    const errors = [];
    const serverErrors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("response", (r) => {
      if (r.status() >= 500) serverErrors.push(`${r.status()} ${r.url()}`);
    });
    await page.goto(base + "/plans");
    await page
      .getByRole("heading", { name: "Hisobingizga kirish", exact: true })
      .waitFor();
    assert.equal(await page.locator(".sidebar").count(), 0);
    await page.getByLabel("Login", { exact: true }).fill(username);
    await page.getByLabel("Parol", { exact: true }).fill("wrong-password");
    await page
      .getByRole("button", { name: "Tizimga kirish", exact: true })
      .click();
    await page
      .getByRole("alert")
      .filter({ hasText: /noto.g.ri/ })
      .waitFor();
    await page
      .getByRole("button", { name: "Parolni ko‘rsatish", exact: true })
      .click();
    assert.equal(
      await page.getByLabel("Parol", { exact: true }).getAttribute("type"),
      "text",
    );
    await page
      .getByRole("button", { name: "Parolni yashirish", exact: true })
      .click();
    await page.getByLabel("Parol", { exact: true }).fill(password);
    await page
      .getByRole("button", { name: "Tizimga kirish", exact: true })
      .click();
    await page.locator(".stat-card").first().waitFor();
    await page.reload();
    await page.locator(".stat-card").first().waitFor();
    assert.equal(await page.locator(".logo-slot img").count(), 0);
    assert.equal(
      await page
        .getByRole("combobox")
        .filter({ hasText: /Muhammadali.*ADMIN/ })
        .count(),
      0,
    );
    const before = await page.locator("html").getAttribute("data-theme");
    await page
      .getByRole("button", { name: "Temani almashtirish", exact: true })
      .click();
    assert.notEqual(
      await page.locator("html").getAttribute("data-theme"),
      before,
    );
    await page.keyboard.press("/");
    assert.equal(
      await page
        .getByLabel("Platforma bo‘ylab qidirish")
        .evaluate((el) => el === document.activeElement),
      true,
    );
    await page.keyboard.press("Escape");
    const output = process.env.E2E_ARTIFACT_DIR || "/tmp/uzhi-e2e";
    fs.mkdirSync(output, { recursive: true });
    await page.screenshot({
      path: output + "/dashboard-desktop.png",
      fullPage: true,
    });
    await page.setViewportSize({ width: 390, height: 844 });
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
      "mobile document overflow",
    );
    await page
      .getByRole("button", { name: "Menyuni ochish", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Profil va xavfsizlik", exact: true })
      .first()
      .click();
    await page
      .getByRole("heading", { name: "Shaxsiy sozlamalar", exact: true })
      .waitFor();
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
      "mobile settings overflow",
    );
    await page.screenshot({
      path: output + "/account-mobile.png",
      fullPage: true,
    });
    await page
      .getByRole("button", { name: "Tizimdan chiqish", exact: true })
      .click();
    await page
      .getByRole("heading", { name: "Hisobingizga kirish", exact: true })
      .waitFor();
    assert.equal(
      (await context.request.get(base + "/api/v1/auth/me")).status(),
      403,
    );
    await page.getByLabel("Login", { exact: true }).fill(username);
    await page.getByLabel("Parol", { exact: true }).fill(password);
    await page
      .getByRole("button", { name: "Tizimga kirish", exact: true })
      .click();
    await page.locator(".stat-card").first().waitFor();
    await page
      .getByRole("button", { name: "Tizimdan chiqish", exact: true })
      .click();
    await page
      .getByRole("heading", { name: "Hisobingizga kirish", exact: true })
      .waitFor();
    await page.goto(base + "/auth/google/result?status=approval_required");
    await page
      .getByRole("alert")
      .filter({ hasText: /Google hisobi UzHi hisobiga bog‘lanmagan/ })
      .waitFor();
    await page.goto(base + "/auth/reset#uid=bad&token=expired");
    await page
      .getByLabel("Parol", { exact: true })
      .fill("StrongTestPassword2026!");
    await page
      .getByLabel("Parolni tasdiqlang", { exact: true })
      .fill("StrongTestPassword2026!");
    await page
      .getByRole("button", { name: "Parolni saqlash", exact: true })
      .click();
    await page
      .getByRole("alert")
      .filter({ hasText: /Havola/ })
      .waitFor();
    assert.deepEqual(errors, [], "uncaught browser errors");
    assert.deepEqual(serverErrors, [], "unexpected server failures");
    console.log(
      "PASS auth browser: protected URL, invalid password, show/hide, login, refresh, blank logo, theme, keyboard search, mobile navigation/settings, logout/relogin, Google result, expired reset; no page errors or HTTP 5xx",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
