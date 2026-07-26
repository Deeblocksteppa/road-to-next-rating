"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { logGuidedSession } from "@/app/(app)/plan/actions";
import type { WeeklyProgress } from "@/lib/drill-sessions";
import { ShotDemo } from "@/components/session/ShotDemo";

type Step = "brief" | "active" | "log" | "done";

export interface GuidedSessionProps {
  planId: string;
  drillId: string;
  drillName: string;
  /** Skill title from SKILL_TITLES — the bottleneck this drill serves. */
  skillTitle: string;
  instructions: string;
  duration: string;
  durationMinutes: number;
  logPrompt: string;
  /** Weekly count as of page load, shown if the log write returns nothing. */
  fallbackWeekly: WeeklyProgress;
}

/** "9:05" — mono countdown, per the design system's "countdown is mono" rule. */
function formatClock(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function GuidedSession(props: GuidedSessionProps) {
  const [step, setStep] = useState<Step>("brief");
  const [selected, setSelected] = useState<number | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [weekly, setWeekly] = useState<WeeklyProgress>(props.fallbackWeekly);

  return (
    <main className="flex min-h-[100dvh] w-full max-w-md flex-col gap-6 bg-background px-6 py-8 text-ink">
      {step === "brief" && (
        <BriefScreen {...props} onBegin={() => setStep("active")} />
      )}

      {step === "active" && (
        <ActiveScreen {...props} onFinish={() => setStep("log")} />
      )}

      {step === "log" && (
        <LogScreen
          {...props}
          selected={selected}
          onSelect={setSelected}
          pending={pending}
          error={error}
          onSubmit={async () => {
            if (selected === null || pending) return;
            setPending(true);
            setError(null);
            try {
              const result = await logGuidedSession(
                props.planId,
                props.drillId,
                selected
              );
              if (result) setWeekly(result);
              setStep("done");
            } catch {
              // Keep them on the log screen with their number intact — a failed
              // write should never look like a successful session.
              setError("Couldn't save that. Check your connection and try again.");
            } finally {
              setPending(false);
            }
          }}
        />
      )}

      {step === "done" && <DoneScreen weekly={weekly} />}
    </main>
  );
}

/* ── Screen 1 — Brief ───────────────────────────────────────────── */
function BriefScreen({
  drillId,
  drillName,
  skillTitle,
  instructions,
  duration,
  onBegin,
}: GuidedSessionProps & { onBegin: () => void }) {
  return (
    <>
      <header className="flex items-center justify-between pt-4">
        <Link
          href="/home"
          aria-label="Back to home"
          className="flex h-9 w-9 items-center justify-center rounded-md border border-line-strong text-ink-2 transition-colors hover:border-line-hover hover:text-ink"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path
              d="M15 5l-7 7 7 7"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Link>
        <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3">
          {duration}
        </span>
      </header>

      <div className="flex flex-col gap-2.5">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-2">
          Today&apos;s session
        </p>
        <h1 className="font-display text-2xl font-bold leading-[1.25] tracking-[-0.01em]">
          {drillName}
        </h1>
        <p className="text-[13px] text-ink">{skillTitle}</p>
      </div>

      <p className="text-[15px] leading-[1.6] text-ink">{instructions}</p>

      <div className="flex-1" />

      {/* Shot demo sits centered in the empty space below the description. It
          renders nothing for drills whose animation isn't built yet, in which
          case the two spacers simply collapse into one. */}
      <ShotDemo drillId={drillId} />

      <div className="flex-1" />

      <button
        onClick={onBegin}
        className="flex h-[52px] w-full items-center justify-center rounded-lg bg-optic text-[15px] font-semibold text-optic-ink transition-colors hover:bg-optic-hover active:scale-[0.98]"
      >
        Begin
      </button>
    </>
  );
}

/* ── Screen 2 — Active / timer ──────────────────────────────────── */
function ActiveScreen({
  drillName,
  instructions,
  durationMinutes,
  onFinish,
}: GuidedSessionProps & { onFinish: () => void }) {
  const total = durationMinutes * 60;

  // Count against a fixed wall-clock deadline rather than decrementing once per
  // tick: a 15-minute drill will often be running with the phone locked or the
  // tab backgrounded, where timers get throttled hard. Deriving from Date.now()
  // means the clock is still correct when they look back at it.
  const [deadline] = useState(() => Date.now() + total * 1000);
  const [remaining, setRemaining] = useState(total);

  // onFinish in a ref so the countdown effect doesn't re-run (and restart the
  // timer) on every parent render.
  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;

  useEffect(() => {
    const tick = () =>
      setRemaining(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [deadline]);

  // Advancing is a side effect of hitting zero, so it belongs in its own effect
  // — firing it from inside the state updater above would be a setState during
  // another component's render.
  useEffect(() => {
    if (remaining === 0) onFinishRef.current();
  }, [remaining]);

  const elapsedPct = total > 0 ? ((total - remaining) / total) * 100 : 0;

  return (
    <>
      <header className="flex items-center justify-between pt-4">
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-2">
          In session
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-2">
          {drillName}
        </span>
      </header>

      <div className="flex flex-col items-center gap-5 pt-8">
        <p
          className="font-mono text-[64px] font-medium leading-none tabular-nums"
          aria-live="off"
        >
          {formatClock(remaining)}
        </p>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-line">
          <div
            className="h-full rounded-full bg-optic transition-[width] duration-1000 ease-linear"
            style={{ width: `${elapsedPct}%` }}
          />
        </div>
      </div>

      <p className="text-[15px] leading-[1.6] text-ink">{instructions}</p>

      <div className="flex-1" />

      <button
        onClick={onFinish}
        className="flex h-[52px] w-full items-center justify-center rounded-lg border border-line-hover bg-surface-2 text-[15px] font-semibold text-ink transition-colors hover:bg-[#202024] active:scale-[0.98]"
      >
        I&apos;m done early
      </button>
    </>
  );
}

/* ── Screen 3 — Log result ──────────────────────────────────────── */
function LogScreen({
  logPrompt,
  selected,
  onSelect,
  pending,
  error,
  onSubmit,
}: GuidedSessionProps & {
  selected: number | null;
  onSelect: (n: number) => void;
  pending: boolean;
  error: string | null;
  onSubmit: () => void;
}) {
  return (
    <>
      <header className="pt-4">
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-3">
          Log your result
        </span>
      </header>

      <h1 className="font-display text-2xl font-bold leading-[1.25] tracking-[-0.01em]">
        {logPrompt}
      </h1>

      {/* 0–10 across two rows. Option-select visual language (radius-xl,
          surface/line default, accent border + 8% fill when selected) sized
          down to a square tap target — the pinned accent dot doesn't apply to
          a square, so the fill and border carry the selected state. */}
      <div className="grid grid-cols-6 gap-2.5">
        {Array.from({ length: 11 }, (_, n) => {
          const isSelected = selected === n;
          return (
            <button
              key={n}
              onClick={() => onSelect(n)}
              aria-pressed={isSelected}
              className={[
                "flex h-[52px] items-center justify-center rounded-xl border font-display text-[17px] font-semibold tabular-nums transition-all duration-150 active:scale-[0.97]",
                isSelected
                  ? "border-optic bg-optic/[0.08] text-ink"
                  : "border-line bg-surface text-ink hover:border-line-hover hover:bg-[#17171A]",
              ].join(" ")}
            >
              {n}
            </button>
          );
        })}
      </div>

      <div className="flex-1" />

      {error && <p className="text-[13px] text-danger">{error}</p>}

      <button
        onClick={onSubmit}
        disabled={selected === null || pending}
        className="flex h-[52px] w-full items-center justify-center rounded-lg border border-transparent bg-optic text-[15px] font-semibold text-optic-ink transition-colors hover:bg-optic-hover active:scale-[0.98] disabled:pointer-events-none disabled:border-line disabled:bg-surface disabled:text-ink-3"
      >
        {pending ? "Logging…" : "Log session"}
      </button>
    </>
  );
}

/* ── Screen 4 — Confirmation ────────────────────────────────────── */
function DoneScreen({ weekly }: { weekly: WeeklyProgress }) {
  // Deliberately no router.refresh() here. This screen is rendered by the
  // /session route, whose server component re-resolves "which drill is due" —
  // and the drill we just logged is no longer due, so a refresh would swap
  // this confirmation out for the "done for the week" dead-end mid-read.
  // Home's freshness is already handled by revalidatePath in the action.
  return (
    <>
      <div className="flex-1" />

      <div className="flex flex-col gap-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-3">
          Session complete
        </p>
        <h1 className="font-display text-[28px] font-extrabold leading-[1.15] tracking-[-0.01em]">
          Session logged.
        </h1>
        <p className="text-[15px] leading-[1.6] text-ink-2">
          {weekly.completed} of {weekly.total} this week.
        </p>
      </div>

      <div className="flex-1" />

      <Link
        href="/home"
        className="flex h-[52px] w-full items-center justify-center rounded-lg bg-optic text-[15px] font-semibold text-optic-ink transition-colors hover:bg-optic-hover active:scale-[0.98]"
      >
        Back to home
      </Link>
    </>
  );
}
