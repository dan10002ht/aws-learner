"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import ThemeToggle from "./ThemeToggle";
import StatsBar from "./StatsBar";

export default function Navbar() {
  const path = usePathname();
  const links = [
    { href: "/", label: "Courses" },
    { href: "/history", label: "History" },
    { href: "/wrong-answers", label: "Review" },
  ];

  return (
    <nav className="sticky top-0 z-40 backdrop-blur bg-[var(--surface)]/85 border-b border-[var(--border)]">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
        <Link href="/" className="font-extrabold tracking-tight text-lg">
          AWS<span className="text-brand-500">Learner</span>
        </Link>
        <div className="flex items-center gap-1 text-sm">
          {links.map((l) => {
            const active = l.href === "/" ? path === "/" : path?.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`px-3 py-1.5 rounded-md font-medium transition ${
                  active ? "text-brand-600" : "text-[var(--text-dim)] hover:text-[var(--text)]"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </div>
        <div className="flex items-center gap-3">
          <StatsBar />
          <ThemeToggle />
        </div>
      </div>
    </nav>
  );
}
