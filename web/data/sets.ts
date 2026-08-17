import type { CourseId } from "@/lib/types";
import { chaptersOfCourse, lessonsOfCourse } from "./lessons";
import { getCourse } from "./courses";
import { questions } from "./questions";

export type SetKind = "lesson" | "chapter" | "course-mock" | "wrong-answers";

export interface QuestionSet {
  key: string;
  kind: SetKind;
  courseId: CourseId;
  label: string;
  description: string;
  lessonSlugs?: string[];
  mock?: number;          // for course-mock: which fixed mock set
  fixedOrder?: boolean;   // giữ nguyên thứ tự câu/đáp án của bộ đề gốc
  defaultExamMinutes: number;
  defaultCount: number;
}

/**
 * Các mock giữ nguyên thứ tự câu và thứ tự đáp án như bộ đề gốc, thay vì trộn như
 * mock tự sinh — để bám sát trải nghiệm làm đề thật. Người dùng vẫn bật lại trộn
 * được ở màn hình setup.
 */
const FIXED_ORDER_MOCKS: Partial<Record<CourseId, number[]>> = {
  "SAA-C03": [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
};

/** Distinct mock numbers available for a course, sorted ascending. */
function mockNumbers(courseId: CourseId): number[] {
  const nums = new Set<number>();
  for (const q of questions) {
    if (q.courseId === courseId && typeof q.mock === "number") nums.add(q.mock);
  }
  return [...nums].sort((a, b) => a - b);
}

export function questionsInMock(courseId: CourseId, mock: number): number {
  return questions.filter((q) => q.courseId === courseId && q.mock === mock).length;
}

/**
 * The single full "Mô phỏng thi" exam set: pulls from the whole course pool
 * (mock undefined) and is sampled by blueprint weighting at runtime. Used on
 * the exam page; not listed among the fixed practice mocks.
 */
export function courseExamSet(courseId: CourseId): QuestionSet | undefined {
  const course = getCourse(courseId);
  if (!course) return undefined;
  return {
    key: `${courseId}|mock`,
    kind: "course-mock",
    courseId,
    mock: undefined,
    label: `${course.code} — Mô phỏng thi`,
    description: `Trộn thông minh theo blueprint, ${course.examQuestions} câu, ${course.examMinutes} phút.`,
    defaultCount: course.examQuestions,
    defaultExamMinutes: course.examMinutes,
  };
}

/**
 * Build all sets available within a course.
 *  - Course full mock
 *  - One set per chapter
 *  - One set per lesson
 */
export function setsForCourse(courseId: CourseId): QuestionSet[] {
  const course = getCourse(courseId);
  if (!course) return [];

  // Một bộ "Mock đề" cố định cho mỗi số mock có trong ngân hàng câu hỏi.
  // Mỗi mock được cân bằng theo blueprint (D1 24% / D2 30% / D3 34% / D4 12%).
  const mocks = mockNumbers(courseId);
  const mockSets: QuestionSet[] = mocks.map((n) => {
    const fixedOrder = (FIXED_ORDER_MOCKS[courseId] ?? []).includes(n);
    return {
      key: `${courseId}|mock|${n}`,
      kind: "course-mock" as const,
      courseId,
      mock: n,
      fixedOrder,
      label: `${course.code} — Mock đề ${n}`,
      description: fixedOrder
        ? `Đề cố định #${n}, giữ nguyên thứ tự gốc (${course.examQuestions} câu, ${course.examMinutes} phút).`
        : `Đề mô phỏng cố định #${n}, cân theo blueprint (~${course.examQuestions} câu, ${course.examMinutes} phút).`,
      defaultCount: course.examQuestions,
      defaultExamMinutes: course.examMinutes,
    };
  });

  const chapterSets: QuestionSet[] = chaptersOfCourse(courseId).map((c) => ({
    key: `${courseId}|chapter|${c.id}`,
    kind: "chapter",
    courseId,
    label: c.title,
    description: `Toàn bộ câu hỏi của ${c.title}.`,
    lessonSlugs: c.lessonSlugs,
    defaultCount: 20,
    defaultExamMinutes: 20,
  }));

  const lessonSets: QuestionSet[] = lessonsOfCourse(courseId).map((l) => ({
    key: `${courseId}|lesson|${l.slug}`,
    kind: "lesson",
    courseId,
    label: l.title,
    description: `Câu hỏi cho bài ${l.title}.`,
    lessonSlugs: [l.slug],
    defaultCount: 10,
    defaultExamMinutes: 10,
  }));

  return [...mockSets, ...chapterSets, ...lessonSets];
}

export function getSet(key: string): QuestionSet | undefined {
  if (key.startsWith("wrong|")) {
    const courseId = key.split("|")[1] as CourseId;
    return {
      key,
      kind: "wrong-answers",
      courseId,
      label: "Câu sai cần ôn lại",
      description: "Tự động gom các câu bạn đã làm sai để luyện lại.",
      defaultCount: 50,
      defaultExamMinutes: 15,
    };
  }
  const parts = key.split("|");
  const courseId = parts[0] as CourseId;
  // Full exam set: `${courseId}|mock` (no mock number).
  if (parts.length === 2 && parts[1] === "mock") {
    return courseExamSet(courseId);
  }
  return setsForCourse(courseId).find((s) => s.key === key);
}
