"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight, Check } from "lucide-react";
import { getProgress } from "@/lib/storage";

interface LessonLike {
  slug: string;
  order: number;
  shortTitle: string;
}
interface ChapterLike {
  id: string;
  title: string;
  lessons: LessonLike[];
}

export default function ChapterAccordion({
  courseId,
  chapters,
}: {
  courseId: string;
  chapters: ChapterLike[];
}) {
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [readSet, setReadSet] = useState<Set<string>>(new Set());

  // Read-progress lives in localStorage — load after mount to avoid hydration mismatch.
  useEffect(() => {
    const done = getProgress().lessonsCompleted;
    setReadSet(new Set(done));
  }, []);

  const toggle = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  return (
    <div className="space-y-2">
      {chapters.map((c, idx) => {
        const isOpen = open.has(c.id);
        const readCount = c.lessons.filter((l) => readSet.has(`${courseId}:${l.slug}`)).length;
        const allRead = c.lessons.length > 0 && readCount === c.lessons.length;
        return (
          <div key={c.id} className="card overflow-hidden">
            <button
              onClick={() => toggle(c.id)}
              className="w-full p-4 flex items-center justify-between gap-3 text-left hover:bg-[var(--surface-2)] transition"
            >
              <div className="flex items-center gap-4 min-w-0">
                <span className="font-mono text-sm text-[var(--text-mute)] w-8">{String(idx + 1).padStart(2, "0")}</span>
                <div className="min-w-0">
                  <div className="font-semibold truncate">{c.title}</div>
                  <div className="text-xs text-[var(--text-dim)] mt-0.5">
                    {readCount}/{c.lessons.length} bài đã đọc
                    {allRead && <Check size={12} className="inline ml-1 text-success" strokeWidth={3} />}
                  </div>
                </div>
              </div>
              <ChevronRight
                size={18}
                className={`flex-shrink-0 text-[var(--text-mute)] transition-transform ${isOpen ? "rotate-90" : ""}`}
              />
            </button>

            {isOpen && (
              <div className="border-t border-[var(--border)] py-1.5 px-2 animate-fade-up">
                {c.lessons.map((l) => {
                  const read = readSet.has(`${courseId}:${l.slug}`);
                  return (
                    <Link
                      key={l.slug}
                      href={`/courses/${courseId}/learn/${l.slug}`}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-[var(--text-dim)] hover:bg-[var(--surface-2)] hover:text-[var(--text)] transition"
                    >
                      <span className="font-mono text-xs text-[var(--text-mute)] w-6">{String(l.order).padStart(2, "0")}</span>
                      <span className="flex-1">{l.shortTitle}</span>
                      {read && <Check size={14} className="text-success" strokeWidth={3} />}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
