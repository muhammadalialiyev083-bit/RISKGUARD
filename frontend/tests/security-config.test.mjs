import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const headers = readFileSync(new URL("../public/_headers", import.meta.url), "utf8");

test("Netlify security and immutable asset headers are present", () => {
  for (const directive of [
    "Content-Security-Policy:",
    "frame-ancestors 'none'",
    "X-Content-Type-Options: nosniff",
    "Referrer-Policy: same-origin",
    "Permissions-Policy:",
    "Cache-Control: public, max-age=31536000, immutable",
  ]) {
    assert.ok(headers.includes(directive), `missing ${directive}`);
  }
});
