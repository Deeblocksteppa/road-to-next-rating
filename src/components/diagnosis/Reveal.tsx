"use client";

import { useEffect, useState } from "react";
import { SKILL_LABELS, SKILL_TITLES } from "@/lib/diagnoses";
import { Diagnosis } from "@/lib/types";

const BEAT_COUNT = 5;

/**
 * The reveal — five choreographed beats, spec order (DESIGN_SYSTEM.md §5):
 *   0 mirror → 1 verdict → 2 insight → 3 absolution → 4 readiness
 * Darker-than-app background, story-progress ticks up top, one idea per beat,
 * the user controls the pace (tap to continue), readiness ends on the CTA.
 */
export function Reveal({ diagnosis, onNext }: { diagnosis: Diagnosis; onNext: () => void }) {
  const [beat, setBeat] = useState(0);
  const isLast = beat === BEAT_COUNT - 1;

  const advance = () => {
    if (!isLast) setBeat((b) => b + 1);
  };

  return (
    <main
      onClick={advance}
      className={[
        "relative min-h-[100dvh] w-full select-none overflow-hidden bg-reveal text-ink",
        isLast ? "cursor-default" : "cursor-pointer",
      ].join(" ")}
    >
      <RevealStyles />

      <div className="mx-auto flex min-h-[100dvh] w-full max-w-[440px] flex-col px-6 pb-8">
        {/* Story-progress ticks */}
        <div className="flex gap-[5px] pt-6">
          {Array.from({ length: BEAT_COUNT }).map((_, i) => (
            <span
              key={i}
              className={`h-0.5 flex-1 rounded-full ${i <= beat ? "bg-ink" : "bg-line-strong"}`}
            />
          ))}
        </div>

        {/* Beat content */}
        <div key={beat} className="beat-in flex flex-1 flex-col justify-center">
          {beat === 0 && <MirrorBeat diagnosis={diagnosis} />}
          {beat === 1 && <VerdictBeat diagnosis={diagnosis} />}
          {beat === 2 && <InsightBeat diagnosis={diagnosis} />}
          {beat === 3 && <AbsolutionBeat diagnosis={diagnosis} />}
          {beat === 4 && <ReadinessBeat diagnosis={diagnosis} />}
        </div>

        {/* Footer — tap hint for beats 0–3, the CTA on readiness */}
        {isLast ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onNext();
            }}
            className="flex h-[52px] w-full items-center justify-center rounded-lg bg-optic text-[15px] font-semibold text-optic-ink transition-colors hover:bg-optic-hover active:scale-[0.98]"
          >
            See my 3-week plan
          </button>
        ) : (
          <div className="flex justify-center">
            <span className="continue-hint font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3">
              Tap to continue
            </span>
          </div>
        )}
      </div>
    </main>
  );
}

