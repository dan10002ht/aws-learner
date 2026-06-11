import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import rehypeSlug from "rehype-slug";
import rehypeRaw from "rehype-raw";
import rehypeCodeTabs from "@/lib/rehypeCodeTabs";
import CodeTabs from "@/components/CodeTabs";
import { ChevronLeft, ChevronRight, ListChecks } from "lucide-react";
import { courses, getCourse } from "@/data/courses";
import { getLessonBySlug, lessonsOfCourse, chaptersOfCourse } from "@/data/lessons";
import { readLessonMarkdown } from "@/lib/lessonContent";
import { questionsInLesson } from "@/lib/questions";
import { extractToc } from "@/lib/toc";
import MarkLessonRead from "@/components/MarkLessonRead";
import LessonToc from "@/components/LessonToc";
import MobileLessonNav from "@/components/MobileLessonNav";
import LessonSidebarNav from "@/components/LessonSidebarNav";
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
  const bySlug = new Map(lessons.map((l) => [l.slug, l]));
  // Group lessons by chapter (exam domain) for the sidebar TOC.
  const chapterGroups = chaptersOfCourse(course.id)
    .map((c) => ({
      // "Domain 1 — Cloud Concepts (24%)" → "Cloud Concepts (24%)"
      label: c.title.includes("—") ? c.title.split("—").slice(1).join("—").trim() : c.title,
      lessons: c.lessonSlugs.map((s) => bySlug.get(s)).filter(Boolean) as typeof lessons,
    }))
    .filter((g) => g.lessons.length > 0);
  const idx = lessons.findIndex((l) => l.slug === params.slug);
  const prev = lessons[idx - 1];
  const next = lessons[idx + 1];
  const practiceCount = questionsInLesson(course.id, params.slug).length;
  const toc = md ? extractToc(md) : [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[200px_minmax(0,1fr)_200px] gap-6 xl:gap-8">
      <MarkLessonRead courseId={course.id} slug={params.slug} />

      {/* Left sidebar — lesson list (desktop) */}
      <aside className="hidden lg:block lg:sticky lg:top-20 lg:self-start lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto scrollbar-thin">
        <Link href={`/courses/${course.id}`} className="text-xs uppercase tracking-widest text-[var(--text-dim)] hover:text-[var(--text)] mb-3 inline-block">
          ← Tổng quan khoá
        </Link>
        <LessonSidebarNav
          courseId={course.id}
          currentSlug={params.slug}
          groups={chapterGroups.map((g) => ({
            label: g.label,
            lessons: g.lessons.map((l) => ({ slug: l.slug, order: l.order, shortTitle: l.shortTitle })),
          }))}
        />
      </aside>

      <article className="min-w-0">
        <MobileLessonNav
          courseId={course.id}
          courseCode={course.code}
          currentSlug={params.slug}
          currentLessonOrder={lesson.order}
          currentShortTitle={lesson.shortTitle}
          lessons={lessons.map((l) => ({ slug: l.slug, order: l.order, shortTitle: l.shortTitle }))}
          groups={chapterGroups.map((g) => ({
            label: g.label,
            lessons: g.lessons.map((l) => ({ slug: l.slug, order: l.order, shortTitle: l.shortTitle })),
          }))}
          toc={toc}
          practiceCount={practiceCount}
        />

        <div className="hidden lg:flex items-center justify-between gap-3 mb-6 flex-wrap">
          <div className="text-xs text-[var(--text-mute)] font-mono">{course.code} · Bài {lesson.order}</div>
          {practiceCount > 0 && (
            <Link
              href={`/courses/${course.id}/practice/${encodeURIComponent(`${course.id}|lesson|${params.slug}`)}`}
              className="btn3d btn3d-primary btn3d-sm ml-auto"
            >
              <ListChecks size={16} /> Luyện {practiceCount} câu
            </Link>
          )}
        </div>

        {md ? (
          <div className="prose-article">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeRaw, rehypeSlug, rehypeHighlight, rehypeCodeTabs]}
              components={{ "code-tabs": CodeTabs } as never}
            >
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

      {/* Right sidebar — TOC (desktop) */}
      <aside className="hidden lg:block lg:sticky lg:top-20 lg:self-start lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto scrollbar-thin">
        <LessonToc items={toc} />
      </aside>
    </div>
  );
}
