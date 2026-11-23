import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";

const headers = readFileSync(new URL("../public/_headers", import.meta.url), "utf8");
const effectTemplate = readFileSync(
  new URL("../src/experience/effect.template.html", import.meta.url),
  "utf8",
);
const effectScript = effectTemplate.match(/<script>([\s\S]*?)<\/script>/)?.[1];

test("Netlify security and immutable asset headers are present", () => {
  assert.ok(effectScript, "effect template must contain its CSP-protected script");
  const effectHash = createHash("sha256").update(effectScript).digest("base64");
  for (const directive of [
    "Content-Security-Policy:",
    `script-src 'self' 'sha256-${effectHash}'`,
    "font-src 'self' data:",
    "frame-ancestors 'self'",
    "X-Frame-Options: SAMEORIGIN",
    "X-Content-Type-Options: nosniff",
    "Referrer-Policy: same-origin",
    "Permissions-Policy:",
    "Cache-Control: public, max-age=31536000, immutable",
  ]) {
    assert.ok(headers.includes(directive), `missing ${directive}`);
  }
});
