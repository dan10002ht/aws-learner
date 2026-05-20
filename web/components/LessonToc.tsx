"use client";

import { useEffect, useState } from "react";
import type { TocItem } from "@/lib/toc";

interface Props {
  items: TocItem[];
}

export default function LessonToc({ items }: Props) {
  const [activeSlug, setActiveSlug] = useState<string>("");

  useEffect(() => {
    if (items.length === 0) return;
    const headings = items
      .map((i) => document.getElementById(i.slug))
      .filter((el): el is HTMLElement => el !== null);
    if (headings.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Pick the heading currently nearest the top (intersecting)
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) {
          setActiveSlug(visible[0].target.id);
        }
      },
      { rootMargin: "-80px 0px -70% 0px", threshold: 0 }
    );
    headings.forEach((h) => observer.observe(h));
    return () => observer.disconnect();
  }, [items]);

  if (items.length === 0) return null;

  return (
    <nav className="text-sm">
      <div className="text-xs font-bold uppercase tracking-widest text-[var(--text-dim)] mb-3">Mục lục</div>
      <ul className="space-y-1 border-l border-[var(--border)]">
        {items.map((it) => {
          const isActive = it.slug === activeSlug;
          return (
            <li key={it.slug} style={{ paddingLeft: it.depth === 3 ? 16 : 0 }}>
              <a
                href={`#${it.slug}`}
                className={`block py-1 pl-3 -ml-px border-l-2 transition leading-snug ${
                  isActive
                    ? "border-brand-500 text-brand-600 font-semibold"
                    : "border-transparent text-[var(--text-dim)] hover:text-[var(--text)]"
                } ${it.depth === 3 ? "text-xs" : ""}`}
              >
                {it.text}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
