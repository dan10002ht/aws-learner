"use client";

// <step-flow> in lesson markdown: an inline SVG whose parts carry data-step="N",
// plus <step-note data-step="N"> captions. Renders Prev/Play/Next controls,
// dims future steps, highlights the current one and runs a dot along its first
// line. On narrow screens the camera (SVG viewBox) zooms onto the active step;
// "Toàn cảnh" opens the whole diagram fullscreen. Without JS (SSR, print,
// search) the full static diagram stays visible.

import React, { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Maximize2, Minimize2, Pause, Play, RotateCcw, X } from "lucide-react";

const PLAY_MS = 3200;
const CAMERA_MS = 450;
const NARROW = "(max-width: 640px)";

type Box = { x: number; y: number; w: number; h: number };
type Lifeline = { x: number; name: string };

function isNote(node: React.ReactNode): node is React.ReactElement<{ "data-step"?: string; children?: React.ReactNode }> {
  return React.isValidElement(node) && node.type === "step-note";
}

const num = (el: Element, a: string) => Number(el.getAttribute(a));

// Sequence diagrams: tall dashed vertical lines are lifelines, the text above
// each one is its name. Other diagrams simply yield none.
function findLifelines(svg: SVGSVGElement, vb: Box): Lifeline[] {
  const texts = Array.from(svg.querySelectorAll("text")).filter((t) => !t.closest("[data-step]"));
  const out: Lifeline[] = [];
  svg.querySelectorAll("line[stroke-dasharray]").forEach((l) => {
    const x = num(l, "x1");
    const top = Math.min(num(l, "y1"), num(l, "y2"));
    if (x !== num(l, "x2") || Math.abs(num(l, "y2") - num(l, "y1")) < vb.h * 0.5) return;
    const label = texts.find((t) => Math.abs(num(t, "x") - x) < 30 && num(t, "y") < top + 4);
    if (label?.textContent) out.push({ x, name: label.textContent.trim() });
  });
  return out;
}

const nearest = (lls: Lifeline[], x: number) => {
  let best: Lifeline | undefined;
  for (const l of lls) if (Math.abs(l.x - x) < 24 && (!best || Math.abs(l.x - x) < Math.abs(best.x - x))) best = l;
  return best?.name;
};

