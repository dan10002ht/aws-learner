"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronDown, Trash2 } from "lucide-react";
import { clearWrong, getWrongEntries, removeWrong } from "@/lib/storage";
import { getQuestionById } from "@/data/questions";
import { getCourse } from "@/data/courses";
import type { WrongQuestionEntry } from "@/lib/types";

export default function WrongAnswersPage() {
  const [items, setItems] = useState<WrongQuestionEntry[] | null>(null);

  useEffect(() => {
    setItems(getWrongEntries().sort((a, b) => b.lastWrongAt - a.lastWrongAt));
  }, []);

  if (items === null) return <div className="text-[var(--text-dim)]">Đang tải...</div>;

  // Group by course
  const groups = new Map<string, WrongQuestionEntry[]>();
  for (const e of items) {
    const q = getQuestionById(e.questionId);
    if (!q) continue;
    const list = groups.get(q.courseId) ?? [];
    list.push(e);
    groups.set(q.courseId, list);
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold">Review</h1>
          <p className="text-[var(--text-dim)] mt-1">
            {items.length} câu cần ôn lại — trả lời đúng ở Practice sẽ tự xóa.
          </p>
        </div>
        {items.length > 0 && (
          <button
            onClick={() => { if (confirm("Xóa toàn bộ danh sách câu sai?")) { clearWrong(); setItems([]); } }}
            className="btn3d btn3d-secondary btn3d-sm text-danger"
          >
            <Trash2 size={14} /> Xóa hết
          </button>
        )}
      </header>

      {items.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-[var(--text-dim)] mb-5">Bạn chưa làm sai câu nào — hoặc đã ôn xong tất cả.</p>
          <Link href="/" className="btn3d btn3d-primary btn3d-sm inline-flex">Quay về trang chủ</Link>
        </div>
      ) : (
        <div className="space-y-6">
          {Array.from(groups.entries()).map(([courseId, list]) => {
            const course = getCourse(courseId);
            return (
              <section key={courseId}>
                <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
                  <h2 className="text-lg font-bold">
                    {course?.shortTitle ?? courseId}
                    <span className="text-sm text-[var(--text-dim)] ml-2 font-normal">{list.length} câu</span>
                  </h2>
                  <Link
                    href={`/courses/${courseId}/practice/${encodeURIComponent(`wrong|${courseId}`)}`}
                    className="btn3d btn3d-primary btn3d-sm"
                  >
                    Luyện ngay
                  </Link>
                </div>
                <div className="space-y-2">
                  {list.map((entry) => {
                    const q = getQuestionById(entry.questionId);
                    if (!q) return null;
                    return (
                      <div key={entry.questionId} className="card p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="text-xs text-[var(--text-mute)] mb-1 uppercase tracking-wide">
                              {q.lesson} · {q.difficulty} · sai {entry.wrongCount} lần
                            </div>
                            <div className="font-semibold">{q.question}</div>
                            <details className="mt-2 group">
                              <summary className="text-sm text-brand-600 cursor-pointer hover:underline inline-flex items-center gap-1 list-none">
                                <ChevronDown size={14} className="transition-transform group-open:rotate-180" />
                                Xem đáp án & giải thích
                              </summary>
                              <div className="mt-2 space-y-1.5">
                                {q.options.map((opt, i) => (
                                  <div
                                    key={i}
                                    className={`text-sm px-3 py-1.5 rounded-lg border-2 ${
                                      q.correctIndices.includes(i)
                                        ? "border-success/50 bg-success/5"
                                        : "border-[var(--border)]"
                                    }`}
                                  >
                                    <span className="font-mono text-xs text-[var(--text-mute)] mr-2">
                                      {String.fromCharCode(65 + i)}
                                    </span>
                                    {opt}
                                  </div>
                                ))}
                                <div className="mt-2 p-3 rounded-lg surface-2 border border-[var(--border)]">
                                  <div className="text-xs font-bold text-brand-600 uppercase tracking-widest mb-1">Giải thích</div>
                                  <p className="text-sm leading-relaxed">{q.explanation}</p>
                                </div>
                              </div>
                            </details>
                          </div>
                          <button
                            onClick={() => {
                              removeWrong(entry.questionId);
                              setItems((p) => (p ?? []).filter((x) => x.questionId !== entry.questionId));
                            }}
                            className="btn-ghost text-[var(--text-mute)] hover:text-success"
                            title="Đánh dấu đã thuộc"
                          >
                            Mark
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
