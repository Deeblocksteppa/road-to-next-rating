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
  const progress = ((index + 1) / total) * 100;
  const counter = `${String(index + 1).padStart(2, "0")}/${String(total).padStart(2, "0")}`;

  function advance(nextAnswers: AnswerMap) {
    if (index < total - 1) {
      setIndex((i) => i + 1);
      setSelected(null);
    } else {
      onComplete(nextAnswers);
    }
  }

  function handleOptionTap(optionId: string) {
    const next = { ...answers, [question.id]: optionId };
    setAnswers(next);
    setSelected(optionId);
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
    <main className="relative min-h-[100dvh] w-full bg-background text-ink">
      <AssessmentStyles />

      {/* Header row — back + thin progress bar + counter */}
      <div className="flex items-center gap-4 px-6 pt-5">
        <button
          onClick={handleBack}
          aria-label="Go back"
          className={[
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-line-strong text-[16px] text-ink-2 transition-colors",
            "hover:border-line-hover",
            index === 0 ? "pointer-events-none opacity-0" : "opacity-100",
          ].join(" ")}
        >
          ‹
        </button>
        <div className="h-[3px] flex-1 overflow-hidden rounded-full bg-line">
          <div
            className="h-full rounded-full bg-optic transition-[width] duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="shrink-0 font-mono text-[11px] tracking-[0.1em] text-ink-3">
          {counter}
        </span>
      </div>

      {/* Question content */}
      <div className="px-6 pb-12 pt-11">
        <div key={index} className="q-in flex flex-col gap-3.5">
          {question.helperText && (
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-3">
              {question.helperText}
            </p>
          )}

          <h2 className="text-balance font-display text-2xl font-bold leading-[1.25] tracking-[-0.01em] md:text-[28px]">
            {question.prompt}
          </h2>

          <div className="mt-4">
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
      </div>

      {/* Primary "Next" button — only for multiple-choice; text entry has its own CTA */}
      {question.options && (
        <div className="px-6 pb-8">
          <button
            onClick={() => selected && advance(answers)}
            disabled={!selected}
            className="flex h-[52px] w-full items-center justify-center rounded-lg border border-transparent bg-optic text-[15px] font-semibold text-optic-ink transition-colors hover:bg-optic-hover active:scale-[0.98] disabled:pointer-events-none disabled:border-line disabled:bg-surface disabled:text-ink-3"
          >
            Next
          </button>
        </div>
      )}
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
    <ul className="flex flex-col gap-3">
      {question.options!.map((opt) => {
        const isSelected = selected === opt.id;
        return (
          <li key={opt.id}>
            <button
              onClick={() => onSelect(opt.id)}
              className={[
                "flex min-h-16 w-full items-center justify-between gap-3 rounded-xl border px-[18px] py-3.5 text-left text-[15px] leading-[1.4] transition-all duration-150 active:scale-[0.99]",
                isSelected
                  ? "border-optic bg-optic/[0.08] text-ink"
                  : "border-line bg-surface text-ink hover:border-line-hover hover:bg-[#17171A]",
              ].join(" ")}
            >
              <span>{opt.label}</span>
              {isSelected && (
                <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-optic" />
              )}
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
    "w-full rounded-md border border-line-strong bg-surface px-4 py-3.5",
    "text-[15px] leading-relaxed text-ink placeholder-ink-3",
    "focus:border-line-hover focus:outline-none",
    "transition-colors duration-200 resize-none",
  ].join(" ");

  return (
    <div className="flex flex-col gap-4">
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
          className={`h-12 ${baseClass}`}
          onKeyDown={(e) => e.key === "Enter" && onContinue()}
        />
      )}
      <button
        onClick={onContinue}
        className="flex h-[52px] w-full items-center justify-center rounded-lg bg-optic text-[15px] font-semibold text-optic-ink transition-colors hover:bg-optic-hover active:scale-[0.98]"
      >
        {isLast ? "See my diagnosis" : "Continue"}
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
