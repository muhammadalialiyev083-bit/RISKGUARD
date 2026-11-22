import {
  createContext, useContext, useEffect, useLayoutEffect, useRef, useState,
  type ReactNode, type RefObject,
} from "react";
import { BubbleIcon } from "../components/ui/BubbleIcon";

const MotionContext = createContext({ enabled: false, reduced: false, paused: false, toggle: () => {} });
const easing = "cubic-bezier(.22, 1, .36, 1)";

export function MotionProvider({ children }: { children: ReactNode }) {
  const [reduced, setReduced] = useState(() => matchMedia("(prefers-reduced-motion: reduce)").matches);
  const [paused, setPaused] = useState(() => {
    try { return localStorage.getItem("uzhi-ui-motion") === "paused"; } catch { return false; }
  });
  const enabled = !reduced && !paused;
  useEffect(() => {
    const query = matchMedia("(prefers-reduced-motion: reduce)");
    const change = () => setReduced(query.matches);
    query.addEventListener("change", change);
    return () => query.removeEventListener("change", change);
  }, []);
  useEffect(() => {
    document.documentElement.dataset.uiMotion = enabled ? "on" : "off";
    return () => { delete document.documentElement.dataset.uiMotion; };
  }, [enabled]);
  useEffect(() => {
    if (!enabled) return;
    const seen = new WeakSet<Element>();
    const animations = new Set<Animation>();
    let source: DOMRect | null = null;
    let sourceTime = 0;
    function animate(node: Element, frames: Keyframe[], delay = 0) {
      const animation = node.animate(frames, { duration: 480, delay, easing, fill: "backwards" });
      animations.add(animation);
      animation.onfinish = animation.oncancel = () => animations.delete(animation);
    }
    const observer = new IntersectionObserver((entries) => {
      let beat = 0;
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        observer.unobserve(entry.target);
        const node = entry.target;
        if (document.hidden) continue;
        const dialog = node.matches('[role="dialog"]');
        const heading = node.matches(".auth-story h1, .welcome-copy h1");
        if (dialog && source && performance.now() - sourceTime < 1400) {
          const target = node.getBoundingClientRect();
          const zoom = node.matches(".kpi-focus-dialog");
          animate(node, [
            { opacity: zoom ? .8 : .35, transformOrigin: "center", transform: `translate(${source.x + source.width / 2 - target.x - target.width / 2}px, ${source.y + source.height / 2 - target.y - target.height / 2}px) scale(${zoom ? source.width / target.width : .72}, ${zoom ? source.height / target.height : .72})` },
            { opacity: 1, transform: "translate(0, 0) scale(1)" },
          ]);
          node.setAttribute("data-motion-effect", zoom ? "dashboard-zoom" : "card-to-workspace");
          source = null;
        } else {
          animate(node, heading ? [
            { clipPath: "inset(0 0 100% 0)", transform: "translateY(12px)" },
            { clipPath: "inset(0 0 0% 0)", transform: "translateY(0)" },
          ] : [
            { opacity: .25, transform: `translateY(${dialog ? 18 : 12}px) scale(${dialog ? .97 : 1})` },
            { opacity: 1, transform: "translateY(0) scale(1)" },
          ], Math.min(beat++ * 45, 180));
        }
      }
    }, { threshold: .04 });
    const selector = [
      ".executive-kpi", ".executive-charts > .panel", ".getting-started > ol > li",
      ".section-guide", ".chart-panel", ".page-header", ".ops-stats > *",
      ".ops-detail", ".ops-dialog", ".domain-modal", ".walkthrough-dialog", ".kpi-focus-dialog",
      ".auth-form-card", ".auth-story h1", ".welcome-copy h1", ".continuity-flow > li",
      ".search-results", ".search-results > button", ".section-guide ol > li",
    ].join(",");
    function scan(root: ParentNode) {
      const elements = [...root.querySelectorAll(selector)];
      if (root instanceof Element && root.matches(selector)) elements.unshift(root);
      for (const node of elements) {
        if (seen.has(node)) continue;
        seen.add(node);
        observer.observe(node);
      }
    }
    scan(document);
    const mutations = new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.addedNodes) if (node instanceof Element) scan(node);
        for (const node of record.removedNodes) if (node instanceof Element) {
          observer.unobserve(node);
          for (const child of node.querySelectorAll(selector)) observer.unobserve(child);
        }
      }
    });
    mutations.observe(document.body, { childList: true, subtree: true });
    const rememberSource = (event: Event) => {
      const button = (event.target as Element).closest?.("button, a");
      const node = button?.closest(".kpi-focus-card") || button;
      if (node) { source = node.getBoundingClientRect(); sourceTime = performance.now(); }
    };
    const visibility = () => { if (document.hidden) for (const animation of animations) animation.finish(); };
    document.addEventListener("click", rememberSource, true);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      observer.disconnect(); mutations.disconnect();
      document.removeEventListener("click", rememberSource, true);
      document.removeEventListener("visibilitychange", visibility);
      for (const animation of animations) animation.cancel();
    };
  }, [enabled]);
  function toggle() {
    const next = !paused;
    setPaused(next);
    try { localStorage.setItem("uzhi-ui-motion", next ? "paused" : "playing"); } catch { /* Optional persistence. */ }
  }
  return <MotionContext.Provider value={{ enabled, reduced, paused, toggle }}>{children}</MotionContext.Provider>;
}

