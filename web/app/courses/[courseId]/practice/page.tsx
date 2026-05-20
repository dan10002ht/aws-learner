import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { getCourse, courses } from "@/data/courses";
import { setsForCourse } from "@/data/sets";
import { questions } from "@/data/questions";
import type { CourseId } from "@/lib/types";

export function generateStaticParams() {
  return courses.filter((c) => c.status === "available").map((c) => ({ courseId: c.id }));
}

function countQ(set: ReturnType<typeof setsForCourse>[number]): number {
  if (set.kind === "course-mock") {
    return questions.filter((q) => q.courseId === set.courseId).length;
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
  const mock = sets.find((s) => s.kind === "course-mock");
  const chapterSets = sets.filter((s) => s.kind === "chapter");
  const lessonSets = sets.filter((s) => s.kind === "lesson");

  return (
    <div className="space-y-8">
      <Link href={`/courses/${course.id}`} className="text-sm text-[var(--text-dim)] hover:text-[var(--text)]">
        ← Tổng quan {course.shortTitle}
      </Link>

      <header>
        <h1 className="text-2xl sm:text-3xl font-extrabold">Luyện đề</h1>
        <p className="text-[var(--text-dim)] mt-2">
          Practice = xem giải thích ngay sau mỗi câu. Exam = có timer, nộp bài cuối mới chấm điểm.
        </p>
      </header>

      {mock && (
        <section>
          <h2 className="text-lg font-bold mb-3">Đề tổng hợp</h2>
          <SetRow setKey={mock.key} courseId={course.id} label={mock.label} description={mock.description} count={countQ(mock)} />
        </section>
      )}

      <section>
        <h2 className="text-lg font-bold mb-3">Theo chương</h2>
        <div className="space-y-2">
          {chapterSets.map((s) => (
            <SetRow key={s.key} setKey={s.key} courseId={course.id} label={s.label} description={s.description} count={countQ(s)} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-bold mb-3">Theo bài</h2>
        <div className="space-y-2">
          {lessonSets.map((s) => (
            <SetRow key={s.key} setKey={s.key} courseId={course.id} label={s.label} description={s.description} count={countQ(s)} />
          ))}
        </div>
      </section>
    </div>
  );
}

function SetRow({ setKey, courseId, label, description, count }: {
  setKey: string; courseId: string; label: string; description: string; count: number;
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
        <Link
          href={disabled ? "#" : `/courses/${courseId}/exam/${encodeURIComponent(setKey)}`}
          className={`btn3d btn3d-secondary btn3d-sm flex-1 sm:flex-none ${disabled ? "pointer-events-none" : ""}`}
        >
          Exam <ChevronRight size={14} />
        </Link>
      </div>
    </div>
  );
}
