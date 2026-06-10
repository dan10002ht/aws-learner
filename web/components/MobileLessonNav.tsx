"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { List, ListChecks, X, ChevronLeft } from "lucide-react";
import type { TocItem } from "@/lib/toc";

interface LessonLike {
  slug: string;
  order: number;
  shortTitle: string;
}

interface LessonGroup {
  label: string;
  lessons: LessonLike[];
}

interface Props {
  courseId: string;
  courseCode: string;
  currentSlug: string;
  currentLessonOrder: number;
  currentShortTitle: string;
  lessons: LessonLike[];
  groups?: LessonGroup[];
  toc: TocItem[];
  practiceCount: number;
}

type SheetKind = "lessons" | "toc" | null;

export default function MobileLessonNav({
  courseId,
  courseCode,
  currentSlug,
  currentLessonOrder,
  currentShortTitle,
  lessons,
  groups,
  toc,
  practiceCount,
}: Props) {
  // Group by chapter (exam domain) when provided, else one unnamed group.
  const lessonGroups: LessonGroup[] = groups?.length ? groups : [{ label: "", lessons }];
  const [sheet, setSheet] = useState<SheetKind>(null);
  const [progress, setProgress] = useState(0);
  const [activeHeading, setActiveHeading] = useState("");

  // Reading progress (rAF-throttled)
  useEffect(() => {
    let ticking = false;
    const update = () => {
      const doc = document.documentElement;
      const total = doc.scrollHeight - doc.clientHeight;
      const p = total > 0 ? Math.min(1, Math.max(0, window.scrollY / total)) : 0;
      setProgress(p);
      ticking = false;
    };
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  // Active heading tracking (for TOC sheet highlight)
  useEffect(() => {
    if (toc.length === 0) return;
    const headings = toc
      .map((i) => document.getElementById(i.slug))
      .filter((el): el is HTMLElement => el !== null);
    if (headings.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) setActiveHeading(visible[0].target.id);
      },
      { rootMargin: "-120px 0px -70% 0px", threshold: 0 }
    );
    headings.forEach((h) => observer.observe(h));
    return () => observer.disconnect();
  }, [toc]);

  // Body scroll lock + ESC to close while sheet open
  useEffect(() => {
    if (!sheet) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSheet(null);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [sheet]);

  return (
    <>
      {/* Sticky context bar (sits under navbar h-14). Must be a direct child of
          a tall ancestor (the <article>) so sticky has room to slide — wrapping
          it in a short <div> would unstick it as soon as the user scrolls. */}
      <div className="lg:hidden sticky top-14 z-30 -mx-3 sm:-mx-4 mb-4 bg-[var(--surface)]/90 backdrop-blur border-b border-[var(--border)]">
        <div className="px-3 sm:px-4 h-11 flex items-center gap-2">
          <Link
            href={`/courses/${courseId}`}
            aria-label="Tổng quan khoá"
            className="shrink-0 p-1.5 -ml-1.5 rounded-md text-[var(--text-dim)] hover:bg-[var(--surface-2)]"
          >
            <ChevronLeft size={18} />
          </Link>

          <button
            onClick={() => setSheet("lessons")}
            className="flex-1 min-w-0 flex items-center gap-2 text-left h-full"
            aria-label="Chọn bài học"
          >
            <span className="text-[11px] font-mono text-[var(--text-mute)] shrink-0">
              {courseCode} · {currentLessonOrder}/{lessons.length}
            </span>
            <span className="text-sm font-semibold truncate">{currentShortTitle}</span>
            <span className="text-[var(--text-dim)] text-xs shrink-0">▾</span>
          </button>

          {toc.length > 0 && (
            <button
              onClick={() => setSheet("toc")}
              aria-label="Mục lục bài này"
              className="shrink-0 p-2 rounded-md text-[var(--text-dim)] hover:bg-[var(--surface-2)] active:bg-[var(--surface-3)]"
            >
              <List size={18} />
            </button>
          )}

          {practiceCount > 0 && (
            <Link
              href={`/courses/${courseId}/practice/${encodeURIComponent(`${courseId}|lesson|${currentSlug}`)}`}
              aria-label={`Luyện ${practiceCount} câu`}
              className="shrink-0 inline-flex items-center gap-1 px-2.5 h-8 rounded-lg bg-brand-500 text-white text-xs font-bold shadow-[0_2px_0_#ea580c] active:translate-y-[1px] active:shadow-[0_1px_0_#ea580c]"
            >
              <ListChecks size={14} />
              <span>{practiceCount}</span>
            </Link>
          )}
        </div>

        {/* Reading progress */}
        <div className="h-[2px] bg-transparent">
          <div
            className="h-full bg-brand-500 transition-[width] duration-75"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      </div>

      {/* Bottom sheets — position:fixed so they can sit anywhere in the tree */}
      <Sheet
        open={sheet === "lessons"}
        title="Danh sách bài học"
        onClose={() => setSheet(null)}
      >
        <nav className="flex flex-col gap-3 pb-2">
          {lessonGroups.map((g, gi) => (
            <div key={gi} className="flex flex-col gap-0.5">
              {g.label && (
                <div className="text-[0.7rem] font-bold uppercase tracking-wide text-[var(--text-mute)] px-3 pt-1 pb-0.5 leading-tight">
                  {g.label}
                </div>
              )}
              {g.lessons.map((l) => {
                const isCurrent = l.slug === currentSlug;
                return (
                  <Link
                    key={l.slug}
                    href={`/courses/${courseId}/learn/${l.slug}`}
                    onClick={() => setSheet(null)}
                    className={`flex items-center gap-3 px-3 py-3 rounded-lg transition ${
                      isCurrent
                        ? "bg-brand-500/10 text-brand-600 font-semibold"
                        : "text-[var(--text-dim)] active:bg-[var(--surface-2)]"
                    }`}
                  >
                    <span className="font-mono text-xs w-7 shrink-0 text-[var(--text-mute)]">
                      {String(l.order).padStart(2, "0")}
                    </span>
                    <span className="text-[15px] leading-snug">{l.shortTitle}</span>
                    {isCurrent && (
                      <span className="ml-auto text-[10px] uppercase tracking-wider text-brand-500 font-bold">
                        đang đọc
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
      </Sheet>

      <Sheet
        open={sheet === "toc"}
        title="Mục lục bài này"
        onClose={() => setSheet(null)}
      >
        <nav className="pb-2">
          {toc.map((it) => {
            const isActive = it.slug === activeHeading;
            return (
              <a
                key={it.slug}
                href={`#${it.slug}`}
                onClick={() => setSheet(null)}
                className={`block py-2.5 pr-3 rounded-md transition ${
                  isActive
                    ? "text-brand-600 font-semibold bg-brand-500/5"
                    : "text-[var(--text-dim)] active:bg-[var(--surface-2)]"
                } ${it.depth === 3 ? "pl-8 text-[13px]" : "pl-3 text-[15px]"}`}
              >
                {it.text}
              </a>
            );
          })}
        </nav>
      </Sheet>
    </>
  );
}

/* ----- Bottom sheet primitive (drag-to-dismiss + backdrop) ----- */

function Sheet({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  const [show, setShow] = useState(false);
  const startY = useRef<number | null>(null);
  const [dragY, setDragY] = useState(0);

  // Mount/unmount with transition
  useEffect(() => {
    if (open) {
      setMounted(true);
      // next frame → trigger transition
      requestAnimationFrame(() => setShow(true));
    } else {
      setShow(false);
      const t = setTimeout(() => setMounted(false), 220);
      return () => clearTimeout(t);
    }
  }, [open]);

  if (!mounted) return null;

  const onTouchStart = (e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY;
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (startY.current === null) return;
    const delta = e.touches[0].clientY - startY.current;
    if (delta > 0) setDragY(delta);
  };
  const onTouchEnd = () => {
    if (dragY > 80) {
      onClose();
    }
    setDragY(0);
    startY.current = null;
  };

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={title}>
      {/* Backdrop */}
      <button
        aria-label="Đóng"
        onClick={onClose}
        className={`absolute inset-0 bg-black/50 transition-opacity duration-200 ${
          show ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* Panel */}
      <div
        className={`absolute inset-x-0 bottom-0 bg-[var(--surface)] rounded-t-2xl border-t border-[var(--border)] shadow-2xl flex flex-col max-h-[85vh] transition-transform duration-200 ${
          show ? "translate-y-0" : "translate-y-full"
        }`}
        style={{ transform: show ? `translateY(${dragY}px)` : undefined }}
      >
        {/* Drag handle + header */}
        <div
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          className="shrink-0 pt-2.5 pb-2 px-4 border-b border-[var(--border)] cursor-grab active:cursor-grabbing select-none"
        >
          <div className="mx-auto w-10 h-1 rounded-full bg-[var(--border-strong)] mb-2.5" />
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-[15px]">{title}</h3>
            <button
              onClick={onClose}
              aria-label="Đóng"
              className="p-1.5 -mr-1.5 rounded-md text-[var(--text-dim)] hover:bg-[var(--surface-2)]"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-2 py-2 scrollbar-thin overscroll-contain">
          {children}
        </div>
      </div>
    </div>
  );
}
