"use client";

import { forwardRef, useEffect, useRef, useState } from "react";
import { SKILL_LABELS, SKILL_TITLES } from "@/lib/diagnoses";
import { Diagnosis, SkillId } from "@/lib/types";

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
  const back = () => {
    if (beat > 0) setBeat((b) => b - 1);
  };

  /*
   * Keyboard. Right arrow, Enter and Space advance; left arrow goes back.
   * Enter and Space are left alone when a button or link has focus, so the
   * focused control handles its own press (the Back and Continue controls
   * below, and the plan button on the last beat) and nothing fires twice.
   */
  const advanceRef = useRef(advance);
  const backRef = useRef(back);
  advanceRef.current = advance;
  backRef.current = back;
  // Last input was a key, not a tap or click. Keeps the focus handoff below
  // to keyboard users, so a tap never pops a focus ring onto the footer.
  const usingKeyboard = useRef(false);
  const continueRef = useRef<HTMLButtonElement>(null);
  const planRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onPointer = () => {
      usingKeyboard.current = false;
    };
    window.addEventListener("pointerdown", onPointer);
    return () => window.removeEventListener("pointerdown", onPointer);
  }, []);

  /*
   * The footer swaps controls between the last two beats (Continue ↔ the
   * plan button), which drops focus to <body>. For a keyboard user, put it
   * back on the control that moves them on.
   */
  useEffect(() => {
    if (!usingKeyboard.current) return;
    const active = document.activeElement;
    if (active && active !== document.body) return;
    (isLast ? planRef.current : continueRef.current)?.focus();
  }, [beat, isLast]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      usingKeyboard.current = true;
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      const onControl = (e.target as HTMLElement | null)?.closest("button, a, input, textarea");
      if (e.key === "ArrowRight" || (!onControl && (e.key === "Enter" || e.key === " "))) {
        e.preventDefault();
        advanceRef.current();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        backRef.current();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

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
        <div
          className="flex gap-[5px] pt-6"
          role="img"
          aria-label={`Part ${beat + 1} of ${BEAT_COUNT}`}
        >
          {Array.from({ length: BEAT_COUNT }).map((_, i) => (
            <span
              key={i}
              className={`h-0.5 flex-1 rounded-full ${i <= beat ? "bg-ink" : "bg-line-strong"}`}
            />
          ))}
        </div>

        {/* Beat content. A polite live region, so a screen reader reads each
            beat as it arrives while focus stays on the control that moved it. */}
        <div aria-live="polite" className="flex flex-1 flex-col">
          <div key={beat} className="beat-in flex flex-1 flex-col justify-center">
            {beat === 0 && <MirrorBeat diagnosis={diagnosis} />}
            {beat === 1 && <VerdictBeat diagnosis={diagnosis} />}
            {beat === 2 && <InsightBeat diagnosis={diagnosis} />}
            {beat === 3 && <AbsolutionBeat diagnosis={diagnosis} />}
            {beat === 4 && <ReadinessBeat diagnosis={diagnosis} />}
          </div>
        </div>

        {/*
          Keys matter here: without them React reuses the focused Continue
          element as the last beat's Back button, and a second Enter would
          step the player backwards.

          Footer. The hint stays the quiet mono line it always was, but it is
          now a real button, so the reveal can be reached by Tab and pressed,
          with a Back control beside it. Tap-anywhere still advances on
          mobile. On the last beat the plan button takes the Continue slot.
        */}
        {isLast ? (
          <div className="flex flex-col gap-2">
            <button
              key="plan"
              ref={planRef}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onNext();
              }}
              className="flex h-[52px] w-full items-center justify-center rounded-lg bg-optic text-[15px] font-semibold text-optic-ink transition-colors hover:bg-optic-hover active:scale-[0.98]"
            >
              See my 3-week plan
            </button>
            <RevealNavButton key="back" onPress={back} label="Back" className="self-center">
              ‹ Back
            </RevealNavButton>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            {beat > 0 ? (
              <RevealNavButton key="back" onPress={back} label="Back">
                ‹ Back
              </RevealNavButton>
            ) : (
              <span />
            )}
            <RevealNavButton key="continue" ref={continueRef} onPress={advance} label="Continue" pulse>
              {/* "Tap" only where tapping is how you'd do it. */}
              <span className="[@media(pointer:fine)]:hidden">Tap to continue</span>
              <span className="hidden [@media(pointer:fine)]:inline">Continue ›</span>
            </RevealNavButton>
            {beat > 0 ? <span className="w-[72px]" aria-hidden="true" /> : <span />}
          </div>
        )}
      </div>
    </main>
  );
}

