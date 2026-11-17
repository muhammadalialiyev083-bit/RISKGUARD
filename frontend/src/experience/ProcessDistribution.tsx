import { useId, useLayoutEffect, useRef, useState } from "react";
import { ChartColumn, ChartLine } from "lucide-react";
import { useMotion } from "./MotionEffects";
import type { RecordRow } from "./workflow";

const levels = [["CRITICAL", "Kritik"], ["HIGH", "Yuqori"], ["MEDIUM", "O‘rta"], ["LOW", "Past"]];
const clamp = (n: number) => Math.max(0, Math.min(1, n));

export function ProcessDistribution({ processes, onNavigate }: { processes: RecordRow[]; onNavigate: (target: string) => void }) {
  const [line, setLine] = useState(false);
  const { enabled } = useMotion();
  const svg = useRef<SVGSVGElement>(null);
  const progress = useRef(0);
  const id = useId();
  const values = levels.map(([key]) => processes.filter((row) => row.criticality === key).length);
  const maximum = Math.max(1, ...values);
  const points = values.map((value, index) => ({ x: 48 + index * 95, y: 112 - value / maximum * 82 }));
  const path = points.map((p, i) => `${i ? "L" : "M"}${p.x},${p.y}`).join(" ");
  const signature = values.join(",");
  useLayoutEffect(() => {
    const root = svg.current;
    if (!root) return;
    let frame = 0;
    const start = performance.now(), from = progress.current, to = line ? 1 : 0;
    function draw(p: number) {
      progress.current = p;
      root!.querySelectorAll<SVGRectElement>(".morph-bar").forEach((bar, i) => {
        const stage = clamp((p - i * .06) / .72);
        const width = 38 * (1 - stage) + 1.5 * stage;
        bar.setAttribute("width", String(width));
        bar.setAttribute("x", String(48 + i * 95 - width / 2));
        bar.style.opacity = String(1 - clamp((p - .65) / .35));
      });
      const trace = root!.querySelector<SVGPathElement>(".morph-line")!;
      trace.style.strokeDashoffset = String(1 - clamp((p - .27) / .73));
      root!.querySelector<SVGPathElement>(".morph-area")!.style.opacity = String(clamp((p - .5) / .5) * .12);
      root!.querySelectorAll<SVGCircleElement>(".morph-point").forEach((dot, i) => {
        dot.setAttribute("r", String(4 * clamp((p - .38 - i * .12) / .2)));
      });
    }
    function tick(now: number) {
      const t = enabled ? clamp((now - start) / 740) : 1;
      const eased = t < .5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2;
      draw(from + (to - from) * eased);
      if (t < 1) frame = requestAnimationFrame(tick);
    }
    if (enabled && from !== to) frame = requestAnimationFrame(tick);
    else draw(to);
    return () => cancelAnimationFrame(frame);
  }, [line, enabled, signature]);
  return <div className="executive-distribution motion-distribution">
    <div className="distribution-heading">
      <h3 id={id}>Jarayonlar muhimligi</h3>
      <div className="chart-switch" role="group" aria-label="Diagramma ko‘rinishi">
        <button aria-label="Ustunli ko‘rinish" aria-pressed={!line} onClick={() => setLine(false)}><ChartColumn size={15} /></button>
        <button aria-label="Chiziqli ko‘rinish" aria-pressed={line} onClick={() => setLine(true)}><ChartLine size={15} /></button>
      </div>
    </div>
    {processes.length > 0 && <svg ref={svg} viewBox="0 0 380 145" className="morph-chart" role="img" aria-labelledby={id}>
      <desc>{levels.map(([, label], i) => `${label}: ${values[i]} ta`).join(". ")}. Ikkala ko‘rinishda qiymatlar bir xil.</desc>
      {[30, 71, 112].map((y) => <path key={y} d={`M18 ${y} H360`} className="morph-grid" />)}
      <path d={`${path} L333 112 L48 112 Z`} className="morph-area" fill="currentColor" opacity="0" />
      {points.map((p, i) => <rect key={i} className={`morph-bar level-${levels[i][0].toLowerCase()}`} x={p.x - 19} y={p.y} width="38" height={112 - p.y} rx="3" />)}
      <path d={path} className="morph-line" pathLength="1" strokeDasharray="1" strokeDashoffset="1" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      {points.map((p, i) => <g key={i}><circle className="morph-point" cx={p.x} cy={p.y} r="0" fill="currentColor" /><text x={p.x} y={p.y - 12} className="morph-value">{values[i]}</text><text x={p.x} y="136" className="morph-label">{levels[i][1]}</text></g>)}
    </svg>}
    {levels.map(([key, label], i) => <button className="distribution-filter" key={key} onClick={() => onNavigate("processes?filter=" + key)}>
      <span>{label}</span><i><b className={`level-${key.toLowerCase()}`} style={{ width: `${processes.length ? values[i] / processes.length * 100 : 0}%` }} /></i><strong>{values[i]}</strong>
    </button>)}
    {!processes.length && <p>Birinchi jarayondan so‘ng taqsimot shakllanadi.</p>}
  </div>;
}
