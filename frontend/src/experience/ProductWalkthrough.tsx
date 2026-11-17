import { useEffect, useRef, useState } from "react";
import { Play, Pause, RotateCcw, X } from "lucide-react";
import { useMotion } from "./MotionEffects";

export function ProductWalkthrough() {
  const [open, setOpen] = useState(false);
  return <>
    <button className="btn walkthrough-trigger" onClick={() => setOpen(true)}><Play size={15} /> UzHi qanday ishlaydi?</button>
    {open && <WalkthroughDialog onClose={() => setOpen(false)} />}
  </>;
}

function WalkthroughDialog({ onClose }: { onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const player = useRef<HTMLIFrameElement>(null);
  const { enabled } = useMotion();
  const [paused, setPaused] = useState(!enabled);
  const playing = enabled && !paused;
  function command(reset = false) {
    player.current?.contentWindow?.postMessage({ type: "uzhi-motion", paused: !playing, reset }, window.location.origin);
  }
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const node = dialog.current;
    const overflow = document.body.style.overflow;
    node?.showModal();
    document.body.style.overflow = "hidden";
    return () => { node?.close(); document.body.style.overflow = overflow; previous?.focus(); };
  }, []);
  useEffect(() => { command(); }, [playing]);
  return <dialog ref={dialog} className="walkthrough-dialog panel" role="dialog" aria-labelledby="walkthrough-title"
    onCancel={(event) => { event.preventDefault(); onClose(); }}
    onClick={(event) => { if (event.target === event.currentTarget) {
      const box = event.currentTarget.getBoundingClientRect();
      if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) onClose();
    } }}>
    <div className="walkthrough-heading"><div><p className="eyebrow">UZLUKSIZ HIMOYA</p><h2 id="walkthrough-title">Jarayondan tiklanish rejasigacha</h2></div>
      <button className="btn btn-icon" aria-label="Ko‘rinishni yopish" onClick={onClose}><X size={20} /></button>
    </div>
    <iframe ref={player} src={`/effect.html${enabled ? "" : "?render&t=4.4"}`} title="UzHi: jarayon, BIA va riskdan tiklanish rejasigacha" tabIndex={-1} onLoad={() => command()} />
    <div className="walkthrough-controls">
      <p>Jarayonni aniqlang, ta’sir va riskni baholang, tiklanish rejasini tayyorlang.</p>
      <button className="btn btn-small" aria-label={playing ? "Ko‘rinishni to‘xtatish" : "Ko‘rinishni ijro etish"} disabled={!enabled} onClick={() => setPaused(!paused)}>{playing ? <Pause size={14} /> : <Play size={14} />}{playing ? "To‘xtatish" : "Ijro etish"}</button>
      <button className="btn btn-small" aria-label="Ko‘rinishni boshidan ko‘rish" onClick={() => command(true)}><RotateCcw size={14} /> Qayta</button>
    </div>
  </dialog>;
}
