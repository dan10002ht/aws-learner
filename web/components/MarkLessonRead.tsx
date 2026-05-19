"use client";

import { useEffect } from "react";
import { markLessonRead } from "@/lib/storage";

export default function MarkLessonRead({ courseId, slug }: { courseId: string; slug: string }) {
  useEffect(() => {
    const t = setTimeout(() => markLessonRead(courseId, slug), 4000); // count as read after 4s on page
    return () => clearTimeout(t);
  }, [courseId, slug]);
  return null;
}
