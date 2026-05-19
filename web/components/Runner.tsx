"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, RotateCw, Send, Square, Trophy } from "lucide-react";
import QuestionCard from "./QuestionCard";
import Timer from "./Timer";
import Button3D from "./Button3D";
import { buildQuestions, isCorrect, type PreparedQuestion } from "@/lib/questions";
import { addXp, getWrongIds, recordWrong, removeWrong, saveAttempt } from "@/lib/storage";
import type { AttemptSummary, AnswerRecord, Mode } from "@/lib/types";
import { getSet } from "@/data/sets";

interface Props {
  setKey: string;
  mode: Mode;
}

interface Config {
  count: number;
  examMinutes: number;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
}

type Phase = "setup" | "running" | "finished";

export default function Runner({ setKey, mode }: Props) {
  const set = getSet(setKey);
  const defaultCount = set?.defaultCount ?? 10;
  const defaultMin = set?.defaultExamMinutes ?? 10;

  const [phase, setPhase] = useState<Phase>("setup");
  const [config, setConfig] = useState<Config>({
    count: defaultCount,
    examMinutes: defaultMin,
    shuffleQuestions: true,
    shuffleOptions: true,
  });
  const [prepared, setPrepared] = useState<PreparedQuestion[]>([]);
  const [selections, setSelections] = useState<number[][]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [revealed, setRevealed] = useState<boolean[]>([]);
  const [startedAt, setStartedAt] = useState(0);
  const [finishedAt, setFinishedAt] = useState(0);

  const available = useMemo(() => {
    if (!set) return 0;
    const built = buildQuestions({
      setKey,
      wrongIds: set.kind === "wrong-answers" ? getWrongIds() : undefined,
    });
    return built.length;
  }, [setKey, set]);

  const start = useCallback(() => {
    if (!set) return;
    const wrongIds = set.kind === "wrong-answers" ? getWrongIds() : undefined;
    const built = buildQuestions({
      setKey,
      shuffleQuestions: config.shuffleQuestions,
      shuffleOptions: config.shuffleOptions,
      limit: config.count,
      wrongIds,
    });
    if (built.length === 0) return;
    setPrepared(built);
    setSelections(built.map(() => []));
    setRevealed(built.map(() => false));
    setCurrentIdx(0);
    setStartedAt(Date.now());
    setPhase("running");
  }, [config, setKey, set]);

  const finishAttempt = useCallback(() => {
    const endAt = Date.now();
    const answers: AnswerRecord[] = prepared.map((p, i) => {
      const sel = selections[i] ?? [];
      const correct = isCorrect(p.q, p.optionMap, sel);
      return {
        questionId: p.q.id,
        selected: sel.map((d) => p.optionMap[d]),
        correct,
      };
    });
    const correctCount = answers.filter((a) => a.correct).length;
    const total = prepared.length;
    const score = total > 0 ? Math.round((correctCount / total) * 100) : 0;

    const attempt: AttemptSummary = {
      id: `att-${endAt}-${Math.random().toString(36).slice(2, 8)}`,
      courseId: set!.courseId,
      setKey,
      setLabel: set?.label ?? setKey,
      mode,
      startedAt,
      finishedAt: endAt,
      totalQuestions: total,
      correctCount,
      score,
      durationMs: endAt - startedAt,
      answers,
    };
    saveAttempt(attempt);

    const wrongQids = answers.filter((a) => !a.correct).map((a) => a.questionId);
    if (wrongQids.length) recordWrong(wrongQids);
    if (set?.kind === "wrong-answers") {
      answers.filter((a) => a.correct).forEach((a) => removeWrong(a.questionId));
    }
    // XP: +10 per correct, +50 bonus on completion
    addXp(correctCount * 10 + 50);

    setFinishedAt(endAt);
    setPhase("finished");
  }, [prepared, selections, setKey, set, mode, startedAt]);

  const onToggle = useCallback(
    (qIdx: number, displayedIdx: number) => {
      const q = prepared[qIdx].q;
      setSelections((prev) => {
        const next = prev.slice();
        const cur = next[qIdx] ?? [];
        if (q.type === "single") {
          next[qIdx] = [displayedIdx];
        } else {
          if (cur.includes(displayedIdx)) next[qIdx] = cur.filter((i) => i !== displayedIdx);
          else next[qIdx] = [...cur, displayedIdx].sort();
        }
        return next;
      });
    },
    [prepared]
  );

  const onCheck = useCallback(
    (qIdx: number) => {
      setRevealed((prev) => {
        const next = prev.slice();
        next[qIdx] = true;
        return next;
      });
      const p = prepared[qIdx];
      const correct = isCorrect(p.q, p.optionMap, selections[qIdx] ?? []);
      if (correct) {
        addXp(10);
        if (set?.kind === "wrong-answers") removeWrong(p.q.id);
      } else {
        recordWrong([p.q.id]);
      }
    },
    [prepared, selections, set]
  );

  if (!set) {
    return (
      <div className="card p-6 text-center">
        <p className="text-[var(--text-dim)]">Không tìm thấy bộ câu hỏi này.</p>
      </div>
    );
  }

  // -------- SETUP --------
  if (phase === "setup") {
    const isExam = mode === "exam";
    return (
      <div className="space-y-6 max-w-xl mx-auto">
        <Link
          href={`/courses/${set.courseId}/${isExam ? "exam" : "practice"}`}
          className="text-sm text-[var(--text-dim)] hover:text-[var(--text)] inline-flex items-center gap-1"
        >
          <ChevronLeft size={14} /> Quay lại danh sách
        </Link>

        <div>
          <div className="text-xs font-bold uppercase tracking-widest text-brand-600 mb-1">
            {isExam ? "Exam mode" : "Practice mode"}
          </div>
          <h1 className="text-2xl font-extrabold">{set.label}</h1>
          <p className="text-[var(--text-dim)] mt-1 text-sm">{set.description}</p>
          <p className="text-xs text-[var(--text-mute)] mt-2">{available} câu khả dụng trong bộ này.</p>
        </div>

        <div className="card p-5 space-y-4">
          <Field label="Số câu hỏi">
            <input
              type="number" min={1} max={available || 1}
              value={config.count}
              onChange={(e) => setConfig({ ...config, count: Math.max(1, Math.min(available || 1, Number(e.target.value) || 1)) })}
              className="w-full px-3 py-2 rounded-lg surface-2 border border-[var(--border)] focus:outline-none focus:border-brand-500 font-medium"
            />
            <span className="text-xs text-[var(--text-mute)]">Tối đa {available}</span>
          </Field>

          {isExam && (
            <Field label="Thời gian (phút)">
              <input
                type="number" min={1} max={300}
                value={config.examMinutes}
                onChange={(e) => setConfig({ ...config, examMinutes: Math.max(1, Number(e.target.value) || 1) })}
                className="w-full px-3 py-2 rounded-lg surface-2 border border-[var(--border)] focus:outline-none focus:border-brand-500 font-medium"
              />
            </Field>
          )}

          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox" checked={config.shuffleQuestions}
              onChange={(e) => setConfig({ ...config, shuffleQuestions: e.target.checked })}
              className="w-4 h-4 accent-brand-500"
            />
            <span className="text-sm">Trộn thứ tự câu hỏi</span>
          </label>
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox" checked={config.shuffleOptions}
              onChange={(e) => setConfig({ ...config, shuffleOptions: e.target.checked })}
              className="w-4 h-4 accent-brand-500"
            />
            <span className="text-sm">Trộn thứ tự đáp án</span>
          </label>
        </div>

        <Button3D variant="primary" onClick={start} disabled={available === 0} className="w-full">
          {available === 0 ? "Chưa có câu hỏi" : `Bắt đầu ${isExam ? "thi" : "luyện"}`}
        </Button3D>
      </div>
    );
  }

  // -------- RUNNING --------
  if (phase === "running") {
    const p = prepared[currentIdx];
    const sel = selections[currentIdx] ?? [];
    const rev = revealed[currentIdx];

    return (
      <div className="space-y-4 max-w-3xl mx-auto">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="text-xs uppercase tracking-widest text-[var(--text-dim)] font-bold">
            {set.label}
          </div>
          <div className="flex items-center gap-2">
            {mode === "exam" && (
              <Timer startMs={startedAt} totalMs={config.examMinutes * 60_000} onExpire={finishAttempt} />
            )}
            <Button3D variant="secondary" size="sm" onClick={finishAttempt}>
              {mode === "exam" ? <><Send size={14} /> Nộp bài</> : <><Square size={14} /> Kết thúc</>}
            </Button3D>
          </div>
        </div>

        <div className="h-2 w-full bg-[var(--surface-2)] rounded-full overflow-hidden">
          <div
            className="h-full bg-brand-500 transition-all"
            style={{ width: `${((currentIdx + 1) / prepared.length) * 100}%` }}
          />
        </div>

        <QuestionCard
          question={p.q}
          optionMap={p.optionMap}
          selected={sel}
          revealed={rev}
          questionNumber={currentIdx + 1}
          totalQuestions={prepared.length}
          onToggle={(d) => onToggle(currentIdx, d)}
        />

        <div className="flex justify-between gap-3">
          <Button3D variant="secondary" size="sm" onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))} disabled={currentIdx === 0}>
            <ChevronLeft size={16} /> Trước
          </Button3D>
          {mode === "practice" ? (
            !rev ? (
              <Button3D variant="primary" size="sm" onClick={() => onCheck(currentIdx)} disabled={sel.length === 0}>
                Kiểm tra
              </Button3D>
            ) : currentIdx < prepared.length - 1 ? (
              <Button3D variant="primary" size="sm" onClick={() => setCurrentIdx((i) => i + 1)}>
                Tiếp <ChevronRight size={16} />
              </Button3D>
            ) : (
              <Button3D variant="primary" size="sm" onClick={finishAttempt}>
                Hoàn thành
              </Button3D>
            )
          ) : currentIdx < prepared.length - 1 ? (
            <Button3D variant="primary" size="sm" onClick={() => setCurrentIdx((i) => i + 1)}>
              Tiếp <ChevronRight size={16} />
            </Button3D>
          ) : (
            <Button3D variant="primary" size="sm" onClick={finishAttempt}>
              <Send size={14} /> Nộp bài
            </Button3D>
          )}
        </div>

        {mode === "exam" && (
          <div className="card p-4">
            <div className="text-xs font-bold uppercase tracking-widest text-[var(--text-dim)] mb-2">Bảng câu hỏi</div>
            <div className="grid grid-cols-8 sm:grid-cols-10 md:grid-cols-12 gap-1.5">
              {prepared.map((_, i) => {
                const answered = (selections[i] ?? []).length > 0;
                const isCur = i === currentIdx;
                return (
                  <button
                    key={i}
                    onClick={() => setCurrentIdx(i)}
                    className={`aspect-square text-xs rounded-md border-2 font-semibold transition ${
                      isCur
                        ? "border-brand-500 bg-brand-500/15 text-brand-600"
                        : answered
                        ? "border-success/40 bg-success/10 text-success"
                        : "border-[var(--border)] text-[var(--text-mute)] hover:border-[var(--border-strong)]"
                    }`}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  // -------- FINISHED --------
  const correctCount = prepared.reduce(
    (acc, p, i) => acc + (isCorrect(p.q, p.optionMap, selections[i] ?? []) ? 1 : 0),
    0
  );
  const score = prepared.length > 0 ? Math.round((correctCount / prepared.length) * 100) : 0;
  const durationMin = Math.floor((finishedAt - startedAt) / 60_000);
  const durationSec = Math.floor(((finishedAt - startedAt) % 60_000) / 1000);
  const scoreColor = score >= 70 ? "text-success" : score >= 50 ? "text-warning" : "text-danger";

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="card p-8 text-center">
        <Trophy size={36} className="mx-auto text-brand-500 mb-3" />
        <div className="text-xs uppercase tracking-widest text-[var(--text-dim)]">
          {set.label} · {mode === "exam" ? "Exam" : "Practice"}
        </div>
        <div className={`text-6xl font-extrabold my-3 ${scoreColor}`}>{score}%</div>
        <div className="text-lg font-semibold">
          {correctCount} / {prepared.length} câu đúng
        </div>
        <div className="text-sm text-[var(--text-dim)] mt-1">
          Thời gian: {durationMin}:{String(durationSec).padStart(2, "0")} · +{correctCount * 10 + 50} XP
        </div>
        <div className="flex gap-2 justify-center mt-5 flex-wrap">
          <Link href={`/courses/${set.courseId}/${mode === "exam" ? "exam" : "practice"}`} className="btn3d btn3d-secondary btn3d-sm">
            Bộ khác
          </Link>
          <Link href="/history" className="btn3d btn3d-secondary btn3d-sm">
            Lịch sử
          </Link>
          <Button3D variant="primary" size="sm" onClick={() => setPhase("setup")}>
            <RotateCw size={14} /> Làm lại
          </Button3D>
        </div>
      </div>

      <div>
        <h2 className="text-xl font-bold mb-3">Chi tiết từng câu</h2>
        <div className="space-y-4">
          {prepared.map((p, i) => (
            <QuestionCard
              key={p.q.id}
              question={p.q}
              optionMap={p.optionMap}
              selected={selections[i] ?? []}
              revealed
              questionNumber={i + 1}
              totalQuestions={prepared.length}
              onToggle={() => {}}
              disabled
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-bold uppercase tracking-widest text-[var(--text-dim)] block mb-1.5">{label}</label>
      <div className="space-y-1">{children}</div>
    </div>
  );
}
