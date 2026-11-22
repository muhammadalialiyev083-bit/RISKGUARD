import { useState } from "react";

const providers = [
  {
    name: "Universitet internet provayderi",
    processes: [
      { name: "Elektron ta’lim platformasi", rto: 2 },
      { name: "Masofaviy darsga ulanish", rto: 4 },
    ],
  },
  {
    name: "To‘lov provayderi",
    processes: [{ name: "Shartnoma to‘lovini qabul qilish", rto: 6 }],
  },
];

export function PublicScenario() {
  const [provider, setProvider] = useState(0);
  const [hours, setHours] = useState("8");
  const [result, setResult] = useState<{
    provider: number;
    hours: number;
  } | null>(null);

  return (
    <details className="public-demo">
      <summary>Ssenariyni sinab ko‘rish</summary>
      <p className="muted">Namunaviy ma’lumotlar</p>
      <form
        className="form-stack"
        onSubmit={(event) => {
          event.preventDefault();
          setResult({ provider, hours: Number(hours) });
        }}
      >
        <label className="field">
          Provayder
          <select
            value={provider}
            onChange={(event) => {
              setProvider(Number(event.target.value));
              setResult(null);
            }}
          >
            {providers.map((item, index) => (
              <option key={item.name} value={index}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Uzilish davomiyligi · soat
          <input
            type="number"
            min="0.01"
            step="0.01"
            max="9999.99"
            required
            value={hours}
            onChange={(event) => {
              setHours(event.target.value);
              setResult(null);
            }}
          />
        </label>
        <button className="btn btn-primary">Ta’sirni hisoblash</button>
      </form>
      <div role="status">
        {result && (
          <ul className="demo-impact">
            {providers[result.provider].processes.map((process) => (
              <li key={process.name}>
                <span>{process.name}</span>
                <span
                  className={
                    result.hours > process.rto ? "danger-text" : "muted"
                  }
                >
                  {result.hours > process.rto
                    ? `RTO buziladi (${process.rto} soat)`
                    : `RTO doirasida (${process.rto} soat)`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </details>
  );
}
