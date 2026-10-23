"use client";

// <ab-toggle data-labels="Không chống|Single-flight"> in lesson markdown: two
// (or more) inline SVGs drawn on the same layout, plus <ab-note> captions in the
// same order. Shows one state at a time on a shared canvas, so switching makes
// only the parts that differ move. Without JS the first state shows.

import React, { useState } from "react";

function isNote(node: React.ReactNode): node is React.ReactElement<{ children?: React.ReactNode }> {
  return React.isValidElement(node) && node.type === "ab-note";
}

export default function ABToggle(props: { "data-labels"?: string; children?: React.ReactNode }) {
  const kids = React.Children.toArray(props.children).filter((k) => !(typeof k === "string" && !k.trim()));
  const notes = kids.filter(isNote).map((n) => n.props.children);
  const panels = kids.filter((k) => !isNote(k));
  const labels = String(props["data-labels"] ?? "").split("|");
  const [active, setActive] = useState(0);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") { e.preventDefault(); setActive((a) => Math.min(panels.length - 1, a + 1)); }
    if (e.key === "ArrowLeft") { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
  };

  return (
    <div className="ab-toggle not-prose my-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
      <div
        role="tablist"
        aria-label="Chọn trạng thái để so sánh"
        onKeyDown={onKey}
        className="mb-3 inline-flex rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-1 gap-1 max-w-full"
      >
        {panels.map((_, i) => (
          <button
            key={i}
            role="tab"
            aria-selected={i === active}
            tabIndex={i === active ? 0 : -1}
            onClick={() => setActive(i)}
            className={`px-3 py-1.5 text-sm font-semibold rounded-md transition truncate ${
              i === active
                ? "bg-brand-500 text-white shadow-sm"
                : "text-[var(--text-dim)] hover:text-[var(--text)]"
            }`}
          >
            {labels[i] || String.fromCharCode(65 + i)}
          </button>
        ))}
      </div>

      <div className="ab-toggle-stage grid">
        {panels.map((p, i) => (
          <div
            key={i}
            role="tabpanel"
            aria-hidden={i !== active}
            className={`[grid-area:1/1] transition-opacity duration-300 ${i === active ? "opacity-100" : "opacity-0 pointer-events-none"}`}
          >
            {p}
          </div>
        ))}
      </div>

      {notes[active] && (
        <div className="mt-2 rounded-lg bg-[var(--surface-2)] px-3 py-2 text-sm leading-relaxed text-[var(--text)]" aria-live="polite">
          <span className="font-semibold text-brand-600 dark:text-brand-500 mr-2">{labels[active]}</span>
          {notes[active]}
        </div>
      )}
    </div>
  );
}
