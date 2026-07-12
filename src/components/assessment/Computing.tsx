"use client";

import { useEffect, useReducer, useRef } from "react";

const LINES: { text: string; weight?: "normal" | "heavy" }[] = [
  { text: "Comparing your answers to what separates 3.5 and 4.0 players…" },
  { text: "Cross-referencing your shots with how you train…" },
  { text: "Found it.", weight: "heavy" },
];

// Stagger timings (ms): when each line becomes visible.
// Each line fades in over ~500ms then holds before the next appears.
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

  return (
    <main
      className="flex min-h-[100dvh] w-full items-center justify-center px-6 bg-[#080b12]"
      style={{
        backgroundImage:
          "radial-gradient(120% 80% at 50% -10%, #0e1726 0%, #080b12 55%, #06080d 100%)",
      }}
    >
      <ComputingStyles />
      <div className="mx-auto w-full max-w-[520px] space-y-6 text-center">
        {LINES.map((line, i) => (
          <p
            key={i}
            className={[
              "computing-line",
              i < visible ? "computing-line--visible" : "",
              line.weight === "heavy"
                ? "text-[22px] font-semibold text-slate-50 md:text-[26px]"
                : "text-[16px] text-slate-400 md:text-[17px]",
            ].join(" ")}
          >
            {line.text}
          </p>
        ))}
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
