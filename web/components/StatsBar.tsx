"use client";

import { useEffect, useState } from "react";
import { Flame, Zap } from "lucide-react";
import { getProgress, levelFromXp } from "@/lib/storage";

export default function StatsBar() {
  const [progress, setProgress] = useState<{ xp: number; streakDays: number } | null>(null);

  useEffect(() => {
    const sync = () => {
      const p = getProgress();
      setProgress({ xp: p.xp, streakDays: p.streakDays });
    };
    sync();
    const id = setInterval(sync, 2000);
    window.addEventListener("storage", sync);
    return () => {
      clearInterval(id);
      window.removeEventListener("storage", sync);
    };
  }, []);

  if (!progress) return <div className="w-32" />;
  const lvl = levelFromXp(progress.xp);
  return (
    <div className="flex items-center gap-3 text-sm">
      <div className="flex items-center gap-1.5" title="Streak (số ngày liên tiếp)">
        <Flame size={16} className="text-orange-500" />
        <span className="font-semibold">{progress.streakDays}</span>
      </div>
      <div className="flex items-center gap-1.5" title="XP / Level">
        <Zap size={16} className="text-yellow-500" />
        <span className="font-semibold">{progress.xp}</span>
        <span className="text-[var(--text-mute)] text-xs">L{lvl.level}</span>
      </div>
    </div>
  );
}
