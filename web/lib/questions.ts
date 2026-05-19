import { questions } from "@/data/questions";
import { getSet } from "@/data/sets";
import type { CourseId, Question } from "./types";

export function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export interface BuildOptions {
  setKey: string;
  shuffleQuestions?: boolean;
  shuffleOptions?: boolean;
  limit?: number;
  wrongIds?: string[];
}

export interface PreparedQuestion {
  q: Question;
  optionMap: number[];
}

export function buildQuestions(opts: BuildOptions): PreparedQuestion[] {
  const set = getSet(opts.setKey);
  if (!set) return [];

  let pool: Question[] = [];

  if (set.kind === "wrong-answers") {
    const ids = new Set(opts.wrongIds ?? []);
    pool = questions.filter((q) => ids.has(q.id) && q.courseId === set.courseId);
  } else if (set.kind === "course-mock") {
    pool = questions.filter((q) => q.courseId === set.courseId);
  } else if (set.lessonSlugs && set.lessonSlugs.length) {
    const ls = new Set(set.lessonSlugs);
    pool = questions.filter((q) => q.courseId === set.courseId && ls.has(q.lesson));
  }

  let prepared = pool.map((q) => ({ q, optionMap: q.options.map((_, i) => i) }));
  if (opts.shuffleQuestions) prepared = shuffle(prepared);
  if (opts.limit && opts.limit > 0) prepared = prepared.slice(0, opts.limit);
  if (opts.shuffleOptions) {
    prepared = prepared.map(({ q, optionMap }) => ({ q, optionMap: shuffle(optionMap) }));
  }

  return prepared;
}

export function isCorrect(q: Question, optionMap: number[], displayedSelection: number[]): boolean {
  const selectedOriginal = displayedSelection.map((i) => optionMap[i]).sort();
  const correct = q.correctIndices.slice().sort();
  if (selectedOriginal.length !== correct.length) return false;
  return selectedOriginal.every((v, i) => v === correct[i]);
}

export function questionsInCourse(courseId: CourseId): Question[] {
  return questions.filter((q) => q.courseId === courseId);
}

export function questionsInLesson(courseId: CourseId, slug: string): Question[] {
  return questions.filter((q) => q.courseId === courseId && q.lesson === slug);
}
