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
  /**
   * Smart exam ordering: interleave questions by domain (round-robin from
   * shuffled per-domain buckets) so domains are spread evenly through the
   * exam — mimicking the mixed pattern of the real exam — instead of
   * clustering. Overrides shuffleQuestions when set.
   */
  smartOrder?: boolean;
  /**
   * Blueprint exam: sample `limit` questions from the whole course pool
   * weighted by the official domain mix, then interleave by domain. Used for
   * the single "Mô phỏng thi" full exam.
   */
  blueprintExam?: boolean;
  limit?: number;
  wrongIds?: string[];
}

export interface PreparedQuestion {
  q: Question;
  optionMap: number[];
}

/**
 * Spread questions evenly across domains: shuffle each domain's bucket, then
 * round-robin pull one from each bucket. Domains with more questions (per the
 * blueprint weighting) naturally appear more often but never cluster.
 */
function interleaveByDomain(items: PreparedQuestion[]): PreparedQuestion[] {
  const buckets = new Map<number, PreparedQuestion[]>();
  for (const p of items) {
    const d = p.q.domain ?? 0;
    if (!buckets.has(d)) buckets.set(d, []);
    buckets.get(d)!.push(p);
  }
  const shuffledBuckets = [...buckets.values()].map((b) => shuffle(b));
  const result: PreparedQuestion[] = [];
  const maxLen = Math.max(0, ...shuffledBuckets.map((b) => b.length));
  for (let i = 0; i < maxLen; i++) {
    for (const b of shuffledBuckets) {
      if (i < b.length) result.push(b[i]);
    }
  }
  return result;
}

/** Official domain weighting per course (fraction of scored content). */
const DOMAIN_WEIGHTS: Record<string, Record<number, number>> = {
  "CLF-C02": { 1: 0.24, 2: 0.30, 3: 0.34, 4: 0.12 },
  "SAA-C03": { 1: 0.30, 2: 0.26, 3: 0.24, 4: 0.20 },
};
const DEFAULT_WEIGHTS: Record<number, number> = { 1: 0.25, 2: 0.25, 3: 0.25, 4: 0.25 };

/**
 * Sample `limit` questions from a pool following the exam blueprint domain
 * weighting for the course, backfilling from leftovers if a domain is short.
 */
function pickByBlueprint(pool: Question[], limit: number, courseId: string): Question[] {
  const weights = DOMAIN_WEIGHTS[courseId] ?? DEFAULT_WEIGHTS;
  const buckets: Record<number, Question[]> = { 1: [], 2: [], 3: [], 4: [] };
  const others: Question[] = [];
  for (const q of pool) {
    if (q.domain && buckets[q.domain]) buckets[q.domain].push(q);
    else others.push(q);
  }
  for (const d of [1, 2, 3, 4]) buckets[d] = shuffle(buckets[d]);

  const picked: Question[] = [];
  for (const d of [1, 2, 3, 4]) {
    const target = Math.round(limit * weights[d]);
    const n = Math.min(target, buckets[d].length);
    picked.push(...buckets[d].slice(0, n));
    buckets[d] = buckets[d].slice(n);
  }
  if (picked.length < limit) {
    const leftover = shuffle([...buckets[1], ...buckets[2], ...buckets[3], ...buckets[4], ...others]);
    picked.push(...leftover.slice(0, limit - picked.length));
  }
  return picked.slice(0, limit);
}

export function buildQuestions(opts: BuildOptions): PreparedQuestion[] {
  const set = getSet(opts.setKey);
  if (!set) return [];

  let pool: Question[] = [];

  if (set.kind === "wrong-answers") {
    const ids = new Set(opts.wrongIds ?? []);
    pool = questions.filter((q) => ids.has(q.id) && q.courseId === set.courseId);
  } else if (set.kind === "course-mock") {
    pool = questions.filter(
      (q) => q.courseId === set.courseId && (set.mock === undefined || q.mock === set.mock)
    );
  } else if (set.lessonSlugs && set.lessonSlugs.length) {
    const ls = new Set(set.lessonSlugs);
    pool = questions.filter((q) => q.courseId === set.courseId && ls.has(q.lesson));
  }

  // Blueprint full exam: weighted sample across the whole pool, then interleave.
  if (opts.blueprintExam) {
    const limit = opts.limit && opts.limit > 0 ? opts.limit : pool.length;
    const picked = pickByBlueprint(pool, limit, set.courseId);
    let prep = interleaveByDomain(picked.map((q) => ({ q, optionMap: q.options.map((_, i) => i) })));
    if (opts.shuffleOptions) {
      prep = prep.map(({ q, optionMap }) => ({ q, optionMap: shuffle(optionMap) }));
    }
    return prep;
  }

  let prepared = pool.map((q) => ({ q, optionMap: q.options.map((_, i) => i) }));
  if (opts.smartOrder) {
    prepared = interleaveByDomain(prepared);
  } else if (opts.shuffleQuestions) {
    prepared = shuffle(prepared);
  }
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
