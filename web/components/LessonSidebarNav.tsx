"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

interface LessonLike {
  slug: string;
  order: number;
  shortTitle: string;
}
interface LessonGroup {
  label: string;
  lessons: LessonLike[];
}

export default function LessonSidebarNav({
  courseId,
  currentSlug,
  groups,
}: {
  courseId: string;
  currentSlug: string;
  groups: LessonGroup[];
}) {
  const activeIdx = groups.findIndex((g) => g.lessons.some((l) => l.slug === currentSlug));
  // Only the active lesson's domain is expanded by default.
  const [open, setOpen] = useState<Set<number>>(() => new Set(activeIdx >= 0 ? [activeIdx] : [0]));

  const toggle = (i: number) =>
    setOpen((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });

  return (
    <nav className="flex flex-col gap-1.5">
      {groups.map((g, gi) => {
        const isOpen = open.has(gi);
        const hasActive = g.lessons.some((l) => l.slug === currentSlug);
        return (
          <div key={gi} className="flex flex-col gap-0.5">
            <button
              onClick={() => toggle(gi)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-left text-[0.7rem] font-bold uppercase tracking-wide leading-tight transition hover:text-[var(--text)] ${
                hasActive ? "text-brand-600" : "text-[var(--text-mute)]"
              }`}
            >
              <ChevronRight size={12} className={`shrink-0 transition-transform ${isOpen ? "rotate-90" : ""}`} />
              <span className="flex-1">{g.label}</span>
              {!isOpen && <span className="font-mono text-[0.65rem] opacity-70">{g.lessons.length}</span>}
            </button>
            {isOpen &&
              g.lessons.map((l) => (
                <Link
                  key={l.slug}
                  href={`/courses/${courseId}/learn/${l.slug}`}
                  className={`text-sm pl-7 pr-3 py-1.5 rounded-md transition flex gap-2 ${
                    l.slug === currentSlug
                      ? "bg-brand-500/10 text-brand-600 font-semibold"
                      : "text-[var(--text-dim)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
                  }`}
                >
                  <span className="text-[var(--text-mute)] font-mono text-xs mt-0.5">{String(l.order).padStart(2, "0")}</span>
                  <span>{l.shortTitle}</span>
                </Link>
              ))}
          </div>
        );
      })}
    </nav>
  );
}
