import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";
const source = readFileSync(
  new URL("../src/experience/workflow.ts", import.meta.url),
  "utf8",
);
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.ESNext,
  },
}).outputText;
const { guides, startingSteps, distribution } = await import(
  `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`
);
const user = {
  organization: 1,
  organization_detail: { name: "Tashkilot", sector: "" },
};

test("the first task uses the fresh organization record and unfiltered workspace records", () => {
  const data = {
    organizations: [{ id: 1, name: "Yangi nom", sector: "Bank" }],
    services: [{ id: 1 }],
    processes: [],
    exercises: [{ id: 1 }],
  };
  const steps = startingSteps(
    data,
    { summary: { completed_exercises_count: 0 } },
    user,
  );
  assert.equal(steps[0].complete, true);
  assert.equal(
    steps.find((step) => !step.complete).target,
    "processes?action=create",
  );
  assert.equal(
    steps.at(-1).complete,
    true,
    "a dashboard filter must not erase an existing exercise from setup progress",
  );
});

test("draft assessments and plans do not become completed setup steps", () => {
  const steps = startingSteps(
    { bia: [{ status: "DRAFT" }], plans: [{ status: "APPROVED" }] },
    null,
    user,
  );
  assert.equal(steps[4].complete, false);
  assert.equal(steps[6].complete, false);
  const approved = startingSteps(
    { bia: [{ status: "APPROVED" }], plans: [{ status: "PUBLISHED" }] },
    null,
    user,
  );
  assert.equal(approved[4].complete, true);
  assert.equal(approved[6].complete, true);
});

test("another organization cannot complete the current organization setup indicator", () => {
  const steps = startingSteps(
    { organizations: [{ id: 2, name: "Boshqa", sector: "Bank" }] },
    null,
    user,
  );
  assert.equal(steps[0].complete, false);
});

test("risk distributions preserve the domain formula and retain invalid data as unavailable", () => {
  const rows = [
    { likelihood: 2, impact: 3 },
    { likelihood: 2, impact: 4 },
    { likelihood: 3, impact: 5 },
    { likelihood: null, impact: 5 },
    { likelihood: 6, impact: 5 },
  ];
  const counts = Object.fromEntries(
    distribution(rows, "risk_class").map((item) => [item.label, item.value]),
  );
  assert.deepEqual(counts, {
    Belgilanmagan: 2,
    Past: 1,
    "O‘rta": 1,
    Yuqori: 1,
  });
});

test("all section guide links resolve to supported application modules", () => {
  const allowed = new Set(["dashboard", ...Object.keys(guides)]);
  for (const guide of Object.values(guides)) {
    assert.ok(allowed.has(guide.previous));
    assert.ok(allowed.has(guide.next));
    for (const step of guide.steps)
      assert.ok(allowed.has(step.target.split("?")[0]), step.target);
  }
  assert.deepEqual(distribution([], "status"), []);
});
