"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { logGuidedSession } from "@/app/(app)/plan/actions";
import type { WeeklyProgress } from "@/lib/drill-sessions";
import { ShotDemo } from "@/components/session/ShotDemo";

type Step = "brief" | "active" | "log" | "done";

/** One drill of the session, as the flow needs it. */
export interface GuidedDrill {
  id: string;
  name: string;
  instructions: string;
  duration: string;
  durationMinutes: number;
  logPrompt: string;
}

/** A row of the session outline — every drill on the plan, done or not. */
export interface OutlineItem {
  id: string;
  name: string;
  duration: string;
  doneToday: boolean;
}

export interface GuidedSessionProps {
  planId: string;
  /** Skill title from SKILL_TITLES — the bottleneck these drills serve. */
  skillTitle: string;
  /** "25 minutes, 2 drills" — the whole session, not what is left of it. */
  sessionShape: string;
  /** Every drill in today's session, in order, with what is already logged. */
  outline: OutlineItem[];
  /** The drills still to run today, in order. Never empty. */
  drills: GuidedDrill[];
  /** Weekly count as of page load, shown if the log write returns nothing. */
  fallbackWeekly: WeeklyProgress;
}

/** "9:05" — mono countdown, per the design system's "countdown is mono" rule. */
function formatClock(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/**
 * One session = every drill on the plan, same day (`session-plan.ts`). The
 * flow loops brief → timer → log once per remaining drill and only reaches
 * the confirmation after the last one, because that is the moment the session
 * actually counts. Each drill is written as it is logged, so quitting halfway
 * loses nothing: Home offers "Finish today's session" and this route resumes
 * at the first drill not yet logged today.
 */
export function GuidedSession(props: GuidedSessionProps) {
  const [index, setIndex] = useState(0);
  const [step, setStep] = useState<Step>("brief");
  const [selected, setSelected] = useState<number | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [weekly, setWeekly] = useState<WeeklyProgress>(props.fallbackWeekly);
  // Drill ids logged during this visit, so the outline ticks them off.
  const [loggedNow, setLoggedNow] = useState<string[]>([]);

  const drill = props.drills[index];
  const isLast = index === props.drills.length - 1;
  const outline = props.outline.map((item) => ({
    ...item,
    doneToday: item.doneToday || loggedNow.includes(item.id),
  }));
  const position = outline.findIndex((item) => item.id === drill.id) + 1;

  return (
    <main className="flex min-h-[100dvh] w-full max-w-md flex-col gap-6 bg-background px-6 py-8 text-ink">
      {step === "brief" && (
        <BriefScreen
          drill={drill}
          skillTitle={props.skillTitle}
          sessionShape={props.sessionShape}
          outline={outline}
          position={position}
          onBegin={() => setStep("active")}
        />
      )}

      {step === "active" && (
        // Keyed by drill so the second drill gets its own fresh deadline.
        <ActiveScreen key={drill.id} drill={drill} onFinish={() => setStep("log")} />
      )}

      {step === "log" && (
        <LogScreen
          drill={drill}
          isLast={isLast}
          selected={selected}
          onSelect={setSelected}
          pending={pending}
          error={error}
          onSubmit={async () => {
            if (selected === null || pending) return;
            setPending(true);
            setError(null);
            try {
              const result = await logGuidedSession(props.planId, drill.id, selected);
              // null means the server refused the write (signed out, or not
              // this user's plan). It used to fall through to "Session
              // logged", which is the one thing this screen must never say
              // about a number that was not saved.
              if (!result) {
                setError("Couldn't save that — you may have been signed out. Sign in and try again.");
                return;
              }
              setWeekly(result);
              setLoggedNow((ids) => [...ids, drill.id]);
              setSelected(null);
              if (isLast) {
                setStep("done");
              } else {
                setIndex((i) => i + 1);
                setStep("brief");
              }
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
  drill,
  skillTitle,
  sessionShape,
  outline,
  position,
  onBegin,
}: {
  drill: GuidedDrill;
  skillTitle: string;
  sessionShape: string;
  outline: OutlineItem[];
  position: number;
  onBegin: () => void;
}) {
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
          Drill {position} of {outline.length} · {drill.duration}
        </span>
      </header>

      <div className="flex flex-col gap-2.5">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-2">
          Today&apos;s session · {sessionShape}
        </p>
        <h1 className="font-display text-2xl font-bold leading-[1.25] tracking-[-0.01em]">
          {drill.name}
        </h1>
        <p className="text-[13px] text-ink">{skillTitle}</p>
      </div>

      {/*
        The whole session, so nobody finds out about the second drill after
        finishing the first. The current drill reads in `ink`; logged ones are
        struck through. No accent: the one thing this screen points at is Begin.
      */}
      {outline.length > 1 && (
        <ol className="flex flex-col rounded-xl border border-line bg-surface px-4">
          {outline.map((item, i) => {
            const current = item.id === drill.id;
            return (
              <li
                key={item.id}
                className={`flex items-center justify-between gap-3 py-2.5 ${
                  i === 0 ? "" : "border-t border-line"
                }`}
              >
                <span className="flex items-center gap-3">
                  <span className="w-4 shrink-0 font-mono text-[11px] tabular-nums text-ink-3">
                    {item.doneToday ? "✓" : i + 1}
                  </span>
                  <span
                    className={`text-[14px] font-semibold leading-[1.3] ${
                      item.doneToday
                        ? "text-ink-3 line-through"
                        : current
                          ? "text-ink"
                          : "text-ink-2"
                    }`}
                  >
                    {item.name}
                  </span>
                </span>
                <span className="shrink-0 font-mono text-[11px] uppercase tracking-[0.1em] tabular-nums text-ink-3">
                  {item.duration}
                </span>
              </li>
            );
          })}
        </ol>
      )}

      <p className="text-[15px] leading-[1.6] text-ink">{drill.instructions}</p>

      <div className="flex-1" />

      {/* Shot demo sits centered in the empty space below the description. It
          renders nothing for drills whose animation isn't built yet, in which
          case the two spacers simply collapse into one. */}
      <ShotDemo drillId={drill.id} />

      <div className="flex-1" />

      <button
        onClick={onBegin}
        className="flex h-[52px] w-full items-center justify-center rounded-lg bg-optic text-[15px] font-semibold text-optic-ink transition-colors hover:bg-optic-hover active:scale-[0.98]"
      >
        {position === 1 ? "Begin" : `Begin drill ${position}`}
      </button>
    </>
  );
}

/* ── Screen 2 — Active / timer ──────────────────────────────────── */
function ActiveScreen({
  drill,
  onFinish,
}: {
  drill: GuidedDrill;
  onFinish: () => void;
}) {
  const { name: drillName, instructions, durationMinutes } = drill;
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

      {/* What the clock running out means, stated once for every drill: a
          target in the instructions is something to work toward, not a gate
          the timer can fail you at. */}
      <p className="font-mono text-[11px] uppercase leading-[1.6] tracking-[0.1em] text-ink-3">
        When the clock hits zero, stop where you are and log it. Falling short
        of a target still counts.
      </p>

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
  drill,
  isLast,
  selected,
  onSelect,
  pending,
  error,
  onSubmit,
}: {
  drill: GuidedDrill;
  isLast: boolean;
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
          Log your result · {drill.name}
        </span>
      </header>

      <h1 className="font-display text-2xl font-bold leading-[1.25] tracking-[-0.01em]">
        {drill.logPrompt}
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
        {pending ? "Logging…" : isLast ? "Log and finish session" : "Log and go to next drill"}
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
          {weekly.completed} of {weekly.total} sessions this week.
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
