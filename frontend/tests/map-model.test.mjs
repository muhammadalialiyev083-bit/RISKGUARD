import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

const source = readFileSync(
  new URL("../src/maps/model.ts", import.meta.url),
  "utf8",
);
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.ESNext,
  },
}).outputText;
const model = await import(
  `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`
);
const stop = {
  id: "office-1",
  name: "Bosh ofis",
  kind: "office",
  latitude: 41.2995,
  longitude: 69.2401,
};

test("GeoJSON round trip preserves coordinate order, stop order, names and kinds", () => {
  const plan = {
    version: 1,
    stops: [
      stop,
      {
        ...stop,
        id: "backup-1",
        name: "Zaxira",
        kind: "backup",
        longitude: 66.9597,
        latitude: 39.6542,
      },
    ],
  };
  const exported = model.toGeoJSON(plan);
  assert.deepEqual(
    exported.features[0].geometry.coordinates,
    [69.2401, 41.2995],
  );
  assert.deepEqual(
    model.fromGeoJSON(JSON.parse(JSON.stringify(exported))),
    plan,
  );
});

test("coordinates and kinds from imported data must be finite numbers and known own properties", () => {
  for (const override of [
    { longitude: 181 },
    { longitude: Infinity },
    { latitude: -86 },
    { latitude: NaN },
    { longitude: "69.24" },
    { latitude: true },
    { kind: "toString" },
    { kind: "__proto__" },
    { name: " " },
    { name: "x".repeat(61) },
    { id: "" },
  ])
    assert.throws(() => model.validateStop({ ...stop, ...override }));
  assert.equal(
    model.validateStop({ ...stop, longitude: -179, latitude: -80 }).longitude,
    -179,
  );
});

test("oversized, duplicate and incompatible plans cannot replace an existing plan", () => {
  assert.throws(() => model.parsePlan({ version: 2, stops: [stop] }));
  assert.throws(() => model.parsePlan({ version: 1, stops: [stop, stop] }));
  assert.throws(() =>
    model.parsePlan({
      version: 1,
      stops: Array.from({ length: 21 }, (_, i) => ({ ...stop, id: String(i) })),
    }),
  );
  assert.deepEqual(model.parsePlan({ version: 1, stops: [] }), {
    version: 1,
    stops: [],
  });
});

test("GeoJSON imports reject line geometries, extra dimensions, missing properties and other schemas", () => {
  const exported = model.toGeoJSON({ version: 1, stops: [stop] });
  for (const mutate of [
    (data) => {
      data.features[0].geometry.type = "LineString";
    },
    (data) => {
      data.features[0].geometry.coordinates.push(500);
    },
    (data) => {
      delete data.features[0].properties.name;
    },
    (data) => {
      delete data.uzhiMapVersion;
    },
    (data) => {
      data.features = null;
    },
  ]) {
    const data = structuredClone(exported);
    mutate(data);
    assert.throws(() => model.fromGeoJSON(data));
  }
});

test("plans are scoped to both user and organization in browser storage", () => {
  assert.notEqual(model.storageKey(1, 1), model.storageKey(1, 2));
  assert.notEqual(model.storageKey(1, 1), model.storageKey(2, 1));
  assert.notEqual(model.storageKey(null, 1), model.storageKey(1, 1));
});

test("distance is a geographic great-circle estimate, including dateline crossings", () => {
  assert.equal(model.routeDistance([stop]), 0);
  assert.equal(model.routeDistance([stop, stop]), 0);
  const distance = model.routeDistance([
    stop,
    { ...stop, longitude: 66.9597, latitude: 39.6542 },
  ]);
  assert.ok(distance > 260 && distance < 280);
  const crossing = model.routeDistance([
    { ...stop, longitude: 179, latitude: 0 },
    { ...stop, longitude: -179, latitude: 0 },
  ]);
  assert.ok(
    crossing > 220 && crossing < 225,
    "route should take the short path across the antimeridian",
  );
});

test("adjacent 24fps frames hold overlay geometry for two frames while the timeline remains seekable", () => {
  assert.equal(model.overlayFrame(96), model.overlayFrame(97));
  assert.notEqual(model.overlayFrame(97), model.overlayFrame(98));
  assert.ok(model.durationFrames(4) > model.durationFrames(3));
  assert.ok(Number.isFinite(model.durationFrames(0)));
});
