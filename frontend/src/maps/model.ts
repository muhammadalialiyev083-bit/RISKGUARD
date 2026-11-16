export const FPS = 24;
export const GRAPHIC_FPS = 12;
export const BEAT_FRAMES = FPS * 3;
export const MAX_STOPS = 20;
export const MAX_IMPORT_BYTES = 128 * 1024;

export const kinds = {
  office: "Asosiy manzil",
  backup: "Zaxira manzil",
  partner: "Hamkor manzili",
} as const;
export type StopKind = keyof typeof kinds;
export type MapStop = {
  id: string;
  name: string;
  kind: StopKind;
  longitude: number;
  latitude: number;
};
export type MapPlan = { version: 1; stops: MapStop[] };

// Approximate city centres, not the addresses of any real organization.
export const cities = [
  { name: "Toshkent", longitude: 69.2401, latitude: 41.2995 },
  { name: "Samarqand", longitude: 66.9597, latitude: 39.6542 },
  { name: "Buxoro", longitude: 64.4286, latitude: 39.7747 },
  { name: "Nukus", longitude: 59.6103, latitude: 42.4619 },
  { name: "Urganch", longitude: 60.6312, latitude: 41.55 },
  { name: "Navoiy", longitude: 65.3792, latitude: 40.0844 },
  { name: "Qarshi", longitude: 65.7924, latitude: 38.861 },
  { name: "Termiz", longitude: 67.2783, latitude: 37.2242 },
  { name: "Jizzax", longitude: 67.8429, latitude: 40.1158 },
  { name: "Guliston", longitude: 68.7842, latitude: 40.4897 },
  { name: "Namangan", longitude: 71.6726, latitude: 40.9983 },
  { name: "Farg‘ona", longitude: 71.7871, latitude: 40.3894 },
  { name: "Andijon", longitude: 72.3442, latitude: 40.7821 },
];
export const demoStops: MapStop[] = cities.slice(0, 3).map((city, i) => ({
  ...city,
  id: `demo-${i}`,
  kind: i === 0 ? "office" : i === 1 ? "backup" : "partner",
}));

export const storageKey = (organization: number | null, userId: number) =>
  `uzhi-map-v1:${organization ?? "none"}:${userId}`;
export const durationFrames = (count: number) =>
  Math.max(1, count) * BEAT_FRAMES + FPS;
export const overlayFrame = (frame: number) => {
  const step = Math.max(1, Math.round(FPS / GRAPHIC_FPS));
  return Math.floor(frame / step) * step;
};
export const clamp = (value: number, min = 0, max = 1) =>
  Math.max(min, Math.min(max, value));
export const ease = (value: number) => {
  const t = clamp(value);
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};

function invalid(message: string): never {
  throw new Error(message);
}
export function validateStop(value: unknown): MapStop {
  if (!value || typeof value !== "object")
    return invalid("Manzil formati noto‘g‘ri.");
  const stop = value as Record<string, unknown>;
  if (typeof stop.id !== "string" || !stop.id || stop.id.length > 80)
    return invalid("Manzil identifikatori noto‘g‘ri.");
  if (
    typeof stop.name !== "string" ||
    !stop.name.trim() ||
    stop.name.trim().length > 60
  )
    return invalid("Manzil nomi 1–60 ta belgidan iborat bo‘lsin.");
  if (
    typeof stop.kind !== "string" ||
    !Object.prototype.hasOwnProperty.call(kinds, stop.kind)
  )
    return invalid("Manzil turini tanlang.");
  if (
    typeof stop.longitude !== "number" ||
    !Number.isFinite(stop.longitude) ||
    Math.abs(stop.longitude) > 180
  )
    return invalid("Uzunlik −180 va 180 oralig‘ida bo‘lsin.");
  if (
    typeof stop.latitude !== "number" ||
    !Number.isFinite(stop.latitude) ||
    Math.abs(stop.latitude) > 85
  )
    return invalid("Kenglik −85 va 85 oralig‘ida bo‘lsin.");
  return {
    id: stop.id,
    name: stop.name.trim(),
    kind: stop.kind as StopKind,
    longitude: stop.longitude,
    latitude: stop.latitude,
  };
}

export function parsePlan(value: unknown): MapPlan {
  if (!value || typeof value !== "object")
    return invalid("Xarita rejasi formati noto‘g‘ri.");
  const plan = value as Record<string, unknown>;
  if (
    plan.version !== 1 ||
    !Array.isArray(plan.stops) ||
    plan.stops.length > MAX_STOPS
  )
    return invalid(
      `Reja 1-versiyada va ko‘pi bilan ${MAX_STOPS} ta manzildan iborat bo‘lsin.`,
    );
  const stops = plan.stops.map(validateStop);
  if (new Set(stops.map((stop) => stop.id)).size !== stops.length)
    return invalid("Rejada takroriy manzil identifikatorlari bor.");
  return { version: 1, stops };
}

export function toGeoJSON(plan: MapPlan) {
  return {
    type: "FeatureCollection",
    uzhiMapVersion: 1,
    features: plan.stops.map((stop, order) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [stop.longitude, stop.latitude] },
      properties: {
        id: stop.id,
        name: stop.name,
        kind: stop.kind,
        order: order + 1,
      },
    })),
  };
}

export function fromGeoJSON(value: unknown): MapPlan {
  if (!value || typeof value !== "object")
    return invalid("GeoJSON fayli noto‘g‘ri.");
  const collection = value as Record<string, any>;
  if (
    collection.type !== "FeatureCollection" ||
    collection.uzhiMapVersion !== 1 ||
    !Array.isArray(collection.features)
  )
    return invalid(
      "UzHi’dan yuklab olingan 1-versiyadagi GeoJSON rejasini tanlang.",
    );
  if (collection.features.length > MAX_STOPS)
    return invalid(`Ko‘pi bilan ${MAX_STOPS} ta manzil yuklash mumkin.`);
  return parsePlan({
    version: 1,
    stops: collection.features.map((feature: any) => {
      if (
        feature?.type !== "Feature" ||
        feature.geometry?.type !== "Point" ||
        !Array.isArray(feature.geometry.coordinates) ||
        feature.geometry.coordinates.length !== 2
      )
        return invalid(
          "GeoJSON faqat ikkita koordinatali Point manzillaridan iborat bo‘lsin.",
        );
      return {
        id: feature.properties?.id,
        name: feature.properties?.name,
        kind: feature.properties?.kind,
        longitude: feature.geometry.coordinates[0],
        latitude: feature.geometry.coordinates[1],
      };
    }),
  });
}

export function routeDistance(stops: MapStop[]): number {
  const radians = (value: number) => (value * Math.PI) / 180;
  return stops.slice(1).reduce((total, stop, i) => {
    const from = stops[i];
    const a =
      Math.sin(radians(stop.latitude - from.latitude) / 2) ** 2 +
      Math.cos(radians(from.latitude)) *
        Math.cos(radians(stop.latitude)) *
        Math.sin(radians(stop.longitude - from.longitude) / 2) ** 2;
    return (
      total +
      6371.0088 * 2 * Math.atan2(Math.sqrt(clamp(a)), Math.sqrt(1 - clamp(a)))
    );
  }, 0);
}
