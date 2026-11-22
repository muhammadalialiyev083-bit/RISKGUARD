import { UzHiIcon } from "../components/icons/UzHiIcons";
import { guides } from "./workflow";
import type { RecordRow } from "./workflow";

export function SectionGuide({
  module,
  user,
  onNavigate,
  onStart,
}: {
  module: string;
  user: RecordRow;
  onNavigate: (target: string) => void;
  onStart?: () => void;
}) {
  const guide = guides[module];
  if (!guide) return null;
  return (
    <details className="module-help">
      <summary>
        <UzHiIcon name="book" size={15} /> Yordam
      </summary>
      <p>{guide.purpose}</p>
      <ul>
        {guide.steps.map((step) => (
          <li key={step.target}>
            <span>{step.text}</span>{" "}
            <button
              className="text-button"
              onClick={() =>
                onNavigate(
                  user.role === "AUDITOR"
                    ? step.target.split("?")[0]
                    : step.target,
                )
              }
            >
              {step.label}
            </button>
          </li>
        ))}
      </ul>
      {onStart && user.role !== "AUDITOR" && (
        <button className="btn" onClick={onStart}>
          {guide.primary}
        </button>
      )}
    </details>
  );
}
