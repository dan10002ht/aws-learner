import GithubSlugger from "github-slugger";
import { courses } from "@/data/courses";
import { lessons } from "@/data/lessons";
import { readLessonMarkdown } from "@/lib/lessonContent";
import type { CourseId } from "./types";

export type SearchKind = "course" | "lesson" | "section";

export interface SearchRecord {
  id: string;
  kind: SearchKind;
  /** Heading shown in the result row. */
  title: string;
  /** Breadcrumb trail, e.g. ["Git & GitHub", "Branch & merge"]. */
  breadcrumb: string[];
  /** Destination route (may include #anchor for sections). */
  url: string;
  /** Plain-text body — indexed for matching AND stored (for match snippet). */
  content: string;
  /** Extra terms to match against (codes, slugs). */
  keywords: string;
}

const courseTitle = (id: CourseId): string =>
  courses.find((c) => c.id === id)?.title ?? id;

/** Strip markdown syntax down to readable plain text for indexing/snippets. */
function toPlainText(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, " ")      // fenced code blocks
    .replace(/`([^`]+)`/g, "$1")          // inline code
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ") // images
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1") // links → text
    .replace(/<[^>]+>/g, " ")             // html tags
    .replace(/^[>#\-*+]\s*/gm, "")        // blockquote/heading/list markers
    .replace(/[*_~]/g, "")                // emphasis
    .replace(/\|/g, " ")                  // table pipes
    .replace(/\s+/g, " ")
    .trim();
}

/** Split a lesson's markdown into {intro, sections[]} by h2/h3 headings. */
function splitSections(md: string) {
  const slugger = new GithubSlugger();
  const lines = md.split("\n");
  const intro: string[] = [];
  const sections: { heading: string; anchor: string; body: string[] }[] = [];
  let inFence = false;
  let current: { heading: string; anchor: string; body: string[] } | null = null;

  for (const line of lines) {
    if (line.trimStart().startsWith("```")) {
      inFence = !inFence;
      (current?.body ?? intro).push(line);
      continue;
    }
    const m = !inFence && line.match(/^(#{2,3})\s+(.+?)\s*#*\s*$/);
    if (m) {
      const text = m[2].replace(/`/g, "").trim();
      current = { heading: text, anchor: slugger.slug(text), body: [] };
      sections.push(current);
    } else {
      (current?.body ?? intro).push(line);
    }
  }
  return { intro: intro.join("\n"), sections };
}

const SNIPPET_CAP = 200;

/**
 * Full-text search index: courses, lesson pages, and every lesson section
 * (by heading) with its body text — so search matches deep inside content and
 * deep-links to the right anchor, GitBook/Algolia-style. Server-only (reads
 * markdown from disk); exposed to the client via the /search-index.json route.
 */
export function buildContentIndex(): SearchRecord[] {
  const records: SearchRecord[] = [];

  for (const c of courses) {
    records.push({
      id: `course:${c.id}`,
      kind: "course",
      title: c.title,
      breadcrumb: [c.shortTitle],
      url: `/courses/${c.id}`,
      content: c.description,
      keywords: `${c.code} ${c.shortTitle} ${c.level} ${c.hint}`,
    });
  }

  for (const l of lessons) {
    if (!l.available) continue;
    const md = readLessonMarkdown(l.courseId, l.slug);
    const ct = courseTitle(l.courseId);
    const lessonUrl = `/courses/${l.courseId}/learn/${l.slug}`;

    // Lesson page itself (matches title + description + intro paragraph).
    const intro = md ? toPlainText(splitSections(md).intro) : "";
    records.push({
      id: `lesson:${l.courseId}:${l.slug}`,
      kind: "lesson",
      title: l.title,
      breadcrumb: [ct, l.title],
      url: lessonUrl,
      content: `${l.description} ${intro}`.slice(0, SNIPPET_CAP).trim(),
      keywords: `${l.shortTitle} ${l.slug}`,
    });

    // One record per heading section, deep-linked to its anchor.
    if (md) {
      for (const s of splitSections(md).sections) {
        const body = toPlainText(s.body.join("\n"));
        if (!body && !s.heading) continue;
        records.push({
          id: `section:${l.courseId}:${l.slug}#${s.anchor}`,
          kind: "section",
          title: s.heading,
          breadcrumb: [ct, l.title],
          url: `${lessonUrl}#${s.anchor}`,
          content: body.slice(0, SNIPPET_CAP),
          keywords: l.shortTitle,
        });
      }
    }
  }

  return records;
}
