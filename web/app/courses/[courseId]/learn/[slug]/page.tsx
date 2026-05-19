import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import rehypeSlug from "rehype-slug";
import { ChevronLeft, ChevronRight, ListChecks } from "lucide-react";
import { courses, getCourse } from "@/data/courses";
import { getLessonBySlug, lessonsOfCourse } from "@/data/lessons";
import { readLessonMarkdown } from "@/lib/lessonContent";
import { questionsInLesson } from "@/lib/questions";
import MarkLessonRead from "@/components/MarkLessonRead";
import type { CourseId } from "@/lib/types";

export function generateStaticParams() {
  const params: { courseId: string; slug: string }[] = [];
  for (const c of courses) {
    for (const l of lessonsOfCourse(c.id)) {
      params.push({ courseId: c.id, slug: l.slug });
    }
  }
  return params;
}

export default function LessonPage({ params }: { params: { courseId: string; slug: string } }) {
  const course = getCourse(params.courseId as CourseId);
  if (!course) notFound();
  const lesson = getLessonBySlug(course.id, params.slug);
  if (!lesson) notFound();

  const md = readLessonMarkdown(course.id, params.slug);
  const lessons = lessonsOfCourse(course.id);
  const idx = lessons.findIndex((l) => l.slug === params.slug);
  const prev = lessons[idx - 1];
  const next = lessons[idx + 1];
  const practiceCount = questionsInLesson(course.id, params.slug).length;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-8">
      <MarkLessonRead courseId={course.id} slug={params.slug} />

      <aside className="lg:sticky lg:top-20 lg:self-start lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto scrollbar-thin">
        <Link href={`/courses/${course.id}`} className="text-xs uppercase tracking-widest text-[var(--text-dim)] hover:text-[var(--text)] mb-3 inline-block">
          ← Tổng quan khoá
        </Link>
        <nav className="flex flex-col gap-0.5">
          {lessons.map((l) => (
            <Link
              key={l.slug}
              href={`/courses/${course.id}/learn/${l.slug}`}
              className={`text-sm px-3 py-1.5 rounded-md transition ${
                l.slug === params.slug
                  ? "bg-brand-500/10 text-brand-600 font-semibold"
                  : "text-[var(--text-dim)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
              }`}
            >
              {String(l.order).padStart(2, "0")}. {l.shortTitle}
            </Link>
          ))}
        </nav>
      </aside>

      <article className="min-w-0">
        <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
          <div className="text-xs text-[var(--text-mute)] font-mono">{course.code} · Bài {lesson.order}</div>
          {practiceCount > 0 && (
            <Link
              href={`/courses/${course.id}/practice/${encodeURIComponent(`${course.id}|lesson|${params.slug}`)}`}
              className="btn3d btn3d-primary btn3d-sm"
            >
              <ListChecks size={16} /> Luyện {practiceCount} câu
            </Link>
          )}
        </div>

        {md ? (
          <div className="prose-article">
            <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSlug, rehypeHighlight]}>
              {md}
            </ReactMarkdown>
          </div>
        ) : (
          <div className="card p-6">
            <p className="text-[var(--text-dim)]">Chưa có nội dung Markdown cho bài này.</p>
          </div>
        )}

        <div className="mt-12 pt-6 border-t border-[var(--border)] flex items-center justify-between gap-3">
          {prev ? (
            <Link href={`/courses/${course.id}/learn/${prev.slug}`} className="btn3d btn3d-secondary btn3d-sm">
              <ChevronLeft size={16} /> {prev.shortTitle}
            </Link>
          ) : <span />}
          {next ? (
            <Link href={`/courses/${course.id}/learn/${next.slug}`} className="btn3d btn3d-primary btn3d-sm">
              {next.shortTitle} <ChevronRight size={16} />
            </Link>
          ) : <span />}
        </div>
      </article>
    </div>
  );
}
