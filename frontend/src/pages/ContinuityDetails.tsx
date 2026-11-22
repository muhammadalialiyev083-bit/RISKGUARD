import { useEffect, useState } from "react";
import { api } from "../api/client";

type Row = Record<string, any>;
type Navigate = (page: string) => void;

export function PlanEvidence({ row }: { row: Row }) {
  const status = row.readiness;
  if (!status) return null;
  const basis = status.bia_basis;
  return (
    <div className="plan-evidence">
      <p>
        {status.needs_review
          ? "Qayta ko‘rib chiqish kerak"
          : status.exercise_verified
            ? "Mashqda tekshirilgan"
            : status.published
              ? "E’lon qilingan"
              : "E’lon qilinmagan"}
      </p>
      {basis && (
        <p className="muted">
          BIA v{basis.revision} · RTO {basis.rto_hours} soat · MTPD{" "}
          {basis.mtpd_hours} soat · RPO {basis.rpo_minutes} daqiqa
        </p>
      )}
      {!!status.missing_evidence.length && (
        <ul>
          {status.missing_evidence.map((reason: string) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ContinuityLink({
  label,
  resource,
  record,
  onNavigate,
}: {
  label: string;
  resource: string;
  record: number;
  onNavigate: Navigate;
}) {
  return (
    <button
      className="text-button"
      onClick={() => onNavigate(`${resource}?record=${record}`)}
    >
      {label}
    </button>
  );
}

export function ServiceContinuity({
  id,
  name,
  readonly,
  onNavigate,
}: {
  id: number;
  name: string;
  readonly: boolean;
  onNavigate: Navigate;
}) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let current = true;
    setError("");
    api.get(`/services/${id}/continuity/`).then(
      (result) => {
        if (current) setRows(result.processes);
      },
      (failure) => {
        if (current) setError(failure.message);
      },
    );
    return () => {
      current = false;
    };
  }, [id, retry]);

  return (
    <section className="service-continuity">
      <h3>{name}</h3>
      {!readonly && (
        <button
          className="btn"
          onClick={() => onNavigate(`processes?action=create&service=${id}`)}
        >
          Jarayon qo‘shish
        </button>
      )}
      {error ? (
        <div role="alert">
          {error}{" "}
          <button className="btn" onClick={() => setRetry(retry + 1)}>
            Qayta urinish
          </button>
        </div>
      ) : rows === null ? (
        <p role="status">Xizmat yuklanmoqda…</p>
      ) : !rows.length ? (
        <p>Ushbu xizmatga jarayon biriktirilmagan.</p>
      ) : (
        <ul className="continuity-processes">
          {rows.map((row) => (
            <li key={row.id}>
              <h4>
                <ContinuityLink
                  resource="processes"
                  record={row.id}
                  label={row.name}
                  onNavigate={onNavigate}
                />
              </h4>
              <p>Mas’ul · {row.owner || "Belgilanmagan"}</p>
              <dl>
                <div>
                  <dt>BIA</dt>
                  <dd>
                    {row.bia ? (
                      <ContinuityLink
                        resource="bia"
                        record={row.bia.id}
                        label={`BIA v${row.bia.revision} · RTO ${row.bia.rto_hours} soat`}
                        onNavigate={onNavigate}
                      />
                    ) : readonly ? (
                      "Tasdiqlangan BIA kerak"
                    ) : (
                      <button
                        className="text-button"
                        onClick={() =>
                          onNavigate(`bia?action=create&process=${row.id}`)
                        }
                      >
                        BIA yaratish
                      </button>
                    )}
                  </dd>
                </div>
                <div>
                  <dt>Risklar</dt>
                  <dd>
                    {row.risks.length ? (
                      <button
                        className="text-button"
                        onClick={() => onNavigate(`risks?process=${row.id}`)}
                      >
                        {row.risks.length} ta risk
                      </button>
                    ) : readonly ? (
                      "Risk kiritilmagan"
                    ) : (
                      <button
                        className="text-button"
                        onClick={() =>
                          onNavigate(`risks?action=create&process=${row.id}`)
                        }
                      >
                        Risk qo‘shish
                      </button>
                    )}
                  </dd>
                </div>
                <div>
                  <dt>Reja</dt>
                  <dd>
                    {row.plan ? (
                      <>
                        <ContinuityLink
                          resource="plans"
                          record={row.plan.id}
                          label={`${row.plan.label} · v${row.plan.version}`}
                          onNavigate={onNavigate}
                        />
                        <PlanEvidence row={row.plan} />
                      </>
                    ) : readonly ? (
                      "E’lon qilingan reja yo‘q"
                    ) : (
                      <button
                        className="text-button"
                        onClick={() =>
                          onNavigate(`plans?action=create&process=${row.id}`)
                        }
                      >
                        Reja tuzish
                      </button>
                    )}
                  </dd>
                </div>
                <div>
                  <dt>Oxirgi mashq</dt>
                  <dd>
                    {row.exercise ? (
                      <ContinuityLink
                        resource="exercises"
                        record={row.exercise.id}
                        label={`${row.exercise.date} · ${row.exercise.outcome}`}
                        onNavigate={onNavigate}
                      />
                    ) : (
                      "Mashq qayd etilmagan"
                    )}
                    {!readonly && row.plan && (
                      <button
                        className="text-button"
                        onClick={() =>
                          onNavigate(
                            `exercises?action=create&plan=${row.plan.id}`,
                          )
                        }
                      >
                        Mashq qo‘shish
                      </button>
                    )}
                  </dd>
                </div>
                <div>
                  <dt>Ochiq vazifalar</dt>
                  <dd>
                    {row.tasks.length
                      ? row.tasks.map((task: Row) => (
                          <ContinuityLink
                            key={task.id}
                            resource="tasks"
                            record={task.id}
                            label={task.label}
                            onNavigate={onNavigate}
                          />
                        ))
                      : "Ochiq vazifa yo‘q"}
                  </dd>
                </div>
              </dl>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function ISOEvidence({ onNavigate }: { onNavigate: Navigate }) {
  const [data, setData] = useState<Row[] | null>(null);
  const [error, setError] = useState("");
  const [gaps, setGaps] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let current = true;
    setError("");
    api.get("/reports/iso22301").then(
      (result) => {
        if (current) setData(result.records);
      },
      (failure) => {
        if (current) setError(failure.message);
      },
    );
    return () => {
      current = false;
    };
  }, [retry]);
  const rows = data?.filter((row) => !gaps || row.missing.length) || [];
  return (
    <section className="domain-page">
      <header className="page-header">
        <h1>ISO 22301 dalillari</h1>
        <label>
          <input
            type="checkbox"
            checked={gaps}
            onChange={(event) => setGaps(event.target.checked)}
          />{" "}
          Yetishmayotgan dalillar
        </label>
      </header>
      {error ? (
        <div role="alert" className="alert error">
          {error}{" "}
          <button className="btn" onClick={() => setRetry(retry + 1)}>
            Qayta urinish
          </button>
        </div>
      ) : data === null ? (
        <p role="status">Dalillar yuklanmoqda…</p>
      ) : !rows.length ? (
        <p>
          {gaps
            ? "Yetishmayotgan dalil topilmadi."
            : "Dalillar uchun avval jarayon yarating."}
        </p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Band</th>
                <th>Jarayon</th>
                <th>Dalil va holat</th>
                <th>Mas’ul</th>
                <th>Muddat</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={`${row.process_id}-${row.clause}`}>
                  <th scope="row">
                    {row.clause} · {row.label}
                  </th>
                  <td>{row.process_name}</td>
                  <td>
                    {row.record_id && (
                      <ContinuityLink
                        resource={row.resource}
                        record={row.record_id}
                        label={row.evidence}
                        onNavigate={onNavigate}
                      />
                    )}
                    {row.missing.length ? (
                      <ul>
                        {row.missing.map((reason: string) => (
                          <li key={reason}>{reason}</li>
                        ))}
                      </ul>
                    ) : (
                      <p>Dalil mavjud</p>
                    )}
                  </td>
                  <td>{row.owner || "Belgilanmagan"}</td>
                  <td>{row.due_date || "Belgilanmagan"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export function SimulationImpact({
  result,
  onNavigate,
}: {
  result: Row;
  onNavigate: Navigate;
}) {
  const names = result.dependency_names || {};
  return (
    <>
      {!!result.backup_results?.length && (
        <ul>
          {result.backup_results.map((backup: Row) => (
            <li key={backup.asset_id}>
              <ContinuityLink
                resource="assets"
                record={backup.backup_asset_id}
                label={`Zaxira aktivi #${backup.backup_asset_id}`}
                onNavigate={onNavigate}
              />
              {" · "}
              {backup.available
                ? "Ishlaydi"
                : "Mavjud emas yoki uzilish ta’sirida"}
            </li>
          ))}
        </ul>
      )}
      {result.affected_processes?.length ? (
        <div className="table-wrap simulation-impact-table">
          <table role="table" aria-label="Uzilish ta’siri">
            <thead>
              <tr>
                <th>Jarayon</th>
                <th>BIA va chegaralar</th>
                <th>Natija</th>
                <th>Reja</th>
              </tr>
            </thead>
            <tbody>
              {result.affected_processes.map((row: Row) => (
                <tr key={row.process_id} role="row">
                  <td role="cell">
                    {row.process_name}
                    <br />
                    <small>{row.service_name}</small>
                    {!!row.dependency_paths?.length && (
                      <details>
                        <summary>Ta’sir yo‘li</summary>
                        {row.dependency_paths.map((path: string[]) => (
                          <p key={path.join("/")}>
                            {path
                              .map((node) => names[node] || node)
                              .join(" → ")}
                          </p>
                        ))}
                      </details>
                    )}
                  </td>
                  <td role="cell">
                    {row.bia_id ? (
                      <>
                        <ContinuityLink
                          resource="bia"
                          record={row.bia_id}
                          label={`BIA v${row.bia_revision}`}
                          onNavigate={onNavigate}
                        />
                        <br />
                        RTO {row.target_rto_hours} soat / MTPD{" "}
                        {row.target_mtpd_hours} soat / RPO{" "}
                        {row.target_rpo_minutes} daqiqa
                        {row.rpo_gap && (
                          <p className="danger-text">
                            Zaxiralash oralig‘i RPO’dan katta.
                          </p>
                        )}
                      </>
                    ) : row.assessment_status === "UNASSESSED" ? (
                      "Tasdiqlangan BIA kerak"
                    ) : (
                      "BIA manbasi qayd etilmagan"
                    )}
                  </td>
                  <td role="cell">
                    {row.assessment_status === "UNASSESSED"
                      ? "Baholanmagan"
                      : [
                          row.rto_breached && "RTO chegarasi buzilgan",
                          row.mtpd_breached && "MTPD chegarasi buzilgan",
                        ]
                          .filter(Boolean)
                          .join(" · ") ||
                        (row.assessment_status === "APPROVED"
                          ? "Chegaralar doirasida"
                          : "Tarixiy natija")}
                  </td>
                  <td role="cell">
                    {row.plan_id ? (
                      <ContinuityLink
                        resource="plans"
                        record={row.plan_id}
                        label={`Reja v${row.plan_version}${row.plan_needs_review ? " · Qayta ko‘rib chiqish kerak" : ""}`}
                        onNavigate={onNavigate}
                      />
                    ) : row.has_published_plan ? (
                      "Tarixiy natijada mavjud"
                    ) : (
                      "Amaldagi reja yo‘q"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p>Ta’sirlangan jarayon topilmadi.</p>
      )}
    </>
  );
}
