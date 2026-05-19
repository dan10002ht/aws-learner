"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { clearHistory, deleteAttempt, getHistory } from "@/lib/storage";
import { getCourse } from "@/data/courses";
import type { AttemptSummary } from "@/lib/types";

function fmtDuration(ms: number) {
  const m = Math.floor(ms / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  return `${m}:${String(s).padStart(2, "0")}`;
}
function fmtDate(ts: number) {
  return new Date(ts).toLocaleString("vi-VN", {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function HistoryPage() {
  const [items, setItems] = useState<AttemptSummary[] | null>(null);

  useEffect(() => { setItems(getHistory()); }, []);

  if (items === null) return <div className="text-[var(--text-dim)]">Đang tải...</div>;

  const avg = items.length ? Math.round(items.reduce((a, x) => a + x.score, 0) / items.length) : 0;
  const examItems = items.filter((i) => i.mode === "exam");
  const bestExam = examItems.length ? Math.max(...examItems.map((i) => i.score)) : 0;

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-3xl font-extrabold">History</h1>
          <p className="text-[var(--text-dim)] mt-1">Lịch sử {items.length} lần luyện/thi gần đây.</p>
        </div>
        {items.length > 0 && (
          <button
            onClick={() => { if (confirm("Xóa toàn bộ lịch sử?")) { clearHistory(); setItems([]); } }}
            className="btn3d btn3d-secondary btn3d-sm text-danger"
          >
            <Trash2 size={14} /> Xóa hết
          </button>
        )}
      </header>

      {items.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <Stat label="Tổng số lần" value={items.length} />
          <Stat label="Điểm trung bình" value={`${avg}%`} />
          <Stat label="Best Exam" value={`${bestExam}%`} />
        </div>
      )}

      {items.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-[var(--text-dim)] mb-5">Chưa có lần làm bài nào.</p>
          <Link href="/" className="btn3d btn3d-primary btn3d-sm inline-flex">Khám phá các khoá</Link>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((it) => {
            const course = getCourse(it.courseId);
            const color =
              it.score >= 70 ? "text-success" : it.score >= 50 ? "text-warning" : "text-danger";
            return (
              <div key={it.id} className="card p-4 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex-1 min-w-0 flex items-center gap-4">
                  <div className={`text-2xl font-extrabold ${color} w-16 text-right`}>{it.score}%</div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{it.setLabel}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full surface-2 border border-[var(--border)] uppercase tracking-wide">
                        {it.mode}
                      </span>
                      {course && (
                        <span className="text-xs font-mono text-[var(--text-mute)]">{course.code}</span>
                      )}
                    </div>
                    <div className="text-xs text-[var(--text-dim)] mt-0.5">
                      {it.correctCount}/{it.totalQuestions} câu · {fmtDuration(it.durationMs)} · {fmtDate(it.finishedAt)}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    if (confirm("Xóa lần này?")) {
                      deleteAttempt(it.id);
                      setItems((p) => (p ?? []).filter((x) => x.id !== it.id));
                    }
                  }}
                  className="btn-ghost text-[var(--text-mute)] hover:text-danger"
                  aria-label="Xóa"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            );
          })}
        </div>
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
