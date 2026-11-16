import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";

export function MotionBackground() {
  const video = useRef<HTMLVideoElement>(null);
  const layer = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(() => {
    try {
      return localStorage.getItem("uzhi-background-motion") === "paused";
    } catch {
      return false;
    }
  });
  const [reduced, setReduced] = useState(
    () => matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [visible, setVisible] = useState(true);
  const [hidden, setHidden] = useState(document.hidden);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const raw = new URLSearchParams(window.location.search).get("motion_t");
  const frozen =
    raw !== null && Number.isFinite(Number(raw)) && Number(raw) >= 0
      ? Number(raw)
      : null;
  const running = !paused && !reduced && visible && !hidden && frozen === null;

  useEffect(() => {
    const query = matchMedia("(prefers-reduced-motion: reduce)");
    const motion = () => setReduced(query.matches);
    const visibility = () => setHidden(document.hidden);
    query.addEventListener("change", motion);
    document.addEventListener("visibilitychange", visibility);
    const target = layer.current?.closest(".domain-page");
    const observer = new IntersectionObserver(([entry]) =>
      setVisible(entry.isIntersecting),
    );
    if (target) observer.observe(target);
    return () => {
      query.removeEventListener("change", motion);
      document.removeEventListener("visibilitychange", visibility);
      observer.disconnect();
      video.current?.pause();
    };
  }, []);
  useEffect(() => {
    let active = true;
    const media = video.current;
    if (!media) return;
    if (running && !failed)
      media
        .play()
        .then(() => {
          if (active) setBlocked(false);
        })
        .catch((error) => {
          if (!active || error.name === "AbortError") return;
          if (
            error.name === "NotSupportedError" ||
            error.name === "NetworkError"
          ) {
            setFailed(true);
            setBlocked(false);
          } else setBlocked(true);
        });
    else media.pause();
    return () => {
      active = false;
      media.pause();
    };
  }, [running, failed]);
  const freeze = () => {
    if (
      frozen === null ||
      !video.current ||
      !Number.isFinite(video.current.duration)
    )
      return;
    video.current.pause();
    video.current.currentTime = frozen % video.current.duration;
  };
  function toggle() {
    if (blocked && video.current) {
      video.current
        .play()
        .then(() => {
          setBlocked(false);
          setPaused(false);
        })
        .catch(() => {
          setFailed(true);
          setBlocked(false);
        });
      return;
    }
    const next = !paused;
    setPaused(next);
    try {
      localStorage.setItem(
        "uzhi-background-motion",
        next ? "paused" : "playing",
      );
    } catch {
      /* Controls continue to work without persistent preferences. */
    }
  }
  return (
    <>
      <div
        ref={layer}
        className="motion-background"
        aria-hidden="true"
        data-driver={failed ? "mesh" : "video"}
        data-running={running}
        data-ready={ready}
        data-frozen={frozen !== null}
      >
        <div className="motion-poster" />
        <video
          ref={video}
          src={reduced ? undefined : "/media/uzhi-dashboard-loop.mp4"}
          poster="/media/uzhi-dashboard-poster.jpg"
          muted
          loop
          playsInline
          preload={reduced ? "none" : "metadata"}
          tabIndex={-1}
          onLoadedMetadata={freeze}
          onLoadedData={() => {
            setReady(true);
            freeze();
          }}
          onError={() => {
            video.current?.pause();
            if (!reduced) {
              setFailed(true);
              setBlocked(false);
            }
          }}
        />
        <div className="motion-mesh" />
        <div className="motion-scrim" />
      </div>
      <div className="motion-controls">
        <button
          className="btn btn-small"
          disabled={reduced || frozen !== null}
          onClick={toggle}
          aria-label={
            reduced
              ? "Statik fon: harakat kamaytirilgan"
              : blocked
                ? "Fon videosini ishga tushirish"
                : paused
                  ? "Fon harakatini yoqish"
                  : "Fon harakatini to‘xtatish"
          }
        >
          {paused || blocked || reduced ? (
            <Play size={14} />
          ) : (
            <Pause size={14} />
          )}
          {reduced
            ? "Statik fon"
            : blocked
              ? "Videoni ijro etish"
              : paused
                ? "Fonni ijro etish"
                : "Fonni to‘xtatish"}
        </button>
      </div>
    </>
  );
}
