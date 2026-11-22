import { api } from "../api/client";
import { useEffect, useRef, useState } from "react";
import { UzHiIcon } from "../components/icons/UzHiIcons";
import MapCanvas from "./MapCanvas";
import { SectionGuide } from "../experience/SectionGuide";
import {
  cities,
  demoStops,
  durationFrames,
  FPS,
  fromGeoJSON,
  kinds,
  MAX_IMPORT_BYTES,
  MAX_STOPS,
  parsePlan,
  routeDistance,
  storageKey,
  toGeoJSON,
  validateStop,
} from "./model";
import type { MapLink, MapPlan, MapStop, StopKind } from "./model";
import "./map.css";

function readPlan(key: string): { plan: MapPlan; error: string } {
  try {
    const raw = localStorage.getItem(key);
    return {
      plan: raw ? parsePlan(JSON.parse(raw)) : { version: 1, stops: [] },
      error: "",
    };
  } catch {
    return {
      plan: { version: 1, stops: [] },
      error:
        "Oldingi xarita rejasini o‘qib bo‘lmadi. Saqlangan nusxangizni GeoJSON orqali yuklang yoki yangi reja tuzing.",
    };
  }
}
const emptyDraft = () => ({
  name: "",
  kind: "office" as StopKind,
  longitude: "69.2401",
  latitude: "41.2995",
  city: "0",
  linkResource: "" as MapLink["resource"] | "",
  linkId: "",
});

