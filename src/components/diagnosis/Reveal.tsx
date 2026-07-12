"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { SKILL_LABELS } from "@/lib/diagnoses";
import { Diagnosis } from "@/lib/types";

const BEAT_COUNT = 5;

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
        "relative min-h-[100dvh] w-full overflow-hidden select-none",
        "bg-[#080b12] text-slate-100",
        isLast ? "cursor-default" : "cursor-pointer",
      ].join(" ")}
      style={{
        backgroundImage:
          "radial-gradient(120% 80% at 50% -10%, #0e1726 0%, #080b12 55%, #06080d 100%)",
      }}
    >
      <RevealStyles />

      {/* Beat content — full screen, vertically centered, centered column */}
      <div className="flex min-h-[100dvh] w-full items-center justify-center px-6 pt-20 pb-36 md:px-7 md:pt-24">
        <div
          key={beat}
          className="beat-in mx-auto w-full max-w-[600px] text-center"
        >
          {beat === 0 && <MirrorBeat diagnosis={diagnosis} />}
          {beat === 1 && <BottleneckBeat diagnosis={diagnosis} />}
          {beat === 2 && <ReframeBeat diagnosis={diagnosis} />}
          {beat === 3 && <ThatsWhyBeat diagnosis={diagnosis} />}
          {beat === 4 && <ReadinessBeat diagnosis={diagnosis} onNext={onNext} />}
        </div>
      </div>

      {/* Continue affordance */}
      {!isLast && (
        <div className="pointer-events-none absolute inset-x-0 bottom-20 flex flex-col items-center gap-1">
          <span className="continue-hint text-[11px] font-medium uppercase tracking-[0.2em] text-slate-500">
            Tap to continue
          </span>
          <svg
            className="continue-hint h-4 w-4 text-slate-600"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </div>
      )}

      {/* Progress dots */}
      <div className="absolute inset-x-0 bottom-8 flex items-center justify-center gap-2">
        {Array.from({ length: BEAT_COUNT }).map((_, i) => (
          <span
            key={i}
            className={[
              "h-1.5 rounded-full transition-all duration-500 ease-out",
              i === beat
                ? "w-6 bg-gradient-to-r from-sky-400 to-emerald-400"
                : i < beat
                  ? "w-1.5 bg-slate-500"
                  : "w-1.5 bg-slate-700",
            ].join(" ")}
          />
        ))}
      </div>
    </main>
  );
}

/* ── Beat 1: Mirror ───────────────────────────────────────────── */
function MirrorBeat({ diagnosis }: { diagnosis: Diagnosis }) {
  return (
    <div className="space-y-8 md:space-y-10">
      <h1 className="text-xl font-medium leading-snug tracking-tight text-slate-200 md:text-2xl">
        Here&apos;s what you told me about your game.
      </h1>
      {/* Block centered in the column, but text left-aligned within */}
      <ul className="mx-auto max-w-[460px] space-y-4 text-left md:space-y-5">
        {diagnosis.mirror.map((line, i) => (
          <li key={i} className="flex gap-4">
            <span className="mt-2.5 h-px w-5 shrink-0 bg-gradient-to-r from-sky-400/70 to-transparent" />
            <span className="text-[15px] leading-relaxed text-slate-400 md:text-[17px]">
              {line}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ── Beat 2: Bottleneck — the verdict ─────────────────────────── */
function BottleneckBeat({ diagnosis }: { diagnosis: Diagnosis }) {
  return (
    <div className="space-y-6 md:space-y-8">
      <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-sky-400/80">
        Your bottleneck
      </p>
      <h2 className="text-4xl font-semibold leading-[1.05] tracking-tight text-slate-50 md:text-[2.75rem]">
        {SKILL_LABELS[diagnosis.bottleneck]}
      </h2>
      <p className="mx-auto max-w-[440px] text-[17px] leading-relaxed text-slate-400 md:text-[18px]">
        {diagnosis.bottleneckVerdict}
      </p>
    </div>
  );
}

/* ── Beat 3: Reframe — THE moment, the emotional peak ─────────── */
function ReframeBeat({ diagnosis }: { diagnosis: Diagnosis }) {
  return (
    <div className="space-y-6 md:space-y-14">
      <span className="mx-auto block h-8 w-px bg-gradient-to-b from-transparent to-emerald-400/60 md:h-16" />
      <p className="bg-gradient-to-br from-white via-slate-100 to-slate-300 bg-clip-text text-[22px] font-medium leading-[1.5] tracking-tight text-transparent md:text-[32px] md:leading-[1.55]">
        {diagnosis.reframeText}
      </p>
    </div>
  );
}

/* ── Beat 4: That's why ───────────────────────────────────────── */
function ThatsWhyBeat({ diagnosis }: { diagnosis: Diagnosis }) {
  return (
    <div className="space-y-6">
      <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-emerald-400/80">
        That&apos;s why
      </p>
      <p className="mx-auto max-w-[520px] text-[17px] leading-relaxed text-slate-300 md:text-[19px]">
        {diagnosis.thatsWhyText}
      </p>
    </div>
  );
}

/* ── Beat 5: Readiness ────────────────────────────────────────── */
function ReadinessBeat({ diagnosis, onNext }: { diagnosis: Diagnosis; onNext: () => void }) {
  const [fill, setFill] = useState(0);
  const [count, setCount] = useState(0);

  useEffect(() => {
    const fillTimer = setTimeout(() => setFill(diagnosis.readiness), 200);

    let raf = 0;
    const start = performance.now();
    const duration = 1100;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3);
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
    <div className="space-y-8 md:space-y-10">
      <div className="space-y-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-500">
          Your readiness to break through
        </p>
        <div className="flex items-end justify-center gap-1">
          <span className="bg-gradient-to-br from-sky-400 to-emerald-400 bg-clip-text text-6xl font-semibold tabular-nums leading-none tracking-tight text-transparent md:text-7xl">
            {count}
          </span>
          <span className="mb-2 text-xl font-medium text-slate-500 md:text-2xl">/ 100</span>
        </div>
      </div>

      <div className="space-y-4">
        <div className="mx-auto h-2 w-full max-w-[440px] overflow-hidden rounded-full bg-slate-800/80">
          <div
            className="h-full rounded-full bg-gradient-to-r from-sky-400 to-emerald-400 transition-[width] duration-[1100ms] ease-out"
            style={{ width: `${fill}%` }}
          />
        </div>
        <p className="mx-auto max-w-[460px] text-[15px] leading-relaxed text-slate-400">
          The biggest thing holding you down right now is{" "}
          <span className="font-medium text-slate-200">
            {SKILL_LABELS[diagnosis.bottleneck]}
          </span>
          . Close that gap and the number moves.
        </p>
      </div>

      <Button
        size="lg"
        onClick={(e) => { e.stopPropagation(); onNext(); }}
        className="mx-auto h-12 w-full max-w-[440px] bg-gradient-to-r from-sky-500 to-emerald-500 text-base font-medium text-white hover:opacity-90"
      >
        See my plan →
      </Button>
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
        0%, 100% { opacity: 0.35; }
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
