"use client";

import { Clock } from "lucide-react";
import { useEffect, useState } from "react";

interface Props {
  startMs: number;
  totalMs: number;
  onExpire?: () => void;
}

export default function Timer({ startMs, totalMs, onExpire }: Props) {
  const [remaining, setRemaining] = useState(() => Math.max(0, totalMs - (Date.now() - startMs)));

  useEffect(() => {
    const id = setInterval(() => {
      const r = Math.max(0, totalMs - (Date.now() - startMs));
      setRemaining(r);
      if (r === 0) { clearInterval(id); onExpire?.(); }
    }, 500);
    return () => clearInterval(id);
  }, [startMs, totalMs, onExpire]);

  const minutes = Math.floor(remaining / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);
  const warn = remaining < 60_000;
  return (
    <div className={`px-3 py-1.5 rounded-lg font-mono text-sm border-2 flex items-center gap-2 font-semibold ${
      warn ? "border-danger text-danger" : "border-[var(--border-strong)] text-[var(--text-dim)]"
    }`}>
      <Clock size={14} />
      {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
    </div>
  );
}
