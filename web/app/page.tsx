import Link from "next/link";
import { courses } from "@/data/courses";
import { questionsInCourse } from "@/lib/questions";
import { lessonsOfCourse } from "@/data/lessons";
import { ArrowRight, Lock } from "lucide-react";

export default function HomePage() {
  return (
    <div className="space-y-12">
      <section className="pt-6 pb-2">
        <p className="text-sm font-semibold tracking-widest text-brand-500 uppercase mb-2">AWS Learner</p>
        <h1 className="text-4xl md:text-5xl font-extrabold leading-tight max-w-2xl">
          Học AWS từ <span className="text-brand-500">cơ bản</span> đến <span className="text-brand-500">pro</span>.
        </h1>
        <p className="text-[var(--text-dim)] mt-3 max-w-2xl">
          Đi theo lộ trình rõ ràng: Cloud Practitioner → Associate → Professional. Mỗi khoá có sách lý thuyết,
          luyện đề có giải thích, và mô phỏng kỳ thi.
        </p>
      </section>

      <section>
        <div className="flex items-baseline justify-between mb-5">
          <h2 className="text-xl font-bold">Các khoá học</h2>
          <span className="text-sm text-[var(--text-dim)]">{courses.length} chứng chỉ</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {courses.map((c) => {
            const isLocked = c.status === "coming-soon";
            const questionsCount = questionsInCourse(c.id).length;
            const lessonsCount = lessonsOfCourse(c.id).length;
            return (
              <Link
                key={c.id}
                href={isLocked ? "#" : `/courses/${c.id}`}
                className={`card p-6 flex flex-col gap-4 group relative overflow-hidden ${
                  isLocked ? "opacity-70 pointer-events-none" : "card-hover hover:border-[var(--border-strong)]"
                }`}
              >
                <span
                  className="absolute top-0 left-0 right-0 h-1"
                  style={{ background: c.accentColor }}
                />
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className="text-xs font-bold px-2 py-0.5 rounded-full"
                        style={{ background: `${c.accentColor}22`, color: c.accentColor }}
                      >
                        {c.level}
                      </span>
                      <span className="text-xs text-[var(--text-mute)] font-mono">{c.code}</span>
                    </div>
                    <h3 className="text-xl font-bold leading-tight">{c.shortTitle}</h3>
                    <p className="text-sm text-[var(--text-dim)] mt-1.5">{c.description}</p>
                  </div>
                  {isLocked && <Lock size={20} className="text-[var(--text-mute)] flex-shrink-0 mt-1" />}
                </div>

                <div className="flex items-center gap-4 text-xs text-[var(--text-dim)] mt-auto">
                  <span>{c.durationHours}h học</span>
                  <span>·</span>
                  <span>{c.examQuestions} câu thi</span>
                  <span>·</span>
                  <span>Pass {c.passingScore}%</span>
                </div>

                {!isLocked && (
                  <div className="flex items-center justify-between pt-3 border-t border-[var(--border)]">
                    <span className="text-xs text-[var(--text-dim)]">
                      {lessonsCount} bài · {questionsCount} câu hỏi
                    </span>
                    <span className="text-sm font-semibold text-brand-500 flex items-center gap-1 group-hover:gap-2 transition-all">
                      Vào khoá <ArrowRight size={14} />
                    </span>
                  </div>
                )}
                {isLocked && (
                  <div className="pt-3 border-t border-[var(--border)] text-xs text-[var(--text-mute)]">
                    Coming soon · cần học {c.prerequisites?.join(", ")} trước
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
