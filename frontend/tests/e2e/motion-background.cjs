const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const { chromium } = require("playwright");
const base = process.env.EXPERIENCE_BASE_URL || "http://127.0.0.1:5207";
const artifacts =
  process.env.EXPERIENCE_ARTIFACT_DIR || "/tmp/uzhi-motion-test";
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
      viewport: { width: 1280, height: 900 },
    });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.route("**/api/v1/**", async (route) => {
      assert.equal(route.request().method(), "GET");
      const url = new URL(route.request().url());
      let data = { results: [], count: 0, next: null, previous: null };
      if (url.pathname.endsWith("/auth/me"))
        data = {
          id: 91,
          username: "motion-test",
          first_name: "Sinov",
          role: "ADMIN",
          organization: 1,
          organization_detail: {
            id: 1,
            name: "Sinov tashkiloti",
            sector: "Bank",
          },
          preferences: { notifications: false },
        };
      if (url.pathname.endsWith("/reports/organization"))
        data = {
          organization: "Sinov tashkiloti",
          summary: Object.fromEntries(
            [
              "total_processes",
              "critical_processes",
              "total_assets",
              "total_risks",
              "high_risks_count",
              "unplanned_processes_count",
              "rpo_gap_count",
              "approved_bias_count",
              "published_plans_count",
              "completed_exercises_count",
            ].map((k) => [k, 0]),
          ),
          process_ids: [],
        };
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(data),
      });
    });
    for (const time of [0, 10, 20]) {
      await page.goto(base + "/dashboard?motion_t=" + time, {
        waitUntil: "networkidle",
      });
      await page.waitForFunction((time) => {
        const video = document.querySelector(".motion-background video");
        return (
          video?.readyState >= 2 &&
          Math.abs(video.currentTime - (time % video.duration)) < 0.05 &&
          video.paused
        );
      }, time);
      await page.evaluate(async () => {
        await document.fonts.ready;
        for (const animation of document
          .querySelector(".main-content")
          .getAnimations())
          animation.finish();
        await new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve)),
        );
      });
      await page.screenshot({
        path: path.join(artifacts, `video-frozen-${time}.png`),
      });
    }
    let inspectingStandalone = true;
    const externalResources = [];
    page.on("request", request => {
      if (inspectingStandalone && ["script", "stylesheet", "image", "font", "fetch", "xhr"].includes(request.resourceType()) && !request.url().startsWith("data:")) externalResources.push(request.url());
    });
    const samples = [];
    for (const time of [0, 12, 24]) {
      await page.goto(base + "/motion-background-preview.html?t=" + time, {
        waitUntil: "networkidle",
      });
      await page.waitForFunction(() => window.__ready === true);
      assert.equal(
        await page
          .locator(".ambient")
          .evaluate((el) => getComputedStyle(el).animationPlayState),
        "paused",
      );
      samples.push(
        await page.screenshot({
          path: path.join(artifacts, `mesh-frozen-${time}.png`),
        }),
      );
    }
    inspectingStandalone = false;
    assert.deepEqual(externalResources, [], "standalone HTML must not need external assets");
    assert.ok(
      samples[0].equals(samples[2]),
      "the CSS loop must have identical start/end frames",
    );
    assert.ok(
      !samples[0].equals(samples[1]),
      "the middle of the loop must move",
    );
    await page.route("**/media/uzhi-dashboard-loop.mp4", (route) =>
      route.abort(),
    );
    await page.goto(base + "/dashboard", { waitUntil: "networkidle" });
    await page.locator('.motion-background[data-driver="mesh"]').waitFor();
    assert.equal(
      await page
        .locator(".motion-background video")
        .evaluate((video) => video.paused),
      true,
    );
    await page
      .getByRole("button", { name: "Fon harakatini to‘xtatish", exact: true })
      .click();
    assert.equal(
      await page
        .locator(".motion-mesh")
        .evaluate((el) => getComputedStyle(el).animationPlayState),
      "paused",
    );
    await page.screenshot({
      path: path.join(artifacts, "video-unavailable-fallback.png"),
    });
    assert.deepEqual(errors, []);
    console.log(
      JSON.stringify(
        {
          passed: true,
          artifacts,
          checks: [
            "native video freeze 0/10/20 seconds",
            "self-contained CSS preview",
            "identical loop seam",
            "changed mid-loop",
            "media error fallback",
            "pause control still works without the video",
            "no browser exceptions",
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