export const useMotion = () => useContext(MotionContext);

export function MotionToggle() {
  const { enabled, reduced, toggle } = useMotion();
  const label = reduced ? "Interfeys harakati kamaytirilgan" : enabled ? "Interfeys harakatini to‘xtatish" : "Interfeys harakatini yoqish";
  return <button className="btn btn-icon motion-toggle" aria-label={label} title={label}
    aria-pressed={!enabled} disabled={reduced} onClick={toggle}>
    <BubbleIcon name={enabled ? "pause" : "play"} />
  </button>;
}

/** The selected surface stays the same object as the destination changes. */
export function MotionNav({ activeKey, label, className = "", children }: {
  activeKey: string; label: string; className?: string; children: ReactNode;
}) {
  const root = useRef<HTMLElement>(null);
  const marker = useRef<HTMLSpanElement>(null);
  const previous = useRef<DOMRect | null>(null);
  const animation = useRef<Animation>();
  const { enabled } = useMotion();
  useLayoutEffect(() => {
    const nav = root.current, surface = marker.current;
    if (!nav || !surface) return;
    function update() {
      const selected = nav!.querySelector<HTMLElement>('button[aria-current="page"], button[aria-selected="true"]');
      if (!selected) { surface!.hidden = true; return; }
      surface!.hidden = false;
      const bounds = nav!.getBoundingClientRect(), box = selected.getBoundingClientRect();
      const next = new DOMRect(box.x - bounds.x + nav!.scrollLeft, box.y - bounds.y + nav!.scrollTop, box.width, box.height);
      const before = previous.current;
      animation.current?.cancel();
      Object.assign(surface!.style, { left: `${next.x}px`, top: `${next.y}px`, width: `${next.width}px`, height: `${next.height}px` });
      if (enabled && before && (Math.abs(before.x - next.x) > 1 || Math.abs(before.y - next.y) > 1)) {
        animation.current = surface!.animate([
          { transform: `translate(${before.x - next.x}px, ${before.y - next.y}px) scale(${before.width / next.width}, ${before.height / next.height})` },
          { transform: "translate(0, 0) scale(1.025, 1.035)", offset: .72 },
          { transform: "translate(0, 0) scale(1)" },
        ], { duration: 440, easing });
      }
      previous.current = next;
    }
    update();
    const resize = new ResizeObserver(update);
    resize.observe(nav);
    void document.fonts.ready.then(() => { if (nav.isConnected) update(); });
    return () => { resize.disconnect(); animation.current?.cancel(); };
  }, [activeKey, enabled]);
  return <nav ref={root} className={`motion-nav ${className}`} aria-label={label}>
    <span ref={marker} className="motion-selection" aria-hidden="true" />
    {children}
  </nav>;
}

/** All decorative SVG motion shares one visible, pausable 8-second clock. */
export function useSceneClock<T extends Element>(root: RefObject<T>, draw: (seconds: number) => void, revision = "") {
  const { enabled } = useMotion();
  const latest = useRef(draw);
  latest.current = draw;
  useEffect(() => {
    const node = root.current;
    if (!node) return;
    let frame = 0, visible = false, elapsed = 0, last = 0;
    function tick(now: number) {
      if (last) elapsed += (now - last) / 1000;
      last = now;
      latest.current(elapsed % 8);
      frame = requestAnimationFrame(tick);
    }
    function sync() {
      cancelAnimationFrame(frame); last = 0;
      if (enabled && visible && !document.hidden) frame = requestAnimationFrame(tick);
      else if (!enabled) latest.current(4.4);
    }
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); });
    observer.observe(node);
    document.addEventListener("visibilitychange", sync);
    sync();
    return () => { cancelAnimationFrame(frame); observer.disconnect(); document.removeEventListener("visibilitychange", sync); };
  }, [enabled, root, revision]);
}
