import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, Clock } from "lucide-react";
import { courses, getCourse } from "@/data/courses";
import { setsForCourse, courseExamSet } from "@/data/sets";
import { questions } from "@/data/questions";
import type { CourseId } from "@/lib/types";

export function generateStaticParams() {
  return courses.filter((c) => c.status === "available" && c.kind !== "knowledge").map((c) => ({ courseId: c.id }));
}

export default function ExamListPage({ params }: { params: { courseId: string } }) {
  const course = getCourse(params.courseId as CourseId);
  if (!course) notFound();
  const sets = setsForCourse(course.id);
  const examSet = courseExamSet(course.id);
  const examCount = questions.filter((q) => q.courseId === course.id).length;
  const chapters = sets.filter((s) => s.kind === "chapter");

  return (
    <div className="space-y-8">
      <Link href={`/courses/${course.id}`} className="text-sm text-[var(--text-dim)] hover:text-[var(--text)]">
        ← Tổng quan {course.shortTitle}
      </Link>
      <header>
        <h1 className="text-2xl sm:text-3xl font-extrabold">Mô phỏng thi</h1>
        <p className="text-[var(--text-dim)] mt-2">Có timer. Không hiện đáp án cho tới khi nộp bài. Kết quả ghi vào History.</p>
      </header>

      {examSet && examCount > 0 && (
        <div className="card p-6 relative overflow-hidden">
          <span className="absolute top-0 left-0 right-0 h-1" style={{ background: course.accentColor }} />
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs font-mono text-[var(--text-mute)]">{course.code}</div>
              <div className="font-bold text-lg">{examSet.label}</div>
              <div className="text-sm text-[var(--text-dim)] mt-1">{examSet.description}</div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--text-dim)] mt-3">
                <span className="flex items-center gap-1"><Clock size={14} /> {course.examMinutes} phút</span>
                <span>{course.examQuestions} câu (trộn theo blueprint)</span>
                <span>Pass {course.passingScore}%</span>
              </div>
            </div>
            <Link
              href={`/courses/${course.id}/exam/${encodeURIComponent(examSet.key)}`}
              className="btn3d btn3d-primary w-full md:w-auto"
            >
              Vào phòng thi <ChevronRight size={16} />
            </Link>
          </div>
        </div>
      )}

      <section>
        <h2 className="text-lg font-bold mb-3">Mini exam theo chương</h2>
        <div className="space-y-2">
          {chapters.map((s) => {
            const count = s.lessonSlugs
              ? questions.filter(
                  (q) => q.courseId === course.id && s.lessonSlugs!.includes(q.lesson)
                ).length
              : 0;
            const disabled = count === 0;
            return (
              <div key={s.key} className={`card p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${disabled ? "opacity-50" : ""}`}>
                <div className="min-w-0">
                  <div className="font-semibold">{s.label}</div>
                  <div className="text-xs text-[var(--text-dim)] mt-1">{count} câu · {s.defaultExamMinutes} phút mặc định</div>
                </div>
                <Link
                  href={disabled ? "#" : `/courses/${course.id}/exam/${encodeURIComponent(s.key)}`}
                  className={`btn3d btn3d-secondary btn3d-sm w-full sm:w-auto ${disabled ? "pointer-events-none" : ""}`}
                >
                  Vào thi <ChevronRight size={14} />
                </Link>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
