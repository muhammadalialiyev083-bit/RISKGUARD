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
  const { enabled, reduced } = useMotion();
  const [playback, setPlayback] = useState({ playing: enabled, manual: false, restart: 0 });
  const source = useRef(`/effect.html?render${enabled ? "" : "&t=4.4"}`);
  const hasPlayed = useRef(enabled);
  const lastRestart = useRef(0);
  const { playing } = playback;
  function command(reset = false) {
    player.current?.contentWindow?.postMessage({ type: "uzhi-motion", paused: !playing, reset, userInitiated: playback.manual }, window.location.origin);
  }
  function play(restart = false) {
    const reset = restart || !hasPlayed.current;
    hasPlayed.current = true;
    setPlayback(state => ({ playing: true, manual: true, restart: state.restart + Number(reset) }));
  }
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const node = dialog.current;
    const overflow = document.body.style.overflow;
    node?.showModal();
    document.body.style.overflow = "hidden";
    return () => { node?.close(); document.body.style.overflow = overflow; previous?.focus(); };
  }, []);
  useEffect(() => {
    if (!enabled) hasPlayed.current = false;
    setPlayback(state => state.playing === enabled && !state.manual ? state : { ...state, playing: enabled, manual: false });
  }, [enabled, reduced]);
  useEffect(() => {
    command(playback.restart !== lastRestart.current);
    lastRestart.current = playback.restart;
  }, [playback]);
  return <dialog ref={dialog} className="walkthrough-dialog panel" role="dialog" aria-labelledby="walkthrough-title"
    onCancel={(event) => { event.preventDefault(); onClose(); }}
    onClick={(event) => { if (event.target === event.currentTarget) {
      const box = event.currentTarget.getBoundingClientRect();
      if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) onClose();
    } }}>
    <div className="walkthrough-heading"><div><p className="eyebrow">UZLUKSIZ HIMOYA</p><h2 id="walkthrough-title">Jarayondan tiklanish rejasigacha</h2></div>
      <button className="btn btn-icon" aria-label="Ko‘rinishni yopish" onClick={onClose}><X size={20} /></button>
    </div>
    <iframe ref={player} src={source.current} title="UzHi: jarayon, BIA va riskdan tiklanish rejasigacha" tabIndex={-1} onLoad={() => command(playback.restart > 0)} />
    <div className="walkthrough-controls">
      <p>Jarayonni aniqlang, ta’sir va riskni baholang, tiklanish rejasini tayyorlang.</p>
      <button className="btn btn-small" aria-label={playing ? "Ko‘rinishni to‘xtatish" : "Ko‘rinishni ijro etish"} onClick={() => playing ? setPlayback(state => ({ ...state, playing: false, manual: false })) : play()}>{playing ? <Pause size={14} /> : <Play size={14} />}{playing ? "To‘xtatish" : "Ijro etish"}</button>
      <button className="btn btn-small" aria-label="Ko‘rinishni boshidan ko‘rish" onClick={() => play(true)}><RotateCcw size={14} /> Qayta</button>
    </div>
    {!enabled && !playing && <p className="walkthrough-motion-note">Avtomatik ijro o‘chiq. Animatsiyani “Ijro etish” orqali yoqishingiz mumkin.</p>}
  </dialog>;
}
