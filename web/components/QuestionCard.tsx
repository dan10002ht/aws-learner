"use client";

import { Check, X } from "lucide-react";
import type { Question } from "@/lib/types";

interface Props {
  question: Question;
  optionMap: number[];
  selected: number[];
  onToggle: (displayedIndex: number) => void;
  revealed?: boolean;
  questionNumber?: number;
  totalQuestions?: number;
  disabled?: boolean;
}

export default function QuestionCard({
  question,
  optionMap,
  selected,
  onToggle,
  revealed = false,
  questionNumber,
  totalQuestions,
  disabled = false,
}: Props) {
  const isMulti = question.type === "multi";

  return (
    <div className="card p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4 text-xs text-[var(--text-mute)] uppercase tracking-wide">
        <span>
          {questionNumber !== undefined && totalQuestions !== undefined && (
            <>Câu {questionNumber} / {totalQuestions}</>
          )}
        </span>
        <span>{question.difficulty} · {isMulti ? "Multi" : "Single"}</span>
      </div>

      <h2 className="text-base sm:text-lg md:text-xl font-bold mb-5 leading-snug">{question.question}</h2>

      <div className="space-y-2.5">
        {optionMap.map((origIdx, displayedIdx) => {
          const isSelected = selected.includes(displayedIdx);
          const isCorrectOrig = question.correctIndices.includes(origIdx);
          let cls = "option-row";
          if (revealed) {
            cls += " disabled";
            if (isCorrectOrig) cls += " correct";
            else if (isSelected) cls += " incorrect";
          } else if (isSelected) {
            cls += " selected";
          }
          if (disabled) cls += " disabled";

          return (
            <div
              key={displayedIdx}
              className={cls}
              onClick={() => {
                if (revealed || disabled) return;
                onToggle(displayedIdx);
              }}
            >
              <div className="mt-0.5 flex-shrink-0 w-6 h-6 flex items-center justify-center">
                {revealed && isCorrectOrig ? (
                  <Check size={18} className="text-success" strokeWidth={3} />
                ) : revealed && isSelected ? (
                  <X size={18} className="text-danger" strokeWidth={3} />
                ) : isMulti ? (
                  <span className={`inline-block w-5 h-5 rounded-md border-2 ${isSelected ? "border-brand-500 bg-brand-500/15" : "border-[var(--border-strong)]"} flex items-center justify-center`}>
                    {isSelected && <Check size={12} strokeWidth={3} className="text-brand-600" />}
                  </span>
                ) : (
                  <span className={`inline-block w-5 h-5 rounded-full border-2 ${isSelected ? "border-brand-500" : "border-[var(--border-strong)]"} flex items-center justify-center`}>
                    {isSelected && <span className="w-2.5 h-2.5 rounded-full bg-brand-500" />}
                  </span>
                )}
              </div>
              <div className="flex-1 leading-relaxed">
                <span className="font-mono text-xs text-[var(--text-mute)] mr-2">{String.fromCharCode(65 + displayedIdx)}</span>
                {question.options[origIdx]}
              </div>
            </div>
          );
        })}
      </div>

      {revealed && (
        <div className="mt-5 p-4 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] animate-fade-up">
          <div className="text-xs font-bold text-brand-600 uppercase tracking-widest mb-2">Giải thích</div>
          <p className="text-sm leading-relaxed">{question.explanation}</p>
        </div>
      )}
    </div>
  );
}
