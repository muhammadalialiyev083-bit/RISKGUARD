import React, { useId } from "react";
import "./domain-charts.css";

type RecordRow = Record<string, any>;

export function RiskMatrix({
  risks,
  onSelect,
}: {
  risks: RecordRow[];
  onSelect?: (likelihood: number, impact: number) => void;
}) {
  const id = useId();
  return (
    <section className="panel chart-panel" aria-labelledby={id}>
      <div className="chart-heading">
        <div>
          <h3 id={id}>Risklar xaritasi</h3>
          <p>Ehtimollik × ta’sir. Katakni tanlab risklarni ko‘ring.</p>
        </div>
        <span className="badge">{risks.length} risk</span>
      </div>
      <div className="risk-matrix-wrap">
        <span className="axis-label">Ehtimollik ↑</span>
        <div
          className="risk-matrix"
          role="group"
          aria-label="5 ga 5 risk matritsasi"
        >
          {[5, 4, 3, 2, 1].flatMap((likelihood) =>
            [1, 2, 3, 4, 5].map((impact) => {
              const rows = risks.filter(
                (r) =>
                  Number(r.likelihood) === likelihood &&
                  Number(r.impact) === impact,
              );
              const score = likelihood * impact;
              return (
                <button
                  key={`${likelihood}-${impact}`}
                  className={`risk-cell risk-${score <= 6 ? "low" : score <= 14 ? "medium" : "high"}`}
                  onClick={() => onSelect?.(likelihood, impact)}
                  aria-label={`Ehtimollik ${likelihood}, ta’sir ${impact}, ball ${score}, ${rows.length} risk`}
                  title={
                    rows.map((r) => r.threat).join("; ") || "Risk mavjud emas"
                  }
                >
                  <span>{score}</span>
                  {rows.length > 0 && <strong>{rows.length}</strong>}
                </button>
              );
            }),
          )}
        </div>
      </div>
      <div className="axis-bottom">Ta’sir →</div>
      <p className="chart-legend">
        <span>
          <i className="dot low" /> Past: 1–6
        </span>
        <span>
          <i className="dot medium" /> O‘rta: 7–14
        </span>
        <span>
          <i className="dot high" /> Yuqori: 15–25
        </span>
      </p>
      <details>
        <summary>Matritsa jadvalini ko‘rish</summary>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Risk</th>
                <th>Ehtimollik</th>
                <th>Ta’sir</th>
                <th>Ball</th>
              </tr>
            </thead>
            <tbody>
              {risks.map((r) => (
                <tr key={r.id}>
                  <td>{r.threat}</td>
                  <td>{r.likelihood}</td>
                  <td>{r.impact}</td>
                  <td>{Number(r.likelihood) * Number(r.impact)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!risks.length && <p>Hozircha risk kiritilmagan.</p>}
      </details>
    </section>
  );
}

export function DependencyMap({
  processes,
  assets,
  dependencies,
  onSelect,
}: {
  processes: RecordRow[];
  assets: RecordRow[];
  dependencies: RecordRow[];
  onSelect?: (type: string, id: number) => void;
}) {
  const titleId = useId(),
    descId = useId();
  const processNodes = processes.map((r, i) => ({
    ...r,
    id: Number(r.id),
    name: String(r.name || ""),
    kind: "PROCESS",
    x: 25,
    y: 35 + i * 62,
  }));
  const assetNodes = assets.map((r, i) => ({
    ...r,
    id: Number(r.id),
    name: String(r.name || ""),
    kind: "ASSET",
    x: 375,
    y: 35 + i * 62,
  }));
  const nodes = [...processNodes, ...assetNodes];
  const height = Math.max(
    160,
    Math.max(processNodes.length, assetNodes.length) * 62 + 20,
  );
  function node(type: string, id: number) {
    return nodes.find((n) => n.kind === type && Number(n.id) === Number(id));
  }
  const label = (type: string, id: number) =>
    node(type, id)?.name || `${type} #${id}`;
  return (
    <section className="panel chart-panel" aria-labelledby={titleId}>
      <div className="chart-heading">
        <div>
          <h3 id={titleId}>Bog‘liqlik xaritasi</h3>
          <p>Jarayonlar va aktivlar orasidagi haqiqiy bog‘lanishlar.</p>
        </div>
        <span className="badge">{dependencies.length} aloqa</span>
      </div>
      {!nodes.length ? (
        <p>Jarayon yoki aktiv yarating, so‘ng ularni bog‘lang.</p>
      ) : (
        <div className="dependency-scroll">
          <svg
            viewBox={`0 0 670 ${height}`}
            className="dependency-svg"
            role="img"
            aria-labelledby={`${titleId} ${descId}`}
          >
            <desc id={descId}>
              Chapda jarayonlar, o‘ngda aktivlar. Chiziqlar qaramliklarni
              ko‘rsatadi. To‘liq ro‘yxat quyidagi jadvalda.
            </desc>
            <defs>
              <marker
                id={`${titleId}-arrow`}
                markerWidth="8"
                markerHeight="8"
                refX="7"
                refY="4"
                orient="auto"
              >
                <path d="M0 0 L8 4 L0 8" fill="currentColor" />
              </marker>
            </defs>
            {dependencies.map((d) => {
              const a = node(d.from_type, d.from_id),
                b = node(d.to_type, d.to_id);
              if (!a || !b) return null;
              return (
                <path
                  key={d.id}
                  d={`M${a.x + 250} ${a.y + 18} C${a.x + 295} ${a.y + 18},${b.x - 45} ${b.y + 18},${b.x} ${b.y + 18}`}
                  fill="none"
                  stroke="currentColor"
                  opacity=".45"
                  strokeWidth="1.7"
                  markerEnd={`url(#${titleId}-arrow)`}
                >
                  <title>
                    {a.name} → {b.name}
                  </title>
                </path>
              );
            })}
            {nodes.map((n) => (
              <g
                key={`${n.kind}-${n.id}`}
                transform={`translate(${n.x},${n.y})`}
                role={onSelect ? "button" : undefined}
                tabIndex={onSelect ? 0 : undefined}
                aria-label={`${n.kind === "PROCESS" ? "Jarayon" : "Aktiv"}: ${n.name}`}
                onClick={() => onSelect?.(n.kind, n.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelect?.(n.kind, n.id);
                  }
                }}
              >
                <rect
                  width="250"
                  height="38"
                  rx="8"
                  className={`map-node ${n.kind === "PROCESS" ? "map-process" : "map-asset"}`}
                />
                <text x="12" y="24" className="map-label">
                  {n.name.length > 31 ? n.name.slice(0, 29) + "…" : n.name}
                </text>
                <title>{n.name}</title>
              </g>
            ))}
          </svg>
        </div>
      )}
      <details>
        <summary>Bog‘liqliklar jadvali</summary>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Manba</th>
                <th>Bog‘liq resurs</th>
                <th>Muhimlik</th>
              </tr>
            </thead>
            <tbody>
              {dependencies.map((d) => (
                <tr key={d.id}>
                  <td>{label(d.from_type, d.from_id)}</td>
                  <td>{label(d.to_type, d.to_id)}</td>
                  <td>
                    {d.dependency_criticality === "MANDATORY"
                      ? "Majburiy"
                      : "Ixtiyoriy"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!dependencies.length && <p>Hozircha bog‘liqliklar kiritilmagan.</p>}
      </details>
    </section>
  );
}

export function SummaryCharts({
  processes,
  bias,
  risks,
  onNavigate,
}: {
  processes: RecordRow[];
  bias: RecordRow[];
  risks: RecordRow[];
  onNavigate?: (module: string) => void;
}) {
  const distribution = [
    ["CRITICAL", "Kritik"],
    ["HIGH", "Yuqori"],
    ["MEDIUM", "O‘rta"],
    ["LOW", "Past"],
  ];
  const approved = new Set(
    bias.filter((b) => b.status === "APPROVED").map((b) => b.process),
  );
  const gaps = bias.filter((b) => b.has_rpo_gap).length;
  const ready = processes.filter((p) => approved.has(p.id)).length;
  return (
    <div className="chart-grid">
      <section className="panel chart-panel">
        <h3>Jarayonlar muhimligi</h3>
        <p>Har bir ko‘rsatkich jarayonlar reestriga olib boradi.</p>
        <div className="distribution-bars">
          {distribution.map(([code, label]) => {
            const count = processes.filter(
              (p) => p.criticality === code,
            ).length;
            return (
              <button
                className="distribution-row"
                key={code}
                onClick={() => onNavigate?.("processes")}
              >
                <span>{label}</span>
                <span className="bar-track">
                  <span
                    className={`bar-fill level-${code.toLowerCase()}`}
                    style={{
                      width: `${processes.length ? (count / processes.length) * 100 : 0}%`,
                    }}
                  />
                </span>
                <strong>{count}</strong>
              </button>
            );
          })}
        </div>
        {!processes.length && (
          <p>Statistika uchun birinchi jarayonni yarating.</p>
        )}
      </section>
      <section className="panel chart-panel">
        <h3>Tayyorgarlik holati</h3>
        <p>Tasdiqlangan BIA baholashiga ega jarayonlar ulushi.</p>
        <button
          className="readiness-value"
          onClick={() => onNavigate?.("bia")}
          aria-label="BIA baholashlarini ochish"
        >
          {processes.length ? Math.round((ready / processes.length) * 100) : 0}
          <small>%</small>
        </button>
        <p>
          {ready} / {processes.length} jarayon baholangan
        </p>
        <div className="readiness-notes">
          <button onClick={() => onNavigate?.("bia")}>
            <span>RPO uzilishlari</span>
            <strong>{gaps}</strong>
          </button>
          <button onClick={() => onNavigate?.("risks")}>
            <span>Yuqori risklar</span>
            <strong>
              {
                risks.filter(
                  (r) => Number(r.likelihood) * Number(r.impact) >= 15,
                ).length
              }
            </strong>
          </button>
        </div>
      </section>
    </div>
  );
}
