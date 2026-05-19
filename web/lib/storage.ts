"use client";

import type { AttemptSummary, ProgressState, WrongQuestionEntry } from "./types";

const KEY_HISTORY = "awl:history";
const KEY_WRONG = "awl:wrong";
const KEY_PROGRESS = "awl:progress";

function safeGet<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}
function safeSet<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

// ---------- History ----------
export function getHistory(): AttemptSummary[] { return safeGet<AttemptSummary[]>(KEY_HISTORY, []); }
export function saveAttempt(a: AttemptSummary) {
  const cur = getHistory();
  cur.unshift(a);
  safeSet(KEY_HISTORY, cur.slice(0, 100));
}
export function clearHistory() { safeSet(KEY_HISTORY, []); }
export function deleteAttempt(id: string) {
  safeSet(KEY_HISTORY, getHistory().filter((x) => x.id !== id));
}

// ---------- Wrong answers ----------
export function getWrongEntries(): WrongQuestionEntry[] { return safeGet<WrongQuestionEntry[]>(KEY_WRONG, []); }
export function getWrongIds(): string[] { return getWrongEntries().map((e) => e.questionId); }
export function recordWrong(ids: string[]) {
  const cur = getWrongEntries();
  const map = new Map(cur.map((e) => [e.questionId, e]));
  const now = Date.now();
  for (const id of ids) {
    const prev = map.get(id);
    if (prev) { prev.wrongCount += 1; prev.lastWrongAt = now; }
    else map.set(id, { questionId: id, wrongCount: 1, lastWrongAt: now });
  }
  safeSet(KEY_WRONG, Array.from(map.values()));
}
export function removeWrong(id: string) {
  safeSet(KEY_WRONG, getWrongEntries().filter((e) => e.questionId !== id));
}
export function clearWrong() { safeSet(KEY_WRONG, []); }

// ---------- Progress (XP + streak + lessons completed) ----------
function todayStr(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function daysBetween(aStr: string, bStr: string): number {
  const a = new Date(aStr), b = new Date(bStr);
  return Math.round((+b - +a) / 86_400_000);
}

export function getProgress(): ProgressState {
  return safeGet<ProgressState>(KEY_PROGRESS, { xp: 0, streakDays: 0, lastActiveDate: "", lessonsCompleted: [] });
}
export function addXp(delta: number) {
  const cur = getProgress();
  cur.xp += delta;
  const today = todayStr();
  if (cur.lastActiveDate === today) {
    // same day → no streak change
  } else if (cur.lastActiveDate && daysBetween(cur.lastActiveDate, today) === 1) {
    cur.streakDays += 1;
  } else {
    cur.streakDays = 1;
  }
  cur.lastActiveDate = today;
  safeSet(KEY_PROGRESS, cur);
}
export function markLessonRead(courseId: string, slug: string) {
  const cur = getProgress();
  const id = `${courseId}:${slug}`;
  if (!cur.lessonsCompleted.includes(id)) {
    cur.lessonsCompleted.push(id);
    cur.xp += 20;
    addXp(0); // sync streak
  }
  safeSet(KEY_PROGRESS, cur);
}
export function isLessonRead(courseId: string, slug: string): boolean {
  return getProgress().lessonsCompleted.includes(`${courseId}:${slug}`);
}
export function levelFromXp(xp: number) {
  // each level requires 200 XP, level 1 starts at 0
  const level = Math.floor(xp / 200) + 1;
  const xpInLevel = xp % 200;
  return { level, xpInLevel, xpForNext: 200 };
}