export default function ContinuityMapPage({
  user,
  onNavigate,
}: {
  user: {
    id: number;
    organization: number | null;
    role: string;
    is_superuser?: boolean;
  };
  onNavigate?: (target: string) => void;
}) {
  const key = storageKey(user.organization, user.id);
  const [initial] = useState(() => readPlan(key));
  const [plan, setPlan] = useState<MapPlan>({ version: 1, stops: [] });
  const [revision, setRevision] = useState<number | null>(null);
  const [reload, setReload] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [mode, setMode] = useState<"demo" | "plan">("demo");
  const [linkOptions, setLinkOptions] = useState<
    { id: number; name?: string; title?: string }[]
  >([]);
  const [linkError, setLinkError] = useState("");
  const writable =
    user.is_superuser || ["ADMIN", "BCMS_MANAGER"].includes(user.role);
  const canSave = writable && revision !== null && !saving;
  const [candidate, setCandidate] = useState<MapPlan | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState(emptyDraft);
  const stops = mode === "demo" ? demoStops : plan.stops;
  const duration = durationFrames(stops.length);
  const [frame, setFrame] = useState(duration - 1);
  const frameRef = useRef(frame);
  const [playing, setPlaying] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const nameInput = useRef<HTMLInputElement>(null);
  const uploadInput = useRef<HTMLInputElement>(null);

  function seek(next: number) {
    frameRef.current = next;
    setFrame(next);
  }
  useEffect(() => {
    setPlaying(false);
    setPicking(false);
    setSelectedId(null);
    seek(durationFrames(stops.length) - 1);
  }, [stops]);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      setReducedMotion(query.matches);
      if (query.matches) {
        setPlaying(false);
        seek(duration - 1);
      }
    };
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, [duration]);
  useEffect(() => {
    if (!playing || reducedMotion) return;
    let request = 0,
      start: number | null = null;
    const from = frameRef.current;
    const advance = (timestamp: number) => {
      if (start === null) start = timestamp;
      const next = Math.min(
        duration - 1,
        from + Math.floor(((timestamp - start) * FPS) / 1000),
      );
      seek(next);
      if (next < duration - 1) request = requestAnimationFrame(advance);
      else setPlaying(false);
    };
    request = requestAnimationFrame(advance);
    return () => cancelAnimationFrame(request);
  }, [playing, reducedMotion, duration]);
  useEffect(() => {
    let active = true;
    setRevision(null);
    api
      .get("/continuity-map")
      .then((data) => {
        const next = parsePlan(data);
        if (!active) return;
        setPlan(next);
        setRevision(data.revision);
        if (next.stops.length) setMode("plan");
        setError("");
      })
      .catch((failure) => {
        if (active) setError(failure.message);
      });
    return () => {
      active = false;
    };
  }, [key, reload]);
  useEffect(() => {
    let active = true;
    setLinkOptions([]);
    setLinkError("");
    async function loadLinks(resource: string) {
      const rows = [];
      for (let page = 1; ; page++) {
        const result = await api.list(resource, { page });
        rows.push(...result.results);
        if (!result.next || !active) break;
      }
      if (active) setLinkOptions(rows);
    }
    if (draft.linkResource)
      loadLinks(draft.linkResource).catch((failure) => {
        if (active) setLinkError(failure.message);
      });
    return () => {
      active = false;
    };
  }, [draft.linkResource]);

  async function commit(stops: MapStop[], message: string) {
    if (!canSave) return false;
    setSaving(true);
    setError("");
    try {
      const next = parsePlan({ version: 1, stops });
      const saved = await api.put("/continuity-map", { ...next, revision });
      setPlan(parsePlan(saved));
      setRevision(saved.revision);
      setMode("plan");
      setNotice(message);
      return true;
    } catch (failure) {
      setError((failure as Error).message);
      return false;
    } finally {
      setSaving(false);
    }
  }
  function focusStop(id: string) {
    setPlaying(false);
    seek(duration - 1);
    setSelectedId(id);
  }
  function start() {
    setSelectedId(null);
    if (frameRef.current >= duration - 1) seek(0);
    setPlaying(true);
  }
  function resetDraft() {
    setEditing(null);
    setDraft(emptyDraft());
  }
  function edit(stop: MapStop) {
    const city = cities.findIndex(
      (city) =>
        city.longitude === stop.longitude && city.latitude === stop.latitude,
    );
    setEditing(stop.id);
    setDraft({
      name: stop.name,
      kind: stop.kind,
      longitude: String(stop.longitude),
      latitude: String(stop.latitude),
      city: city < 0 ? "custom" : String(city),
      linkResource: stop.link?.resource || "",
      linkId: String(stop.link?.id || ""),
    });
    nameInput.current?.focus();
  }
  function move(index: number, direction: number) {
    const next = [...plan.stops];
    [next[index], next[index + direction]] = [
      next[index + direction],
      next[index],
    ];
    commit(next, "Yo‘nalish tartibi saqlandi.");
  }
  function download() {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(toGeoJSON(plan), null, 2)], {
        type: "application/geo+json",
      }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "UzHi-hududiy-reja.geojson";
    link.click();
    requestAnimationFrame(() => URL.revokeObjectURL(url));
  }

  return (
    <section className="map-page">
      <header className="map-page-heading">
        <div>
          <h1>Hududiy tiklanish xaritasi</h1>
        </div>
        <div className="map-file-actions">
          <button
            className="btn btn-primary"
            disabled={!canSave}
            onClick={() => nameInput.current?.focus()}
          >
            <UzHiIcon name="plus" size={16} /> Manzil qo‘shish
          </button>
          <button
            className="btn"
            disabled={!canSave}
            onClick={() => uploadInput.current?.click()}
          >
            <UzHiIcon name="upload" size={16} /> Rejani yuklash
          </button>
          <button
            className="btn"
            disabled={mode !== "plan" || !plan.stops.length}
            onClick={download}
          >
            <UzHiIcon name="download" size={16} /> GeoJSON nusxa
          </button>
          <input
            ref={uploadInput}
            type="file"
            className="map-file-input"
            aria-label="GeoJSON rejasini tanlash"
            accept=".geojson,.json,application/geo+json,application/json"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (!file) return;
              setError("");
              setCandidate(null);
              try {
                if (file.size > MAX_IMPORT_BYTES)
                  throw new Error("GeoJSON fayli 128 KB dan kichik bo‘lsin.");
                setCandidate(fromGeoJSON(JSON.parse(await file.text())));
              } catch (error) {
                setError(
                  error instanceof SyntaxError
                    ? "Fayl to‘g‘ri JSON formatida emas."
                    : (error as Error).message,
                );
              }
            }}
          />
        </div>
      </header>
      <SectionGuide
        module="map"
        user={user}
        onNavigate={(target) =>
          target.startsWith("map")
            ? nameInput.current?.focus()
            : onNavigate
              ? onNavigate(target)
              : window.location.assign("/" + target)
        }
        onStart={() => nameInput.current?.focus()}
      />
      {!!initial.plan.stops.length && !plan.stops.length && canSave && (
        <button className="btn" onClick={() => setCandidate(initial.plan)}>
          Shaxsiy rejani ko‘chirish
        </button>
      )}
      {error && (
        <div className="alert error" role="alert">
          {error}
          <button className="btn" onClick={() => setReload(reload + 1)}>
            Qayta yuklash
          </button>
        </div>
      )}
      {notice && (
        <div className="map-notice" role="status">
          {notice}
          <button
            className="btn btn-icon"
            aria-label="Xarita xabarini yopish"
            onClick={() => setNotice("")}
          >
            <UzHiIcon name="close" size={15} />
          </button>
        </div>
      )}
      {candidate && (
        <div
          className="panel map-import-review"
          role="region"
          aria-label="Yuklanadigan reja"
        >
          <div>
            <h2>{candidate.stops.length} ta manzilli reja tayyor</h2>
            <p className="muted">
              Yuklash tashkilot xaritasidagi manzillarni almashtiradi.
            </p>
          </div>
          <button
            className="btn btn-primary"
            disabled={!canSave}
            onClick={async () => {
              if (await commit(candidate.stops, "Xarita rejasi saqlandi.")) {
                setCandidate(null);
                resetDraft();
              }
            }}
          >
            Rejani almashtirish
          </button>
          <button className="btn" onClick={() => setCandidate(null)}>
            Bekor qilish
          </button>
        </div>
      )}
      <div className="map-workspace">
        <div className="map-main-column">
          <div className="panel map-stage">
            <div className="map-stage-header">
              <div className="map-mode-switch" aria-label="Xarita ma’lumoti">
                <button
                  className={`btn btn-small ${picking ? "btn-primary" : ""}`}
                  aria-pressed={picking}
                  onClick={() => {
                    setPlaying(false);
                    setSelectedId(null);
                    seek(duration - 1);
                    setPicking(!picking);
                  }}
                >
                  {picking
                    ? "Belgilashni bekor qilish"
                    : "Xaritadan joy tanlash"}
                </button>
                <button
                  aria-pressed={mode === "plan"}
                  onClick={() => setMode("plan")}
                >
                  Tashkilot rejasi <span>{plan.stops.length}</span>
                </button>
                <button
                  aria-pressed={mode === "demo"}
                  onClick={() => setMode("demo")}
                >
                  Namuna
                </button>
              </div>
              <button
                className="btn btn-small"
                onClick={() => {
                  setPlaying(false);
                  setSelectedId(null);
                  seek(duration - 1);
                }}
              >
                <UzHiIcon name="globe" size={15} /> Umumiy ko‘rinish
              </button>
            </div>
            {mode === "demo" && (
              <div className="map-demo-note">
                <strong>Namuna yo‘nalishi</strong> · Toshkent → Samarqand →
                Buxoro. Bu tashkilotingizning haqiqiy manzillari emas.
              </div>
            )}
            <div className="map-canvas-wrap">
              <MapCanvas
                stops={stops}
                frame={frame}
                selectedId={selectedId}
                onSelect={focusStop}
                picking={picking}
                onPick={(longitude, latitude) => {
                  setDraft({
                    ...draft,
                    longitude: longitude.toFixed(6),
                    latitude: latitude.toFixed(6),
                    city: "custom",
                  });
                  setPicking(false);
                  setNotice(
                    "Koordinatalar tanlandi. Manzil nomini kiriting va rejaga qo‘shing.",
                  );
                  nameInput.current?.focus();
                }}
              />
              {picking && (
                <div className="map-pick-note" role="status">
                  Xaritadagi kerakli nuqtani bosing.
                </div>
              )}
              {!stops.length && !picking && (
                <div className="map-empty">
                  <UzHiIcon name="pin" size={26} />
                  <h2>Birinchi manzilni belgilang</h2>
                  <p>Shaharni tanlang yoki aniq koordinatalarni kiriting.</p>
                  <button
                    className="btn btn-primary"
                    onClick={() => nameInput.current?.focus()}
                  >
                    <UzHiIcon name="plus" size={16} /> Manzil qo‘shish
                  </button>
                </div>
              )}
              <a
                className="map-scale-note"
                href="/licenses/map-notices.txt"
                target="_blank"
                rel="noopener noreferrer"
              >
                Natural Earth · umumlashtirilgan chegaralar
              </a>
            </div>
            <div className="map-playback">
              <div className="map-playback-buttons">
                <button
                  className="btn btn-primary"
                  disabled={!stops.length || reducedMotion}
                  onClick={() => (playing ? setPlaying(false) : start())}
                  aria-label={
                    playing
                      ? "Animatsiyani to‘xtatish"
                      : "Animatsiyani boshlash"
                  }
                >
                  {playing ? <UzHiIcon name="pause" size={17} /> : <UzHiIcon name="play" size={17} />}{" "}
                  {playing ? "To‘xtatish" : "Ijro etish"}
                </button>
                <button
                  className="btn btn-icon"
                  disabled={!stops.length || reducedMotion}
                  aria-label="Animatsiyani boshidan boshlash"
                  onClick={() => {
                    setSelectedId(null);
                    seek(0);
                    setPlaying(true);
                  }}
                >
                  <UzHiIcon name="restart" size={17} />
                </button>
              </div>
              <label className="map-timeline">
                <span className="sr-only">Animatsiya vaqti</span>
                <input
                  aria-label="Animatsiya kadri"
                  type="range"
                  min="0"
                  max={duration - 1}
                  step="1"
                  value={frame}
                  disabled={!stops.length}
                  onChange={(event) => {
                    setPlaying(false);
                    setSelectedId(null);
                    seek(Number(event.target.value));
                  }}
                />
                <span>
                  {(frame / FPS).toFixed(1)} /{" "}
                  {((duration - 1) / FPS).toFixed(1)} s
                </span>
              </label>
            </div>
            {reducedMotion && (
              <p className="map-motion-note">
                Qurilmangizda harakatni kamaytirish yoqilgan. Xarita statik
                ko‘rsatiladi; vaqt chizig‘ini qo‘lda boshqarishingiz mumkin.
              </p>
            )}
            <div className="map-legend">
              {Object.entries(kinds).map(([kind, label]) => (
                <span key={kind}>
                  <i className={`map-key map-key-${kind}`} aria-hidden="true" />
                  {label}
                </span>
              ))}
            </div>
          </div>
          <div className="map-summary-strip">
            <div>
              <span>
                {mode === "demo" ? "Namuna manzillari" : "Rejadagi manzillar"}
              </span>
              <strong>
                {stops.length}
                <small> ta</small>
              </strong>
            </div>
            <div>
              <span>Geografik masofa</span>
              <strong>
                {Math.round(routeDistance(stops)).toLocaleString("uz-UZ")}
                <small> km</small>
              </strong>
            </div>
            <p>Masofa havo yo‘li bo‘yicha.</p>
          </div>
          <section
            className="panel map-route-list"
            aria-labelledby="map-route-title"
          >
            <div className="map-list-heading">
              <div>
                <h2 id="map-route-title">Yo‘nalish ketma-ketligi</h2>
                <p className="muted">
                  Manzilni tanlab yaqinlashtiring.
                  {mode === "plan" &&
                    " Strelkalar bilan tartibni o‘zgartiring."}
                </p>
              </div>
              <span className="map-count">
                {mode === "demo" ? "Namuna" : "Tashkilot rejasi"}
              </span>
            </div>
            {!stops.length ? (
              <p className="muted">Rejangizda hali manzil yo‘q.</p>
            ) : (
              <ol>
                {stops.map((stop, index) => (
                  <li
                    key={stop.id}
                    className={selectedId === stop.id ? "is-selected" : ""}
                  >
                    <button
                      className="map-stop-select"
                      onClick={() => focusStop(stop.id)}
                      aria-pressed={selectedId === stop.id}
                    >
                      <span className={`map-stop-number map-key-${stop.kind}`}>
                        {index + 1}
                      </span>
                      <span>
                        <strong>{stop.name}</strong>
                        <small>
                          {kinds[stop.kind]} · {stop.latitude.toFixed(4)},{" "}
                          {stop.longitude.toFixed(4)}
                        </small>
                      </span>
                    </button>
                    {selectedId === stop.id && stop.link && (
                      <button
                        className="text-button"
                        onClick={() =>
                          onNavigate?.(
                            `${stop.link!.resource}?record=${stop.link!.id}`,
                          )
                        }
                      >
                        Bog‘langan yozuvni ochish
                      </button>
                    )}
                    {mode === "plan" && writable && (
                      <div className="map-stop-actions">
                        <button
                          className="btn btn-icon"
                          aria-label={`${stop.name}: yuqoriga`}
                          disabled={!canSave || index === 0}
                          onClick={() => move(index, -1)}
                        >
                          <UzHiIcon name="arrowUp" size={15} />
                        </button>
                        <button
                          className="btn btn-icon"
                          aria-label={`${stop.name}: pastga`}
                          disabled={!canSave || index === stops.length - 1}
                          onClick={() => move(index, 1)}
                        >
                          <UzHiIcon name="arrowDown" size={15} />
                        </button>
                        <button
                          className="btn btn-icon"
                          aria-label={`${stop.name}: tahrirlash`}
                          onClick={() => edit(stop)}
                        >
                          <UzHiIcon name="pencil" size={15} />
                        </button>
                        <button
                          className="btn btn-icon"
                          aria-label={`${stop.name}: o‘chirish`}
                          onClick={() => {
                            commit(
                              plan.stops.filter((item) => item.id !== stop.id),
                              "Manzil shaxsiy rejadan olib tashlandi.",
                            );
                            if (editing === stop.id) resetDraft();
                          }}
                        >
                          <UzHiIcon name="trash" size={15} />
                        </button>
                      </div>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
        {writable && (
          <aside
            className="panel map-editor"
            aria-labelledby="map-editor-title"
          >
            <h2 id="map-editor-title">
              {editing ? "Manzilni tahrirlash" : "Manzil qo‘shish"}
            </h2>
            <p className="muted">
              Ofis, zaxira markaz yoki hamkorning joylashuvini kiriting.
            </p>
            <form
              onSubmit={async (event) => {
                event.preventDefault();
                setError("");
                try {
                  if (!draft.latitude.trim() || !draft.longitude.trim())
                    throw new Error("Kenglik va uzunlikni kiriting.");
                  if (!editing && plan.stops.length >= MAX_STOPS)
                    throw new Error(
                      `Bir rejada ko‘pi bilan ${MAX_STOPS} ta manzil bo‘lishi mumkin.`,
                    );
                  const stop = validateStop({
                    id: editing || crypto.randomUUID(),
                    name: draft.name,
                    kind: draft.kind,
                    latitude: Number(draft.latitude),
                    longitude: Number(draft.longitude),
                    link:
                      draft.linkResource && draft.linkId
                        ? {
                            resource: draft.linkResource,
                            id: Number(draft.linkId),
                          }
                        : undefined,
                  });
                  const saved = await commit(
                    editing
                      ? plan.stops.map((item) =>
                          item.id === editing ? stop : item,
                        )
                      : [...plan.stops, stop],
                    editing
                      ? "Manzil o‘zgarishlari saqlandi."
                      : "Manzil tashkilot rejasiga qo‘shildi.",
                  );
                  if (saved) {
                    resetDraft();
                    nameInput.current?.focus();
                  }
                } catch (error) {
                  setError((error as Error).message);
                }
              }}
            >
              <label className="field">
                Manzil nomi
                <input
                  ref={nameInput}
                  required
                  maxLength={60}
                  value={draft.name}
                  placeholder="Masalan, Toshkent bosh ofisi"
                  onChange={(event) =>
                    setDraft({ ...draft, name: event.target.value })
                  }
                />
              </label>
              <label className="field">
                Manzil turi
                <select
                  aria-label="Manzil turi"
                  value={draft.kind}
                  onChange={(event) =>
                    setDraft({ ...draft, kind: event.target.value as StopKind })
                  }
                >
                  {Object.entries(kinds).map(([kind, label]) => (
                    <option key={kind} value={kind}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                Shahar markazi
                <select
                  aria-label="Shahar markazi"
                  value={draft.city}
                  onChange={(event) => {
                    const value = event.target.value;
                    if (value === "custom")
                      return setDraft({ ...draft, city: value });
                    const city = cities[Number(value)];
                    setDraft({
                      ...draft,
                      city: value,
                      longitude: String(city.longitude),
                      latitude: String(city.latitude),
                    });
                  }}
                >
                  <option value="custom">Koordinatani qo‘lda kiritish</option>
                  {cities.map((city, index) => (
                    <option key={city.name} value={index}>
                      {city.name}
                    </option>
                  ))}
                </select>
              </label>
              <p className="map-field-help">
                Shahar tanlash taxminiy markaz koordinatasini qo‘yadi. Aniq
                manzil uchun uni tahrirlang.
              </p>
              <div className="map-coordinate-fields">
                <label className="field">
                  Kenglik (latitude)
                  <input
                    type="number"
                    required
                    min="-85"
                    max="85"
                    step="any"
                    value={draft.latitude}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        city: "custom",
                        latitude: event.target.value,
                      })
                    }
                  />
                </label>
                <label className="field">
                  Uzunlik (longitude)
                  <input
                    type="number"
                    required
                    min="-180"
                    max="180"
                    step="any"
                    value={draft.longitude}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        city: "custom",
                        longitude: event.target.value,
                      })
                    }
                  />
                </label>
              </div>
              {writable && (
                <label className="field">
                  Bog‘lanish turi
                  <select
                    value={draft.linkResource}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        linkResource: event.target
                          .value as typeof draft.linkResource,
                        linkId: "",
                      })
                    }
                  >
                    <option value="">Bog‘lanishsiz</option>
                    <option value="assets">Aktiv</option>
                    <option value="providers">Provayder</option>
                    <option value="plans">Tiklanish rejasi</option>
                  </select>
                </label>
              )}
              {draft.linkResource && (
                <label className="field">
                  Bog‘langan yozuv
                  <select
                    value={draft.linkId}
                    onChange={(event) =>
                      setDraft({ ...draft, linkId: event.target.value })
                    }
                  >
                    <option value="">Tanlang…</option>
                    {!linkOptions.some(
                      (option) => String(option.id) === draft.linkId,
                    ) &&
                      draft.linkId && (
                        <option value={draft.linkId}>#{draft.linkId}</option>
                      )}
                    {linkOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.name || option.title}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {linkError && <p role="alert">{linkError}</p>}
              <button
                disabled={!canSave}
                className="btn btn-primary map-save"
                type="submit"
              >
                <UzHiIcon name="plus" size={16} />{" "}
                {editing ? "O‘zgarishni saqlash" : "Rejaga qo‘shish"}
              </button>
              {editing && (
                <button
                  type="button"
                  className="btn map-save"
                  onClick={resetDraft}
                >
                  Tahrirlashni bekor qilish
                </button>
              )}
            </form>
            <div className="map-editor-note">
              <strong>Manzildan yo‘nalishgacha</strong>
              <p>
                Ikkinchi manzilni qo‘shganingizda bog‘lanish chiziladi. Ijro
                etish tugmasi yo‘nalishni bosqichma-bosqich ochadi.
              </p>
            </div>
          </aside>
        )}
      </div>
    </section>
  );
}