/* ── Beat 1: Mirror — their answers reflected back ────────────── */
function MirrorBeat({ diagnosis }: { diagnosis: Diagnosis }) {
  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-col gap-3">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-ink-3">
          What you told us
        </p>
        <h1 className="font-display text-2xl font-bold leading-[1.2] tracking-[-0.01em]">
          In your own words —
        </h1>
      </div>
      <div className="flex flex-col gap-5">
        {diagnosis.mirror.map((line, i) => (
          <div key={i} className="border-l-2 border-line-strong pl-4">
            <p className="text-pretty text-base leading-[1.5] text-ink">{line}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Beat 2: Verdict — centered, the skill name is the only big thing ── */
function VerdictBeat({ diagnosis }: { diagnosis: Diagnosis }) {
  return (
    <div className="flex flex-col items-center gap-6 text-center">
      <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-ink-3">
        Your bottleneck
      </p>
      <h2 className="text-balance font-display text-[46px] font-extrabold leading-[1.04] tracking-[-0.02em]">
        {SKILL_TITLES[diagnosis.bottleneck]}
      </h2>
      <div className="h-px w-11 bg-line-strong" />
      <p className="max-w-[280px] text-balance text-[15px] leading-[1.6] text-ink-2">
        {diagnosis.bottleneckVerdict}
      </p>
    </div>
  );
}

/* ── Beat 3: Insight — why it hasn't improved, left-aligned ───── */
function InsightBeat({ diagnosis }: { diagnosis: Diagnosis }) {
  return (
    <div className="flex flex-col gap-[22px]">
      <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-ink-3">
        Why it hasn&apos;t improved
      </p>
      <h2 className="text-pretty font-display text-[25px] font-bold leading-[1.32] tracking-[-0.01em]">
        {diagnosis.insightHeadline}
      </h2>
      <p className="text-pretty text-[15.5px] leading-[1.68] text-ink-2">
        {diagnosis.insightBody}
      </p>
    </div>
  );
}

/* ── Beat 4: Absolution — the exhale ──────────────────────────── */
function AbsolutionBeat({ diagnosis }: { diagnosis: Diagnosis }) {
  return (
    <div className="flex flex-col gap-[26px]">
      <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-ink-3">
        The part that matters
      </p>
      <h2 className="text-pretty font-display text-[29px] font-bold leading-[1.28] tracking-[-0.015em]">
        {diagnosis.absolution}
      </h2>
      <div className="h-px w-11 bg-line-strong" />
      <p className="text-pretty text-[15px] leading-[1.6] text-ink-2">
        {diagnosis.absolutionClose}
      </p>
    </div>
  );
}

/* ── Beat 5: Readiness — the score ────────────────────────────── */
function ReadinessBeat({ diagnosis }: { diagnosis: Diagnosis }) {
  const [fill, setFill] = useState(0);
  const [count, setCount] = useState(0);

  useEffect(() => {
    const fillTimer = setTimeout(() => setFill(diagnosis.readiness), 200);

    let raf = 0;
    const start = performance.now();
    const duration = 1100;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
      setCount(Math.round(eased * diagnosis.readiness));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      clearTimeout(fillTimer);
      cancelAnimationFrame(raf);
    };
  }, [diagnosis.readiness]);

  return (
    <div className="flex flex-col gap-[26px]">
      <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-ink-3">
        Readiness for 4.0
      </p>

      <div className="font-display text-[96px] font-extrabold leading-none tabular-nums">
        {count}
        <span className="text-[28px] font-semibold text-ink-3"> /100</span>
      </div>

      <div className="flex flex-col gap-2.5">
        <div className="h-1.5 overflow-hidden rounded-full bg-line">
          <div
            className="h-full rounded-full bg-optic transition-[width] duration-[1100ms] ease-out"
            style={{ width: `${fill}%` }}
          />
        </div>
        <div className="flex justify-between">
          <span className="font-mono text-[10px] tracking-[0.1em] text-ink-3">3.0</span>
          <span className="font-mono text-[10px] tracking-[0.1em] text-ink-3">4.0</span>
        </div>
      </div>

      <p className="text-pretty text-[15px] leading-[1.6] text-ink-2">
        The biggest thing between you and 4.0 is {SKILL_LABELS[diagnosis.bottleneck]}.
        The plan starts there.
      </p>
    </div>
  );
}

/* ── Animations (scoped, restrained) ──────────────────────────── */
function RevealStyles() {
  return (
    <style>{`
      @keyframes beatIn {
        from { opacity: 0; transform: translateY(10px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      .beat-in {
        animation: beatIn 0.7s cubic-bezier(0.22, 1, 0.36, 1) both;
      }
      @keyframes hintPulse {
        0%, 100% { opacity: 0.5; }
        50%      { opacity: 0.9; }
      }
      .continue-hint {
        animation: hintPulse 2.6s ease-in-out infinite;
      }
      @media (prefers-reduced-motion: reduce) {
        .beat-in, .continue-hint { animation: none; }
      }
    `}</style>
  );
}
