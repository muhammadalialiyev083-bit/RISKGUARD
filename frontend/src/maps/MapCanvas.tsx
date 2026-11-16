import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  geoContains,
  geoGraticule,
  geoInterpolate,
  geoMercator,
  geoNaturalEarth1,
  geoPath,
} from "d3-geo";
import { feature } from "topojson-client";
import type { FeatureCollection } from "geojson";
import type { GeometryCollection, Topology } from "topojson-specification";
import topologyData from "./countries-110m.json";
import { BEAT_FRAMES, clamp, ease, kinds, overlayFrame } from "./model";
import type { MapStop } from "./model";

const WIDTH = 960,
  HEIGHT = 540;
const topology = topologyData as unknown as Topology;
const countries = feature(
  topology,
  topology.objects.countries as GeometryCollection,
) as FeatureCollection;
const uzbekistan = countries.features.find(
  (country) => String(country.id) === "860",
)!;
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

export default function MapCanvas({
  stops,
  frame,
  selectedId,
  onSelect,
}: {
  stops: MapStop[];
  frame: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const clipId = "map-clip-" + useId().replace(/:/g, "");
  const svgRef = useRef<SVGSVGElement>(null);
  const [unit, setUnit] = useState(1);
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const measure = () =>
      setUnit(WIDTH / Math.max(250, svg.getBoundingClientRect().width));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(svg);
    return () => observer.disconnect();
  }, []);
  const { projection, paths, graticule, countryIds } = useMemo(() => {
    const regional = stops.every(
      (stop) =>
        stop.longitude >= 50 &&
        stop.longitude <= 79 &&
        stop.latitude >= 32 &&
        stop.latitude <= 49,
    );
    const points = stops.map((stop) => ({
      type: "Feature" as const,
      properties: {},
      geometry: {
        type: "Point" as const,
        coordinates: [stop.longitude, stop.latitude],
      },
    }));
    const projection = regional
      ? geoMercator().fitExtent(
          [
            [60, 64],
            [WIDTH - 60, HEIGHT - 64],
          ],
          {
            type: "FeatureCollection",
            features: [uzbekistan, ...points],
          } as FeatureCollection,
        )
      : geoNaturalEarth1().fitExtent(
          [
            [35, 55],
            [WIDTH - 35, HEIGHT - 45],
          ],
          countries,
        );
    const path = geoPath(projection);
    return {
      projection,
      paths: countries.features.map((country) => ({
        id: String(country.id),
        d: path(country) || "",
      })),
      graticule:
        path(geoGraticule().step([regional ? 5 : 30, regional ? 5 : 30])()) ||
        "",
      countryIds: stops.map((stop) =>
        String(
          countries.features.find((country) =>
            geoContains(country, [stop.longitude, stop.latitude]),
          )?.id || "",
        ),
      ),
    };
  }, [stops]);
  const points = useMemo(
    () => stops.map((stop) => projection([stop.longitude, stop.latitude])!),
    [projection, stops],
  );
  const routes = useMemo(
    () =>
      stops.slice(1).map((stop, i) => {
        const interpolate = geoInterpolate(
          [stops[i].longitude, stops[i].latitude],
          [stop.longitude, stop.latitude],
        );
        const coordinates = Array.from({ length: 49 }, (_, index) =>
          interpolate(index / 48),
        );
        return {
          d: geoPath(projection)({ type: "LineString", coordinates }) || "",
          interpolate,
        };
      }),
    [stops, projection],
  );
  const f = overlayFrame(frame);
  const beat = Math.min(stops.length - 1, Math.floor(frame / BEAT_FRAMES));
  const selectedIndex = stops.findIndex((stop) => stop.id === selectedId);
  let scale = 1,
    center = [WIDTH / 2, HEIGHT / 2];
  if (selectedIndex >= 0) {
    scale = 1.65;
    center = points[selectedIndex];
  } else if (points.length) {
    const returning = frame >= stops.length * BEAT_FRAMES;
    const i = Math.max(0, beat);
    const t = ease(
      returning
        ? (frame - stops.length * BEAT_FRAMES) / 23
        : (frame % BEAT_FRAMES) / 48,
    );
    const from = returning
      ? points[points.length - 1]
      : i === 0
        ? [WIDTH / 2, HEIGHT / 2]
        : points[i - 1];
    const to = returning ? [WIDTH / 2, HEIGHT / 2] : points[i];
    center = [mix(from[0], to[0], t), mix(from[1], to[1], t)];
    scale = returning ? mix(1.35, 1, t) : i === 0 ? mix(1, 1.35, t) : 1.35;
  }
  const camera = {
    x: WIDTH / 2 - center[0] * scale,
    y: HEIGHT / 2 - center[1] * scale,
    scale,
  };
  const activeCountry =
    countryIds[selectedIndex >= 0 ? selectedIndex : Math.max(0, beat)] || "860";
  const pinState = (i: number) => {
    const t = clamp((f - i * BEAT_FRAMES) / 18);
    const settle = 1 + 2.70158 * (t - 1) ** 3 + 1.70158 * (t - 1) ** 2;
    return {
      opacity: t === 0 ? 0 : Math.min(1, t * 2),
      drop: -30 * (1 - settle),
      label: clamp((f - i * BEAT_FRAMES - 12) / 12),
    };
  };
  return (
    <svg
      ref={svgRef}
      className="continuity-map"
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      role="group"
      aria-label="Manzillar va tiklanish yo‘nalishi xaritasi"
      data-frame={frame}
      data-overlay-frame={f}
    >
      <title>Hududiy tiklanish xaritasi</title>
      <desc>
        Belgilarni yoki manzillar ro‘yxatini tanlab yaqinlashtiring. Yo‘nalish
        ro‘yxat tartibida chiziladi.
      </desc>
      <defs>
        <clipPath id={clipId}>
          <rect width={WIDTH} height={HEIGHT} rx="8" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>
        <rect className="map-water" width={WIDTH} height={HEIGHT} />
        <g
          transform={`translate(${camera.x} ${camera.y}) scale(${camera.scale})`}
          data-map-camera="true"
        >
          {paths.map((country) => (
            <path
              key={country.id}
              d={country.d}
              className={`map-country ${country.id === activeCountry ? "map-country-active" : ""}`}
              vectorEffect="non-scaling-stroke"
            />
          ))}
          <path
            className="map-graticule"
            d={graticule}
            fill="none"
            vectorEffect="non-scaling-stroke"
          />
          {routes.map((route, i) => {
            const progress = clamp((f - (i + 1) * BEAT_FRAMES) / 48);
            const leader = projection(route.interpolate(progress))!;
            return (
              <g key={stops[i + 1].id}>
                <path
                  d={route.d}
                  className="map-route-guide"
                  fill="none"
                  vectorEffect="non-scaling-stroke"
                />
                <path
                  d={route.d}
                  className="map-route"
                  fill="none"
                  pathLength={1}
                  strokeDasharray={1}
                  strokeDashoffset={1 - progress}
                  opacity={progress > 0 ? 1 : 0}
                  style={{ strokeWidth: (2.5 * unit) / scale }}
                  data-route-progress={progress}
                />
                {progress > 0 && progress < 1 && (
                  <circle
                    cx={leader[0]}
                    cy={leader[1]}
                    r={(4 * unit) / scale}
                    className="map-route-leader"
                  />
                )}
              </g>
            );
          })}
          {stops.map((stop, i) => {
            const pin = pinState(i);
            return (
              <g
                key={stop.id}
                transform={`translate(${points[i][0]} ${points[i][1]}) scale(${unit / scale})`}
                opacity={pin.opacity}
                className={`map-pin map-pin-${stop.kind} ${selectedId === stop.id ? "is-selected" : ""}`}
                role="button"
                tabIndex={pin.opacity ? 0 : -1}
                aria-label={`${kinds[stop.kind]}: ${stop.name}`}
                onClick={() => onSelect(stop.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelect(stop.id);
                  }
                }}
              >
                <title>
                  {stop.name} · {stop.latitude.toFixed(4)},{" "}
                  {stop.longitude.toFixed(4)}
                </title>
                <circle className="map-pin-target" r="20" />
                <circle className="map-pin-halo" r="15" cy={pin.drop} />
                {stop.kind === "backup" ? (
                  <rect
                    className="map-pin-core"
                    x="-6"
                    y={pin.drop - 6}
                    width="12"
                    height="12"
                    rx="1"
                    transform={`rotate(45 0 ${pin.drop})`}
                  />
                ) : (
                  <circle
                    className="map-pin-core"
                    r={stop.kind === "partner" ? 5 : 7}
                    cy={pin.drop}
                  />
                )}
                <circle className="map-pin-center" r="2" cy={pin.drop} />
              </g>
            );
          })}
        </g>
        {stops.map((stop, i) => {
          const pin = pinState(i);
          const x = points[i][0] * scale + camera.x;
          const y = points[i][1] * scale + camera.y + (pin.drop - 25) * unit;
          if (unit > 1.8 && i !== (selectedIndex >= 0 ? selectedIndex : beat))
            return null;
          if (
            x < 25 * unit ||
            x > WIDTH - 25 * unit ||
            y < 18 * unit ||
            y > HEIGHT - 22 * unit
          )
            return null;
          const label =
            stop.name.length > 23 ? stop.name.slice(0, 21) + "…" : stop.name;
          const labelX = clamp(x, 105 * unit, WIDTH - 105 * unit);
          return (
            <g
              key={stop.id}
              className="map-city-label"
              opacity={pin.label}
              transform={`translate(${labelX} ${y}) scale(${unit})`}
            >
              <rect
                x={-Math.min(100, label.length * 3.8 + 14)}
                y="-19"
                width={Math.min(200, label.length * 7.6 + 28)}
                height="29"
                rx="5"
              />
              <text textAnchor="middle" y="0">
                {label}
              </text>
            </g>
          );
        })}
      </g>
    </svg>
  );
}