export default function StepFlow(props: { children?: React.ReactNode }) {
  const kids = React.Children.toArray(props.children);
  const notes = new Map<number, React.ReactNode>();
  for (const k of kids) {
    if (isNote(k)) notes.set(Number(k.props["data-step"]), k.props.children);
  }
  const figure = kids.filter((k) => !isNote(k) && !(typeof k === "string" && !k.trim()));

  const boxRef = useRef<HTMLDivElement>(null);
  const origVB = useRef<Box | null>(null);
  const curVB = useRef<Box | null>(null);
  const camAnim = useRef(0);
  const lifelines = useRef<Lifeline[]>([]);

  const [total, setTotal] = useState(0);
  const [step, setStep] = useState(0); // 0 = overview (everything visible)
  const [playing, setPlaying] = useState(false);
  const [narrow, setNarrow] = useState(false);
  const [full, setFull] = useState(false);
  const [route, setRoute] = useState<string | null>(null);

  useEffect(() => {
    const box = boxRef.current;
    const svg = box?.querySelector<SVGSVGElement>(".step-flow-figure svg");
    if (!box || !svg) return;
    const els = box.querySelectorAll<SVGElement>(".step-flow-figure svg [data-step]");
    setTotal(Math.max(0, ...Array.from(els, (e) => Number(e.getAttribute("data-step")) || 0)));
    const [x, y, w, h] = (svg.getAttribute("viewBox") ?? "").split(/[\s,]+/).map(Number);
    if ([x, y, w, h].every(Number.isFinite) && w > 0) {
      origVB.current = { x, y, w, h };
      curVB.current = { x, y, w, h };
      lifelines.current = findLifelines(svg, origVB.current);
    }
    const mq = window.matchMedia(NARROW);
    const sync = () => setNarrow(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  // Smoothly move the SVG viewBox (the "camera") to a target box.
  const moveCamera = useCallback((to: Box) => {
    const svg = boxRef.current?.querySelector<SVGSVGElement>(".step-flow-figure svg");
    const from = curVB.current;
    if (!svg || !from) return;
    cancelAnimationFrame(camAnim.current);
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const set = (b: Box) => {
      curVB.current = b;
      svg.setAttribute("viewBox", `${b.x} ${b.y} ${b.w} ${b.h}`);
    };
    if (reduce) return set(to);
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / CAMERA_MS);
      const e = p < 0.5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2;
      set({
        x: from.x + (to.x - from.x) * e,
        y: from.y + (to.y - from.y) * e,
        w: from.w + (to.w - from.w) * e,
        h: from.h + (to.h - from.h) * e,
      });
      if (p < 1) camAnim.current = requestAnimationFrame(tick);
    };
    camAnim.current = requestAnimationFrame(tick);
  }, []);

  // Paint step states, aim the camera, and run the dot along the active arrow.
  useEffect(() => {
    const box = boxRef.current;
    const svg = box?.querySelector<SVGSVGElement>(".step-flow-figure svg");
    if (!box || !svg) return;
    box.dataset.active = step ? "1" : "0";
    let activeEl: SVGGraphicsElement | null = null;
    box.querySelectorAll<SVGGraphicsElement>(".step-flow-figure svg [data-step]").forEach((el) => {
      const n = Number(el.getAttribute("data-step"));
      const state = !step ? "" : n < step ? "past" : n === step ? "active" : "future";
      el.setAttribute("data-state", state);
      if (state === "active" && !activeEl) activeEl = el;
    });
    const act = activeEl as SVGGraphicsElement | null;
    const line = act?.querySelector("line") ?? null;

    const from = line ? nearest(lifelines.current, num(line, "x1")) : undefined;
    const to = line ? nearest(lifelines.current, num(line, "x2")) : undefined;
    setRoute(from && to && from !== to ? `${from} → ${to}` : null);

    const vb = origVB.current;
    if (vb) {
      if (narrow && !full && act) {
        const b = act.getBBox();
        const pad = 22;
        const w = Math.min(vb.w, Math.max(vb.w * 0.5, b.width + pad * 2));
        const h = (w * vb.h) / vb.w;
        const cx = b.x + b.width / 2;
        const cy = b.y + b.height / 2;
        moveCamera({
          x: Math.min(vb.x + vb.w - w, Math.max(vb.x, cx - w / 2)),
          y: Math.min(vb.y + vb.h - h, Math.max(vb.y, cy - h / 2)),
          w,
          h,
        });
      } else {
        moveCamera(vb);
      }
    }
    // Fullscreen lays out asynchronously: wait, then bring the active step into view.
    const scrollT = full && act ? setTimeout(() => act.scrollIntoView?.({ block: "center", behavior: "smooth" }), 350) : 0;

    // A dot runs along every arrow of the active step: straight <line>s and
    // elbow <path>s (architecture diagrams) alike.
    svg.querySelectorAll(".sf-dot").forEach((d) => d.remove());
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const arrows = act ? Array.from(act.querySelectorAll<SVGGeometryElement>("line[marker-end], path[marker-end]")) : [];
    if (!arrows.length && line) arrows.push(line);
    if (!arrows.length || reduce) return () => clearTimeout(scrollT);
    const runs = arrows.map((a) => {
      const stroke = a.getAttribute("stroke");
      const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      dot.setAttribute("class", "sf-dot");
      dot.setAttribute("r", "6");
      dot.setAttribute("fill", stroke && stroke !== "currentColor" ? stroke : "#0ea5e9");
      svg.appendChild(dot);
      return { a, dot, len: a.getTotalLength() };
    });
    const DOT_MS = 1100;
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = ((now - t0) % DOT_MS) / DOT_MS;
      const e = p < 0.5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2;
      const opacity = p < 0.15 ? p / 0.15 : p > 0.85 ? (1 - p) / 0.15 : 1;
      for (const r of runs) {
        const pt = r.a.getPointAtLength(e * r.len);
        r.dot.setAttribute("cx", String(pt.x));
        r.dot.setAttribute("cy", String(pt.y));
        r.dot.setAttribute("opacity", String(opacity));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      clearTimeout(scrollT);
      cancelAnimationFrame(raf);
      runs.forEach((r) => r.dot.remove());
    };
  }, [step, narrow, full, moveCamera]);

  useEffect(() => {
    if (!playing) return;
    if (step >= total) {
      setPlaying(false);
      return;
    }
    const t = setTimeout(() => setStep((s) => s + 1), step === 0 ? 300 : PLAY_MS);
    return () => clearTimeout(t);
  }, [playing, step, total]);

  // Fullscreen: native API where it exists (+ landscape lock on Android),
  // otherwise a fixed overlay. Either way the box gets .step-flow-full.
  const enterFull = async () => {
    setFull(true);
    const box = boxRef.current;
    try {
      if (box?.requestFullscreen) {
        await box.requestFullscreen();
        await (screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> }).lock?.("landscape");
      }
    } catch {}
  };
  const exitFull = useCallback(() => {
    setFull(false);
    try {
      if (document.fullscreenElement) document.exitFullscreen();
    } catch {}
  }, []);

  useEffect(() => {
    if (!full) return;
    const onFs = () => { if (!document.fullscreenElement && boxRef.current?.dataset.native === "1") setFull(false); };
    const onEsc = (e: KeyboardEvent) => { if (e.key === "Escape") exitFull(); };
    const t = setTimeout(() => { if (boxRef.current) boxRef.current.dataset.native = document.fullscreenElement ? "1" : "0"; }, 300);
    document.addEventListener("fullscreenchange", onFs);
    window.addEventListener("keydown", onEsc);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      clearTimeout(t);
      document.removeEventListener("fullscreenchange", onFs);
      window.removeEventListener("keydown", onEsc);
      document.body.style.overflow = prev;
    };
  }, [full, exitFull]);

  const go = useCallback(
    (d: number) => {
      setPlaying(false);
      setStep((s) => Math.min(total, Math.max(0, s + d)));
    },
    [total],
  );

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") { e.preventDefault(); go(1); }
    if (e.key === "ArrowLeft") { e.preventDefault(); go(-1); }
  };

  const togglePlay = () => {
    if (playing) return setPlaying(false);
    if (step >= total) setStep(0);
    setPlaying(true);
  };

  const atEnd = step >= total && total > 0;

  return (
    <div
      ref={boxRef}
      className={`step-flow not-prose my-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 outline-none ${
        full ? "step-flow-full" : ""
      }`}
      tabIndex={0}
      onKeyDown={onKey}
      aria-label="Sơ đồ từng bước: dùng phím mũi tên trái/phải để chuyển bước"
    >
      <div className="step-flow-head flex items-center justify-between gap-2 mb-2">
        <span className="text-xs font-mono font-semibold text-[var(--text-dim)] truncate">
          {route ?? (step ? "" : "Toàn bộ flow")}
        </span>
        {full ? (
          <button className="btn3d btn3d-secondary btn3d-sm !px-2.5 !py-1.5 shrink-0" onClick={exitFull} aria-label="Đóng toàn cảnh">
            <X size={15} /> Đóng
          </button>
        ) : (
          <button className="btn3d btn3d-secondary btn3d-sm !px-2.5 !py-1.5 shrink-0" onClick={enterFull} aria-label="Xem toàn cảnh">
            <Maximize2 size={14} /> Toàn cảnh
          </button>
        )}
      </div>

      <div className="step-flow-figure">{figure}</div>
      {full && <p className="step-flow-rotate mt-1 text-center text-xs text-[var(--text-mute)]">Xoay ngang điện thoại để xem rõ hơn</p>}

      <div className="mt-3 flex items-center gap-2 sm:gap-3">
        <button className="btn3d btn3d-secondary btn3d-sm !px-2.5" onClick={() => go(-1)} disabled={step === 0} aria-label="Bước trước">
          <ChevronLeft size={16} />
        </button>
        <button className="btn3d btn3d-primary btn3d-sm min-w-[6.5rem] justify-center" onClick={togglePlay}>
          {playing ? <Pause size={16} /> : atEnd ? <RotateCcw size={16} /> : <Play size={16} />}
          {playing ? "Dừng" : atEnd ? "Xem lại" : step ? "Chạy tiếp" : "Chạy"}
        </button>
        <button className="btn3d btn3d-secondary btn3d-sm !px-2.5" onClick={() => go(1)} disabled={atEnd} aria-label="Bước sau">
          <ChevronRight size={16} />
        </button>
        <div className="flex-1 flex items-center gap-1 min-w-0" role="group" aria-label="Chọn bước">
          {Array.from({ length: total }, (_, i) => (
            <button
              key={i}
              onClick={() => { setPlaying(false); setStep(i + 1); }}
              aria-label={`Bước ${i + 1}`}
              aria-current={i + 1 === step ? "step" : undefined}
              className="group flex-1 py-2"
            >
              <span
                className={`block h-1.5 rounded-full transition-colors ${
                  i + 1 === step
                    ? "bg-brand-500"
                    : i + 1 < step
                      ? "bg-brand-500/45"
                      : "bg-[var(--border-strong)] group-hover:bg-[var(--text-mute)]"
                }`}
              />
            </button>
          ))}
        </div>
        <span className="shrink-0 text-sm font-mono font-semibold tabular-nums text-[var(--text-dim)]">
          {step}/{total}
        </span>
        {full && (
          <button className="step-flow-min btn3d btn3d-secondary btn3d-sm !px-2.5" onClick={exitFull} aria-label="Thu nhỏ">
            <Minimize2 size={16} />
          </button>
        )}
      </div>

      <div className="step-flow-note mt-2 min-h-[3.5rem] rounded-lg bg-[var(--surface-2)] px-3 py-2 text-sm leading-relaxed text-[var(--text)]" aria-live="polite">
        {step ? (
          <>
            <span className="font-mono font-semibold text-brand-600 dark:text-brand-500 mr-2">{step}</span>
            {notes.get(step)}
          </>
        ) : (
          <span className="text-[var(--text-dim)]">Bấm Chạy, hoặc dùng nút / phím mũi tên để đi từng bước.</span>
        )}
      </div>
    </div>
  );
}
