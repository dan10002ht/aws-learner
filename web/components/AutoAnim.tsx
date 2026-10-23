"use client";

// <auto-anim data-dur="10"> in lesson markdown: one or more inline SVGs that
// animate themselves with SMIL (<animate>, keyTimes over data-dur seconds).
// Several SVGs sit side by side on desktop and stack on phones, sharing one
// clock. Adds pause / restart and a time readout; starts paused under
// prefers-reduced-motion and pauses while scrolled out of view. Without JS the
// SVGs still run (SMIL needs no script).

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Pause, Play, RotateCcw } from "lucide-react";

export default function AutoAnim(props: { "data-dur"?: string; children?: React.ReactNode }) {
  const dur = Number(props["data-dur"]) || 0;
  const kids = React.Children.toArray(props.children).filter((k) => !(typeof k === "string" && !k.trim()));
  const boxRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(true);
  const [t, setT] = useState(0);
  const userPaused = useRef(false);

  const svgs = () => Array.from(boxRef.current?.querySelectorAll<SVGSVGElement>(".auto-anim-figs > svg") ?? []);

  const apply = useCallback((run: boolean) => {
    for (const s of svgs()) (run ? s.unpauseAnimations() : s.pauseAnimations());
    setPlaying(run);
  }, []);

  // One clock for every SVG in the group.
  const restart = () => {
    for (const s of svgs()) s.setCurrentTime(0);
    userPaused.current = false;
    apply(true);
  };

  useEffect(() => {
    const now = svgs()[0]?.getCurrentTime() ?? 0;
    for (const s of svgs()) s.setCurrentTime(now);
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      userPaused.current = true;
      apply(false);
    }
    const io = new IntersectionObserver(([e]) => {
      if (userPaused.current) return;
      apply(e.isIntersecting);
    });
    if (boxRef.current) io.observe(boxRef.current);
    return () => io.disconnect();
  }, [apply]);

  // Time readout, so a caption can say "ở giây thứ 4".
  useEffect(() => {
    if (!dur) return;
    let raf = 0;
    const tick = () => {
      const s = svgs()[0];
      if (s) setT(s.getCurrentTime() % dur);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [dur]);

  const toggle = () => {
    userPaused.current = playing;
    apply(!playing);
  };

  return (
    <div ref={boxRef} className="auto-anim not-prose my-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
      <div className="auto-anim-figs flex flex-wrap gap-3">{kids}</div>
      <div className="mt-3 flex items-center gap-2">
        <button className="btn3d btn3d-primary btn3d-sm min-w-[6.5rem] justify-center" onClick={toggle}>
          {playing ? <Pause size={16} /> : <Play size={16} />}
          {playing ? "Tạm dừng" : "Chạy"}
        </button>
        <button className="btn3d btn3d-secondary btn3d-sm !px-2.5" onClick={restart} aria-label="Chạy lại từ đầu">
          <RotateCcw size={16} />
        </button>
        {dur > 0 && (
          <div className="flex-1 flex items-center gap-2 min-w-0" aria-hidden>
            <div className="flex-1 h-1.5 rounded-full bg-[var(--border-strong)] overflow-hidden">
              <div className="h-full bg-brand-500" style={{ width: `${(t / dur) * 100}%` }} />
            </div>
            <span className="shrink-0 text-sm font-mono font-semibold tabular-nums text-[var(--text-dim)]">
              t = {t.toFixed(1)} s
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
