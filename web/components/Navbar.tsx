"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GraduationCap, History, RotateCcw } from "lucide-react";
import ThemeToggle from "./ThemeToggle";
import CommandPalette from "./CommandPalette";

const links = [
  { href: "/", label: "Courses", icon: GraduationCap },
  { href: "/history", label: "History", icon: History },
  { href: "/wrong-answers", label: "Review", icon: RotateCcw },
];

export default function Navbar() {
  const path = usePathname();
  const isActive = (href: string) =>
    href === "/" ? path === "/" : !!path?.startsWith(href);

  return (
    <nav className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--surface)]/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-3 sm:px-4">
        {/* Logo */}
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 font-extrabold tracking-tight"
        >
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-brand-500 text-white shadow-sm">
            <GraduationCap size={16} />
          </span>
          <span className="hidden text-base sm:inline sm:text-lg">
            AWS<span className="text-brand-500">Learner</span>
          </span>
        </Link>

        {/* Center nav */}
        <div className="flex flex-1 items-center justify-center">
          <div className="flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--surface-2)] p-1">
            {links.map((l) => {
              const active = isActive(l.href);
              const Icon = l.icon;
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  aria-label={l.label}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition ${
                    active
                      ? "bg-brand-500 text-white shadow-sm"
                      : "text-[var(--text-dim)] hover:bg-brand-500/10 hover:text-[var(--text)]"
                  }`}
                >
                  <Icon size={16} />
                  <span className="hidden sm:inline">{l.label}</span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Right actions */}
        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <CommandPalette />
          <ThemeToggle />
        </div>
      </div>
    </nav>
  );
}
