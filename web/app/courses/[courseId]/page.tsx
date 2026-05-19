import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, BookOpen, GraduationCap, ListChecks, RotateCcw } from "lucide-react";
import { courses, getCourse } from "@/data/courses";
import { chaptersOfCourse, lessonsOfCourse } from "@/data/lessons";
import { questionsInCourse } from "@/lib/questions";
import type { CourseId } from "@/lib/types";

export function generateStaticParams() {
  return courses.map((c) => ({ courseId: c.id }));
}

export default function CourseDashboardPage({ params }: { params: { courseId: string } }) {
  const course = getCourse(params.courseId as CourseId);
  if (!course) notFound();

  const lessons = lessonsOfCourse(course.id);
  const chapters = chaptersOfCourse(course.id);
  const totalQuestions = questionsInCourse(course.id).length;
  const isComingSoon = course.status === "coming-soon";

  return (
    <div className="space-y-8">
      <Link href="/" className="text-sm text-[var(--text-dim)] hover:text-[var(--text)] inline-flex items-center gap-1">
        ← Tất cả khoá
      </Link>

      <header className="relative">
        <span
          className="absolute left-0 top-0 bottom-0 w-1 rounded-full"
          style={{ background: course.accentColor }}
        />
        <div className="pl-5">
          <div className="flex items-center gap-2 mb-2">
            <span
              className="text-xs font-bold px-2 py-0.5 rounded-full"
              style={{ background: `${course.accentColor}22`, color: course.accentColor }}
            >
              {course.level}
            </span>
            <span className="text-xs font-mono text-[var(--text-mute)]">{course.code}</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold leading-tight">{course.title}</h1>
          <p className="text-[var(--text-dim)] mt-2 max-w-2xl">{course.description}</p>
        </div>
      </header>

      {/* Stats strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Bài học" value={lessons.length} />
        <Stat label="Chương" value={chapters.length} />
        <Stat label="Câu hỏi" value={totalQuestions} />
        <Stat label="Thời lượng" value={`${course.durationHours}h`} />
      </div>

      {isComingSoon ? (
        <div className="card p-8 text-center">
          <h2 className="text-xl font-bold mb-2">Coming soon</h2>
          <p className="text-[var(--text-dim)] mb-5">
            Khoá này đang được xây dựng. Outline chương đã có sẵn dưới đây.
          </p>
          <div className="text-left max-w-md mx-auto space-y-2">
            {chapters.map((c, i) => (
              <div key={c.id} className="flex items-center gap-3 surface-2 px-4 py-3 rounded-xl">
                <span className="text-sm font-mono text-[var(--text-mute)] w-6">{String(i + 1).padStart(2, "0")}</span>
                <span className="text-sm font-medium">{c.title}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <ActionCard
            href={lessons[0] ? `/courses/${course.id}/learn/${lessons[0].slug}` : `/courses/${course.id}`}
            icon={<BookOpen size={20} />}
            title="Học lý thuyết"
            description={`${lessons.length} bài học theo lộ trình từ dễ tới khó.`}
            accent={course.accentColor}
          />
          <ActionCard
            href={`/courses/${course.id}/practice`}
            icon={<ListChecks size={20} />}
            title="Luyện đề"
            description="Trả lời từng câu, xem giải thích ngay."
            accent={course.accentColor}
          />
          <ActionCard
            href={`/courses/${course.id}/exam`}
            icon={<GraduationCap size={20} />}
            title="Mô phỏng thi"
            description={`${course.examQuestions} câu, ${course.examMinutes} phút, có timer.`}
            accent={course.accentColor}
          />
        </div>
      )}

      {!isComingSoon && (
        <section>
          <h2 className="text-xl font-bold mb-3">Lộ trình các chương</h2>
          <div className="space-y-2">
            {chapters.map((c, idx) => {
              const lc = lessons.filter((l) => l.chapter === c.id);
              const firstLesson = lc[0];
              const inner = (
                <>
                  <div className="flex items-center gap-4 min-w-0">
                    <span className="font-mono text-sm text-[var(--text-mute)] w-8">{String(idx + 1).padStart(2, "0")}</span>
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{c.title}</div>
                      <div className="text-xs text-[var(--text-dim)] mt-0.5">{lc.length} bài</div>
                    </div>
                  </div>
                  {firstLesson && (
                    <span className="text-sm text-brand-500 flex items-center gap-1 flex-shrink-0">
                      Mở <ArrowRight size={14} />
                    </span>
                  )}
                </>
              );
              return firstLesson ? (
                <Link
                  key={c.id}
                  href={`/courses/${course.id}/learn/${firstLesson.slug}`}
                  className="card card-hover p-4 flex items-center justify-between gap-3"
                >
                  {inner}
                </Link>
              ) : (
                <div key={c.id} className="card p-4 flex items-center justify-between gap-3 opacity-70">
                  {inner}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {!isComingSoon && (
        <section className="card p-5 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <RotateCcw size={20} className="text-brand-500" />
            <div>
              <div className="font-semibold">Ôn lại câu sai của khoá này</div>
              <div className="text-xs text-[var(--text-dim)]">Tự động gom các câu bạn đã làm sai.</div>
            </div>
          </div>
          <Link
            href={`/courses/${course.id}/practice/${encodeURIComponent(`wrong|${course.id}`)}`}
            className="btn3d btn3d-secondary btn3d-sm"
          >
            Mở bộ ôn
          </Link>
        </section>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="card p-4">
      <div className="text-xs text-[var(--text-dim)] uppercase tracking-wide">{label}</div>
      <div className="text-2xl font-extrabold mt-1">{value}</div>
    </div>
  );
}

function ActionCard({
  href, icon, title, description, accent,
}: { href: string; icon: React.ReactNode; title: string; description: string; accent: string }) {
  return (
    <Link href={href} className="card card-hover p-5 flex flex-col gap-3 group">
      <span
        className="w-10 h-10 rounded-lg flex items-center justify-center"
        style={{ background: `${accent}1a`, color: accent }}
      >
        {icon}
      </span>
      <div>
        <div className="font-bold">{title}</div>
        <div className="text-sm text-[var(--text-dim)] mt-0.5">{description}</div>
      </div>
      <span className="mt-auto text-sm text-brand-500 inline-flex items-center gap-1 group-hover:gap-2 transition-all">
        Bắt đầu <ArrowRight size={14} />
      </span>
    </Link>
  );
}