/**
 * The reveal's quiet navigation: mono label, no fill, a 44px hit area. It
 * looks like the hint line it replaces, not like a form button.
 */
const RevealNavButton = forwardRef<
  HTMLButtonElement,
  {
    onPress: () => void;
    label: string;
    pulse?: boolean;
    className?: string;
    children: React.ReactNode;
  }
>(function RevealNavButton({ onPress, label, pulse, className = "", children }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        onPress();
      }}
      className={[
        "flex h-11 min-w-[72px] items-center justify-center rounded-md px-2 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-2 transition-colors hover:text-ink",
        pulse ? "continue-hint" : "",
        className,
      ].join(" ")}
    >
      {children}
    </button>
  );
});

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
/**
 * One sentence, then a few words. It used to be a paragraph in 29px bold
 * followed by a second paragraph making the same point — a speech between
 * the insight and the number. The relief has to land in the sentence.
 */
function AbsolutionBeat({ diagnosis }: { diagnosis: Diagnosis }) {
  return (
    <div className="flex flex-col gap-[26px]">
      <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-ink-3">
        The part that matters
      </p>
      <h2 className="text-pretty font-display text-[26px] font-bold leading-[1.3] tracking-[-0.015em]">
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
    // Reduced motion: land on the final number and bar, no count or sweep.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setFill(diagnosis.readiness);
      setCount(diagnosis.readiness);
      return;
    }

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
    <ReadinessReading
      readiness={diagnosis.readiness}
      bottleneck={diagnosis.bottleneck}
      shown={count}
      fill={fill}
    />
  );
}

/**
 * The readiness screen's content, without the count-up. Shared by the reveal's
 * last beat (which animates `shown` and `fill` from 0) and the marketing page's
 * step 03, which renders it static — so the page shows this screen's current
 * copy instead of a capture of an old version of it.
 */
export function ReadinessReading({
  readiness,
  bottleneck,
  shown = readiness,
  fill = readiness,
}: {
  readiness: number;
  bottleneck: SkillId;
  /** The number on screen — mid-count during the reveal's animation. */
  shown?: number;
  /** Bar width in percent — animates in during the reveal. */
  fill?: number;
}) {
  return (
    <div className="flex flex-col gap-[26px]">
      <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-ink-3">
        Readiness for 4.0
      </p>

      <div className="font-display text-[96px] font-extrabold leading-none tabular-nums">
        {shown}
        <span className="text-[28px] font-semibold text-ink-3"> /100</span>
      </div>

      <div className="flex flex-col gap-2.5">
        <div className="h-1.5 overflow-hidden rounded-full bg-line">
          <div
            className="h-full rounded-full bg-optic transition-[width] duration-[1100ms] ease-out motion-reduce:transition-none"
            style={{ width: `${fill}%` }}
          />
        </div>
        <div className="flex justify-between">
          <span className="font-mono text-[10px] tracking-[0.1em] text-ink-3">3.0</span>
          <span className="font-mono text-[10px] tracking-[0.1em] text-ink-3">4.0</span>
        </div>
      </div>

      {/* Baseline, what it means, and where the plan starts. Not a verdict on
          their game: the number is a reading of their answers, and it is the
          thing the re-test moves against. */}
      <p className="text-pretty text-[15px] leading-[1.6] text-ink-2">
        {readiness} is your baseline from these answers. The plan starts on{" "}
        {SKILL_LABELS[bottleneck]}, and the re-test in three weeks shows what moved.
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
      /* Pulses colour between ink-3 and ink-2 (5.1:1 and 9.3:1 on the reveal
         ground). It used to pulse opacity down to 0.5, which bottomed out
         near 2:1 on the only cue that the screen continues. */
      @keyframes hintPulse {
        0%, 100% { color: #80807b; }
        50%      { color: #b0b0ab; }
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
