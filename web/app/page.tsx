import Link from "next/link";
import { courses } from "@/data/courses";
import { questionsInCourse } from "@/lib/questions";
import { lessonsOfCourse } from "@/data/lessons";
import { ArrowRight, Lock, Sprout, Cloud, Wrench, GraduationCap, Building2 } from "lucide-react";

export default function HomePage() {
  return (
    <div className="space-y-12">
      <section className="pt-6 pb-2">
        <p className="text-sm font-semibold tracking-widest text-brand-500 uppercase mb-2">Tech Learner</p>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold leading-tight max-w-2xl">
          Từ <span className="text-brand-500">chưa biết gì</span> đến <span className="text-brand-500">pro</span>.
        </h1>
        <p className="text-[var(--text-dim)] mt-3 max-w-2xl">
          Lộ trình đầy đủ: nhập môn lập trình → nền tảng hệ thống → backend engineering → chứng chỉ AWS → kiến trúc.
          Khoá lý thuyết đọc hiểu sâu, khoá chứng chỉ có luyện đề và mô phỏng kỳ thi.
        </p>
      </section>

      {CATEGORIES.map(({ key, title, blurb, Icon }) => {
        const group = courses.filter((c) => c.category === key).sort((a, b) => a.order - b.order);
        if (!group.length) return null;
        return (
      <section key={key}>
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-xl font-bold flex items-center gap-2.5">
            <Icon size={20} className="text-brand-500 shrink-0" />
            {title}
          </h2>
          <span className="text-sm text-[var(--text-dim)]">{group.length} khoá</span>
        </div>
        <p className="text-sm text-[var(--text-dim)] mb-4 pl-[30px]">{blurb}</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {group.map((c) => {
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
                  {c.kind === "knowledge" ? (
                    <span>{questionsCount > 0 ? "Khoá lý thuyết · có luyện tập" : "Khoá lý thuyết · không thi"}</span>
                  ) : (
                    <>
                      <span>{c.examQuestions} câu thi</span>
                      <span>·</span>
                      <span>Pass {c.passingScore}%</span>
                    </>
                  )}
                </div>

                {!isLocked && (
                  <div className="flex items-center justify-between pt-3 border-t border-[var(--border)]">
                    <span className="text-xs text-[var(--text-dim)]">
                      {c.kind === "knowledge"
                        ? questionsCount > 0
                          ? `${lessonsCount} bài · ${questionsCount} câu luyện tập`
                          : `${lessonsCount} bài lý thuyết`
                        : `${lessonsCount} bài · ${questionsCount} câu hỏi`}
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
        );
      })}
    </div>
  );
}

const CATEGORIES: { key: string; title: string; blurb: string; Icon: typeof Sprout }[] = [
  { key: "starter", title: "Nhập môn", blurb: "Bắt đầu từ số 0 — chưa cần biết gì về tech.", Icon: Sprout },
  { key: "systems", title: "Nền tảng hệ thống & Cloud", blurb: "Hiểu bản chất hạ tầng, mạng, hệ phân tán và kỹ năng tay nghề kỹ sư.", Icon: Cloud },
  { key: "software", title: "Kỹ thuật phần mềm", blurb: "Tư duy thiết kế backend ở mức production.", Icon: Wrench },
  { key: "certification", title: "Chứng chỉ AWS", blurb: "Luyện đề bám blueprint chính thức + mô phỏng kỳ thi thật.", Icon: GraduationCap },
  { key: "architecture", title: "Kiến trúc & Nâng cao", blurb: "Cầu nối lên Solutions Architect cao cấp / CTO.", Icon: Building2 },
];
