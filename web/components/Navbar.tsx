"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GraduationCap, History, RotateCcw } from "lucide-react";
import ThemeToggle from "./ThemeToggle";
import StatsBar from "./StatsBar";

export default function Navbar() {
  const path = usePathname();
  const links = [
    { href: "/", label: "Courses", icon: GraduationCap },
    { href: "/history", label: "History", icon: History },
    { href: "/wrong-answers", label: "Review", icon: RotateCcw },
  ];

  return (
    <nav className="sticky top-0 z-40 backdrop-blur bg-[var(--surface)]/85 border-b border-[var(--border)]">
      <div className="max-w-6xl mx-auto px-3 sm:px-4 h-14 flex items-center justify-between gap-2 sm:gap-4">
        <Link href="/" className="font-extrabold tracking-tight text-base sm:text-lg shrink-0">
          AWS<span className="text-brand-500">Learner</span>
        </Link>

        <div className="flex items-center gap-0.5 sm:gap-1 text-sm">
          {links.map((l) => {
            const active = l.href === "/" ? path === "/" : path?.startsWith(l.href);
            const Icon = l.icon;
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`px-2 sm:px-3 py-1.5 rounded-md font-medium transition flex items-center gap-1.5 ${
                  active ? "text-brand-600" : "text-[var(--text-dim)] hover:text-[var(--text)]"
                }`}
                aria-label={l.label}
              >
                <Icon size={16} className="sm:hidden" />
                <span className="hidden sm:inline">{l.label}</span>
              </Link>
            );
          })}
        </div>

        <div className="flex items-center gap-1 sm:gap-3 shrink-0">
          <StatsBar />
          <ThemeToggle />
        </div>
      </div>
    </nav>
  );
}
