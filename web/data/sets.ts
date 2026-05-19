import type { CourseId } from "@/lib/types";
import { chaptersOfCourse, lessonsOfCourse } from "./lessons";
import { getCourse } from "./courses";

export type SetKind = "lesson" | "chapter" | "course-mock" | "wrong-answers";

export interface QuestionSet {
  key: string;
  kind: SetKind;
  courseId: CourseId;
  label: string;
  description: string;
  lessonSlugs?: string[];
  defaultExamMinutes: number;
  defaultCount: number;
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

  const mock: QuestionSet = {
    key: `${courseId}|mock`,
    kind: "course-mock",
    courseId,
    label: `${course.code} — Full Mock`,
    description: `Đề mô phỏng đầy đủ ${course.examQuestions} câu, ${course.examMinutes} phút.`,
    defaultCount: course.examQuestions,
    defaultExamMinutes: course.examMinutes,
  };

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

  return [mock, ...chapterSets, ...lessonSets];
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
  return setsForCourse(courseId).find((s) => s.key === key);
}
