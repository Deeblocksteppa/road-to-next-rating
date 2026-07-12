"use client";

import { useRef, useState } from "react";
import { QUESTIONS } from "@/lib/questions";
import { AnswerMap, Question } from "@/lib/types";

interface Props {
  onComplete: (answers: AnswerMap) => void;
}

export function Assessment({ onComplete }: Props) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswerMap>({});
  // Track pending selection briefly for the tap-then-advance feel
  const [selected, setSelected] = useState<string | null>(null);
  const textRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  const question = QUESTIONS[index];
  const total = QUESTIONS.length;
  const progress = (index / total) * 100;

  function advance(nextAnswers: AnswerMap) {
    if (index < total - 1) {
      setIndex((i) => i + 1);
      setSelected(null);
    } else {
      onComplete(nextAnswers);
    }
  }

  function handleOptionTap(optionId: string) {
    if (selected) return; // debounce double-taps
    const next = { ...answers, [question.id]: optionId };
    setAnswers(next);
    setSelected(optionId);
    setTimeout(() => advance(next), 320);
  }

  function handleTextContinue() {
    const el = textRef.current;
    const value = el?.value.trim() ?? "";
    if (!value && question.required) return;
    const next = { ...answers, [question.id]: value };
    setAnswers(next);
    advance(next);
  }

  function handleBack() {
    if (index === 0) return;
    setSelected(null);
    setIndex((i) => i - 1);
  }

  // Pre-fill text input when navigating back
  const currentText = answers[question.id] ?? "";

  return (
    <main
      className="relative min-h-[100dvh] w-full bg-[#080b12] text-slate-100"
      style={{
        backgroundImage:
          "radial-gradient(120% 80% at 50% -10%, #0e1726 0%, #080b12 55%, #06080d 100%)",
      }}
    >
      <AssessmentStyles />

      {/* Progress bar */}
      <div className="fixed inset-x-0 top-0 z-10 h-[2px] bg-slate-800">
        <div
          className="h-full bg-gradient-to-r from-sky-400 to-emerald-400 transition-[width] duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Header row — back + counter */}
      <div className="fixed inset-x-0 top-0 z-10 flex items-center justify-between px-5 pt-5 pb-3">
        <button
          onClick={handleBack}
          aria-label="Go back"
          className={[
            "flex h-9 w-9 items-center justify-center rounded-full transition-opacity duration-200",
            "text-slate-500 hover:text-slate-300",
            index === 0 ? "pointer-events-none opacity-0" : "opacity-100",
          ].join(" ")}
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>
        <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-600">
          {index + 1} of {total}
        </span>
        <div className="w-9" /> {/* spacer */}
      </div>

      {/* Question content */}
      <div className="flex min-h-[100dvh] w-full items-start justify-center px-6 pt-24 pb-12">
        <div key={index} className="q-in mx-auto w-full max-w-[600px]">
          {/* Helper eyebrow */}
          {question.helperText && (
            <p className="mb-4 text-[12px] text-slate-500">{question.helperText}</p>
          )}

          {/* Prompt */}
          <h2 className="mb-8 text-[22px] font-medium leading-[1.4] tracking-tight text-slate-100 md:text-[26px]">
            {question.prompt}
          </h2>

          {/* Multiple-choice */}
          {question.options ? (
            <OptionList
              question={question}
              selected={selected ?? answers[question.id]}
              onSelect={handleOptionTap}
            />
          ) : (
            <TextEntry
              question={question}
              defaultValue={currentText}
              inputRef={textRef}
              onContinue={handleTextContinue}
              isLast={index === total - 1}
            />
          )}
        </div>
      </div>
    </main>
  );
}

/* ── Multiple-choice options ────────────────────────────────────── */
function OptionList({
  question,
  selected,
  onSelect,
}: {
  question: Question;
  selected: string | undefined;
  onSelect: (id: string) => void;
}) {
  return (
    <ul className="space-y-3">
      {question.options!.map((opt) => {
        const isSelected = selected === opt.id;
        return (
          <li key={opt.id}>
            <button
              onClick={() => onSelect(opt.id)}
              className={[
                "option-btn w-full rounded-xl border px-5 py-4 text-left text-[15px] leading-snug",
                "transition-all duration-200 active:scale-[0.99]",
                isSelected
                  ? "border-sky-400/60 bg-sky-400/10 text-slate-100"
                  : "border-slate-700/60 bg-slate-800/40 text-slate-300 hover:border-slate-500 hover:bg-slate-800/70 hover:text-slate-100",
              ].join(" ")}
            >
              {opt.label}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/* ── Text / textarea entry ──────────────────────────────────────── */
function TextEntry({
  question,
  defaultValue,
  inputRef,
  onContinue,
  isLast,
}: {
  question: Question;
  defaultValue: string;
  inputRef: React.MutableRefObject<HTMLInputElement | HTMLTextAreaElement | null>;
  onContinue: () => void;
  isLast?: boolean;
}) {
  const isLong = question.id === "lose_reason";

  const baseClass = [
    "w-full rounded-xl border border-slate-700/60 bg-slate-800/40 px-5 py-4",
    "text-[15px] leading-relaxed text-slate-100 placeholder-slate-600",
    "focus:border-sky-400/50 focus:bg-slate-800/70 focus:outline-none",
    "transition-colors duration-200 resize-none",
  ].join(" ");

  return (
    <div className="space-y-4">
      {isLong ? (
        <textarea
          ref={inputRef as React.MutableRefObject<HTMLTextAreaElement>}
          defaultValue={defaultValue}
          rows={5}
          placeholder="Type your answer…"
          className={baseClass}
        />
      ) : (
        <input
          ref={inputRef as React.MutableRefObject<HTMLInputElement>}
          type="text"
          defaultValue={defaultValue}
          placeholder="Type your answer…"
          className={baseClass}
          onKeyDown={(e) => e.key === "Enter" && onContinue()}
        />
      )}
      <button
        onClick={onContinue}
        className={[
          "w-full rounded-xl bg-gradient-to-r from-sky-500 to-emerald-500",
          "px-5 py-4 text-[15px] font-medium text-white",
          "hover:opacity-90 active:scale-[0.99] transition-all duration-150",
        ].join(" ")}
      >
        {isLast ? "See my diagnosis →" : "Continue →"}
      </button>
    </div>
  );
}

/* ── Animations ─────────────────────────────────────────────────── */
function AssessmentStyles() {
  return (
    <style>{`
      @keyframes qIn {
        from { opacity: 0; transform: translateY(12px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      .q-in {
        animation: qIn 0.45s cubic-bezier(0.22, 1, 0.36, 1) both;
      }
      @media (prefers-reduced-motion: reduce) {
        .q-in { animation: none; }
      }
    `}</style>
  );
}
