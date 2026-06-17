import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { getCourse, courses } from "@/data/courses";
import { setsForCourse } from "@/data/sets";
import { questions } from "@/data/questions";
import { questionsInCourse } from "@/lib/questions";
import type { CourseId } from "@/lib/types";

export function generateStaticParams() {
  // Cert courses always have questions; knowledge courses only once their
  // practice bank has been authored. Gate on "has any question" so we don't
  // generate empty practice pages for courses still awaiting content.
  return courses
    .filter((c) => c.status === "available" && questionsInCourse(c.id).length > 0)
    .map((c) => ({ courseId: c.id }));
}

function countQ(set: ReturnType<typeof setsForCourse>[number]): number {
  if (set.kind === "course-mock") {
    return questions.filter(
      (q) => q.courseId === set.courseId && (set.mock === undefined || q.mock === set.mock)
    ).length;
  }
  if (set.lessonSlugs) {
    const ls = new Set(set.lessonSlugs);
    return questions.filter((q) => q.courseId === set.courseId && ls.has(q.lesson)).length;
  }
  return 0;
}

export default function PracticeListPage({ params }: { params: { courseId: string } }) {
  const course = getCourse(params.courseId as CourseId);
  if (!course) notFound();
  const sets = setsForCourse(course.id);
  const mockSets = sets.filter((s) => s.kind === "course-mock");
  const chapterSets = sets.filter((s) => s.kind === "chapter");
  const lessonSets = sets.filter((s) => s.kind === "lesson");
  // Knowledge courses have practice quizzes but no timed exam (no passing score).
  const examEnabled = course.kind !== "knowledge";

  return (
    <div className="space-y-8">
      <Link href={`/courses/${course.id}`} className="text-sm text-[var(--text-dim)] hover:text-[var(--text)]">
        ← Tổng quan {course.shortTitle}
      </Link>

      <header>
        <h1 className="text-2xl sm:text-3xl font-extrabold">{examEnabled ? "Luyện đề" : "Luyện tập"}</h1>
        <p className="text-[var(--text-dim)] mt-2">
          {examEnabled
            ? "Practice = xem giải thích ngay sau mỗi câu. Exam = có timer, nộp bài cuối mới chấm điểm."
            : "Trả lời từng câu và xem giải thích ngay — củng cố kiến thức sau mỗi bài học."}
        </p>
      </header>

      {mockSets.length > 0 && (
        <section>
          <h2 className="text-lg font-bold mb-3">Đề mô phỏng (Full Mock)</h2>
          <p className="text-sm text-[var(--text-dim)] mb-3">
            Mỗi bộ là một đề cố định, trộn câu theo blueprint thật của kỳ thi. Luyện lần lượt từng bộ để bao quát toàn bộ đề.
          </p>
          <div className="space-y-2">
            {mockSets.map((s) => (
              <SetRow key={s.key} setKey={s.key} courseId={course.id} label={s.label} description={s.description} count={countQ(s)} examEnabled={examEnabled} />
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-lg font-bold mb-3">Theo chương</h2>
        <div className="space-y-2">
          {chapterSets.map((s) => (
            <SetRow key={s.key} setKey={s.key} courseId={course.id} label={s.label} description={s.description} count={countQ(s)} examEnabled={examEnabled} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-bold mb-3">Theo bài</h2>
        <div className="space-y-2">
          {lessonSets.map((s) => (
            <SetRow key={s.key} setKey={s.key} courseId={course.id} label={s.label} description={s.description} count={countQ(s)} examEnabled={examEnabled} />
          ))}
        </div>
      </section>
    </div>
  );
}

function SetRow({ setKey, courseId, label, description, count, examEnabled }: {
  setKey: string; courseId: string; label: string; description: string; count: number; examEnabled: boolean;
}) {
  const disabled = count === 0;
  return (
    <div className={`card p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${disabled ? "opacity-50" : ""}`}>
      <div className="min-w-0 flex-1">
        <div className="font-semibold">{label}</div>
        <div className="text-sm text-[var(--text-dim)] mt-0.5">{description}</div>
        <div className="text-xs text-[var(--text-mute)] mt-1">{count} câu khả dụng</div>
      </div>
      <div className="flex items-center gap-2 sm:flex-shrink-0">
        <Link
          href={disabled ? "#" : `/courses/${courseId}/practice/${encodeURIComponent(setKey)}`}
          className={`btn3d btn3d-primary btn3d-sm flex-1 sm:flex-none ${disabled ? "pointer-events-none" : ""}`}
        >
          Practice <ChevronRight size={14} />
        </Link>
        {examEnabled && (
          <Link
            href={disabled ? "#" : `/courses/${courseId}/exam/${encodeURIComponent(setKey)}`}
            className={`btn3d btn3d-secondary btn3d-sm flex-1 sm:flex-none ${disabled ? "pointer-events-none" : ""}`}
          >
            Exam <ChevronRight size={14} />
          </Link>
        )}
      </div>
    </div>
  );
}
