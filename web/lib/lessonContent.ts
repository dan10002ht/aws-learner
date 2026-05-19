import fs from "node:fs";
import path from "node:path";
import { getLessonBySlug } from "@/data/lessons";
import type { CourseId } from "./types";

const LESSONS_DIR = path.join(process.cwd(), "..", "lessons");

export function readLessonMarkdown(courseId: CourseId, slug: string): string | null {
  const lesson = getLessonBySlug(courseId, slug);
  if (!lesson || !lesson.available) return null;
  const filePath = path.join(LESSONS_DIR, lesson.file);
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return null;
  }
}
