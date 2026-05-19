"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";
const KEY = "awl:theme";

const ThemeCtx = createContext<{ theme: Theme; toggle: () => void } | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const saved = typeof window !== "undefined" ? (localStorage.getItem(KEY) as Theme | null) : null;
    const prefersDark = typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
    const initial: Theme = saved ?? (prefersDark ? "dark" : "light");
    setTheme(initial);
    document.documentElement.classList.toggle("dark", initial === "dark");
  }, []);

  const toggle = useCallback(() => {
    setTheme((cur) => {
      const next: Theme = cur === "dark" ? "light" : "dark";
      document.documentElement.classList.toggle("dark", next === "dark");
      try { localStorage.setItem(KEY, next); } catch {}
      return next;
    });
  }, []);

  return <ThemeCtx.Provider value={{ theme, toggle }}>{children}</ThemeCtx.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeCtx);
  if (!ctx) throw new Error("useTheme outside ThemeProvider");
  return ctx;
}
