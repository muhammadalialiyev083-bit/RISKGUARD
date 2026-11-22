import { useEffect, useRef, useState, type PointerEvent } from "react";
import { UzHiIcon, type UzHiIconName } from "../icons/UzHiIcons";
import "./bubble-icon.css";

const iconSizes = { xs: 16, sm: 18, md: 22, lg: 26 };

export type BubbleIconVariant = "indigo" | "active" | "lime" | "danger";

type BubbleIconProps = {
  name: UzHiIconName;
  size?: keyof typeof iconSizes;
  variant?: BubbleIconVariant;
  float?: boolean;
};

function motionAllowed() {
  const preference = document.documentElement.dataset.uiMotion;
  return preference ? preference === "on" : !matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function move(event: PointerEvent<HTMLSpanElement>) {
  if (event.pointerType === "touch" || !motionAllowed()) return;
  const anchor = event.currentTarget;
  const bounds = anchor.getBoundingClientRect();
  const offset = (point: number, start: number, size: number) =>
    Math.max(-4, Math.min(4, ((point - start) / size - 0.5) * 8));
  anchor.style.setProperty("--bubble-x", `${offset(event.clientX, bounds.x, bounds.width)}px`);
  anchor.style.setProperty("--bubble-y", `${offset(event.clientY, bounds.y, bounds.height)}px`);
}

function reset({ currentTarget }: PointerEvent<HTMLSpanElement>) {
  currentTarget.style.removeProperty("--bubble-x");
  currentTarget.style.removeProperty("--bubble-y");
}

export function BubbleIcon({ name, size = "sm", variant = "indigo", float = false }: BubbleIconProps) {
  const anchor = useRef<HTMLSpanElement>(null);
  const sequence = useRef(0);
  const [burst, setBurst] = useState<number | null>(null);

  useEffect(() => {
    const control = anchor.current?.closest("button, a, summary");
    if (!control) return;
    const activate = () => {
      if (motionAllowed()) setBurst(++sequence.current);
    };
    control.addEventListener("click", activate);
    return () => control.removeEventListener("click", activate);
  }, []);

  useEffect(() => {
    if (burst === null) return;
    // A preference change can cancel the animation before animationend fires.
    const cleanup = window.setTimeout(() => setBurst(null), 550);
    return () => window.clearTimeout(cleanup);
  }, [burst]);

  return (
    <span
      ref={anchor}
      className={`bubble-icon bubble-icon-${size} bubble-icon-${variant}${float ? " bubble-icon-float" : ""}`}
      aria-hidden="true"
      onPointerMove={move}
      onPointerLeave={reset}
      onPointerCancel={reset}
    >
      <span className="bubble-face">
        <UzHiIcon name={name} size={iconSizes[size]} />
      </span>
      {burst !== null && (
        <span
          key={burst}
          className="bubble-feedback"
          onAnimationEnd={(event) => {
            if (event.animationName === "uzhi-bubble-ripple") setBurst(null);
          }}
        >
          <i /><i /><i /><i />
        </span>
      )}
    </span>
  );
}
