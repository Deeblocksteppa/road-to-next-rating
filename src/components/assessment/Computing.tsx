"use client";

import { useEffect, useReducer, useRef } from "react";

// Reasoning lines surface one at a time, landing on "Found it." The copy is
// spec-aligned (DESIGN_SYSTEM.md §5); the TIMING below is unchanged.
const LINES: { text: string; weight?: "normal" | "heavy" }[] = [
  { text: "Twelve answers, one direction." },
  { text: "One skill explains all of them." },
  { text: "Found it.", weight: "heavy" },
];

// Stagger timings (ms): when each line becomes visible. UNCHANGED — the
// deliberate ~6s pause is the product doing something serious.
// Line 1 → hold 1600ms → Line 2 → hold 1600ms → Line 3 → hold 1400ms → done.
const REVEAL_AT = [0, 2100, 4200];
// "Found it." appears at 4200ms, fades in ~500ms, holds 1400ms.
const DONE_DELAY = 6100;

export function Computing({ onDone }: { onDone: () => void }) {
  // Count of visible lines — increment-only
  const [visible, inc] = useReducer((n: number) => Math.min(n + 1, LINES.length), 0);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timers: ReturnType<typeof setTimeout>[] = [];

    if (reduced) {
      // Show everything immediately, short pause, then done
      inc(); inc(); inc();
      timers.push(setTimeout(() => onDoneRef.current(), 900));
    } else {
      REVEAL_AT.forEach((delay) => {
        timers.push(setTimeout(inc, delay));
      });
      timers.push(setTimeout(() => onDoneRef.current(), DONE_DELAY));
    }

    return () => timers.forEach(clearTimeout);
  }, []);

  const allVisible = visible >= LINES.length;

  return (
    <main className="flex min-h-[100dvh] w-full items-center justify-center bg-reveal px-6">
      <ComputingStyles />
      <div className="mx-auto flex w-full max-w-[440px] flex-col gap-[22px]">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-ink-3">
          Reading your answers
        </p>

        <div className="flex flex-col gap-4">
          {LINES.map((line, i) => (
            <div
              key={i}
              className={[
                "computing-line flex items-center gap-3",
                i < visible ? "computing-line--visible" : "",
              ].join(" ")}
            >
              {line.weight === "heavy" ? (
                <span className="font-display text-[34px] font-extrabold leading-none tracking-[-0.02em] text-ink">
                  {line.text}
                </span>
              ) : (
                <>
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-line-strong" />
                  <span className="text-[16px] text-ink-3">{line.text}</span>
                </>
              )}
            </div>
          ))}
        </div>

        <div className="flex justify-center pt-2">
          <span
            className={[
              "font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3 transition-opacity duration-500",
              allVisible ? "opacity-100" : "opacity-0",
            ].join(" ")}
          >
            Continuing…
          </span>
        </div>
      </div>
    </main>
  );
}

function ComputingStyles() {
  return (
    <style>{`
      .computing-line {
        opacity: 0;
        transform: translateY(6px);
        transition:
          opacity 0.65s cubic-bezier(0.22, 1, 0.36, 1),
          transform 0.65s cubic-bezier(0.22, 1, 0.36, 1);
      }
      .computing-line--visible {
        opacity: 1;
        transform: translateY(0);
      }
      @media (prefers-reduced-motion: reduce) {
        .computing-line {
          transition: none;
        }
      }
    `}</style>
  );
}
