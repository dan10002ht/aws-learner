"use client";

import React, { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";

const LABELS: Record<string, string> = {
  python: "Python",
  javascript: "JavaScript",
  typescript: "TypeScript",
  java: "Java",
  go: "Go",
  csharp: "C#",
  cpp: "C++",
  c: "C",
  ruby: "Ruby",
  php: "PHP",
  kotlin: "Kotlin",
  swift: "Swift",
  rust: "Rust",
};

const PREF_KEY = "preferredCodeLang";

export default function CodeTabs(props: { "data-langs"?: string; children?: React.ReactNode }) {
  const langs = String(props["data-langs"] ?? "")
    .split(",")
    .filter(Boolean);
  const panels = React.Children.toArray(props.children).filter(React.isValidElement);
  const [active, setActive] = useState(0);
  const [copied, setCopied] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Default to the user's preferred language when this group offers it.
  useEffect(() => {
    try {
      const pref = localStorage.getItem(PREF_KEY);
      if (pref) {
        const idx = langs.indexOf(pref);
        if (idx >= 0) setActive(idx);
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pick = (i: number) => {
    setActive(i);
    try {
      localStorage.setItem(PREF_KEY, langs[i]);
      // let other CodeTabs on the page follow along
      window.dispatchEvent(new CustomEvent("codelang", { detail: langs[i] }));
    } catch {}
  };

  // Follow language switches made in other tab groups on the page.
  useEffect(() => {
    const onLang = (e: Event) => {
      const lang = (e as CustomEvent).detail as string;
      const idx = langs.indexOf(lang);
      if (idx >= 0) setActive(idx);
    };
    window.addEventListener("codelang", onLang);
    return () => window.removeEventListener("codelang", onLang);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props["data-langs"]]);

  const copy = async () => {
    const text = panelRef.current?.innerText ?? "";
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  return (
    <div className="code-tabs not-prose my-4 rounded-xl border border-[var(--border)] overflow-hidden bg-[var(--surface-2)]">
      <div className="flex items-center justify-between gap-2 px-2 pt-1.5 border-b border-[var(--border)]">
        <div className="flex items-center gap-1 flex-wrap">
          {langs.map((l, i) => (
            <button
              key={l}
              onClick={() => pick(i)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-t-md transition border-b-2 -mb-px ${
                i === active
                  ? "text-brand-600 border-brand-500"
                  : "text-[var(--text-dim)] border-transparent hover:text-[var(--text)]"
              }`}
            >
              {LABELS[l] ?? l}
            </button>
          ))}
        </div>
        <button
          onClick={copy}
          className="flex items-center gap-1 px-2 py-1 text-xs text-[var(--text-mute)] hover:text-[var(--text)] transition"
          title="Copy code"
        >
          {copied ? <Check size={14} className="text-success" /> : <Copy size={14} />}
        </button>
      </div>
      <div ref={panelRef} className="code-tabs-panel [&>pre]:my-0 [&>pre]:rounded-none [&>pre]:border-0">
        {panels.map((p, i) => (
          <div key={i} className={i === active ? "" : "hidden"}>
            {p}
          </div>
        ))}
      </div>
    </div>
  );
}
