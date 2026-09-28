"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { logGuidedSession } from "@/app/(app)/plan/actions";
import type { WeeklyProgress } from "@/lib/drill-sessions";
import { DrillBriefContent } from "@/components/session/DrillBrief";
import { ShotDemo } from "@/components/session/ShotDemo";

type Step = "brief" | "active" | "log";

/** One drill of the session, as the flow needs it. */
export interface GuidedDrill {
  id: string;
  name: string;
  /** Full technique instructions — behind "View instructions" on the timer. */
  instructions: string;
  /** "Partner" / "Wall" / "Solo". */
  setup: string;
  /** One technique cue for the timer screen. */
  cue: string;
  /** What to log when the timer ends. */
  logProtocol: string;
  /** What counts as a success. */
  counts: string;
  /** "7 of 10". */
  practiceTarget: string;
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
  /** Every drill in today's session, in order, with what is already logged. */
  outline: OutlineItem[];
  /** The drills still to run today, in order. */
  drills: GuidedDrill[];
  /** The plan's match re-test target sentence, shown beside the practice target. */
  retestMetric: string | null;
  /** Weekly count as of page load, shown if the log write returns nothing. */
  fallbackWeekly: WeeklyProgress;
  /** The write. Defaults to the real server action; a fixture can substitute one. */
  log?: typeof logGuidedSession;
}

/** "9:05" — mono countdown, per the design system's "countdown is mono" rule. */
function formatClock(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/**
 * One session = every drill on the plan, same sitting (`session-plan.ts`).
 * The flow loops brief → timer → log once per remaining drill and reaches the
 * confirmation only after the last one, because that is the moment the
 * session counts. Each drill is written as it is logged, so quitting halfway
 * loses nothing: the route resumes at the first drill not yet logged today.
 *
 * Which drill is current is DERIVED, never stored as an index into `drills`.
 * The log action calls `revalidatePath`, and Next answers a revalidating
 * action by re-rendering the current route and handing this component fresh
 * props — with the drill just logged removed from `drills`. The old code kept
 * `index` in state and advanced it to 1 while the array shrank to one entry,
 * so `drills[1].id` threw on a real phone the moment drill 1 was logged (a
 * retry worked because the fresh mount started at 0). Now the current drill
 * is the first in `drills` that this visit has not logged, which is the same
 * drill whether or not the refreshed props have arrived.
 */
export function GuidedSession(props: GuidedSessionProps) {
  const [step, setStep] = useState<Step>("brief");
  const [selected, setSelected] = useState<number | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [weekly, setWeekly] = useState<WeeklyProgress>(props.fallbackWeekly);
  // Drill ids whose write was CONFIRMED during this visit.
  const [loggedNow, setLoggedNow] = useState<string[]>([]);
  // A ref, not only state: two taps in one frame both read the same stale
  // `pending`, and the server's per-day dedup should be the last line, not
  // the first.
  const inFlight = useRef(false);

  const outline = props.outline.map((item) => ({
    ...item,
    doneToday: item.doneToday || loggedNow.includes(item.id),
  }));
  const drill = props.drills.find((d) => !loggedNow.includes(d.id));

  // Every drill confirmed: the session is complete. This is also what the
  // route renders on a fresh load once everything is logged, so the swap Next
  // makes after the last log (fresh props, no drills left) lands on the same
  // screen this is already showing.
  if (!drill) {
    return (
      <main className="flex min-h-[100dvh] w-full max-w-md flex-col gap-6 bg-background px-6 py-8 text-ink">
        <SessionCompleteScreen weekly={weekly} />
      </main>
    );
  }

  const position = outline.findIndex((item) => item.id === drill.id) + 1;
  const next = outline.find((item, i) => i >= position && !item.doneToday) ?? null;

  return (
    <main className="flex min-h-[100dvh] w-full max-w-md flex-col gap-6 bg-background px-6 py-8 text-ink">
      {step === "brief" && (
        <BriefScreen
          drill={drill}
          position={position}
          total={outline.length}
          next={next}
          retestMetric={props.retestMetric}
          onBegin={() => setStep("active")}
        />
      )}

      {step === "active" && (
        // Keyed by drill so each drill gets its own fresh clock.
        <ActiveScreen key={drill.id} drill={drill} onFinish={() => setStep("log")} />
      )}

      {step === "log" && (
        <LogScreen
          drill={drill}
          isLast={next === null}
          selected={selected}
          onSelect={setSelected}
          pending={pending}
          error={error}
          onSubmit={async () => {
            if (selected === null || inFlight.current) return;
            inFlight.current = true;
            setPending(true);
            setError(null);
            try {
              const result = await (props.log ?? logGuidedSession)(props.planId, drill.id, selected);
              // null means the server refused the write (signed out, or not
              // this user's plan). Nothing below may run until the write is
              // confirmed: "logged" is only ever said about a saved number.
              if (!result) {
                setError("Couldn't save that — you may have been signed out. Sign in and try again.");
                return;
              }
              setWeekly(result);
              setLoggedNow((ids) => [...ids, drill.id]);
              setSelected(null);
              setStep("brief");
            } catch {
              // Keep them on the log screen with their number intact — a failed
              // write should never look like a successful session.
              setError("Couldn't save that. Check your connection and try again.");
            } finally {
              inFlight.current = false;
              setPending(false);
            }
          }}
        />
      )}
    </main>
  );
}

/* ── Screen 1 — Brief ───────────────────────────────────────────── */
/**
 * Drill n of m · duration · setup, the title, the instructions, the logging
 * protocol, the diagram, Begin. What is NOT here any more: the session's
 * total, the skill category, and an outline that repeated the title and
 * duration — the next drill is one small line at the bottom instead.
 */
function BriefScreen({
  drill,
  position,
  total,
  next,
  retestMetric,
  onBegin,
}: {
  drill: GuidedDrill;
  position: number;
  total: number;
  next: OutlineItem | null;
  retestMetric: string | null;
  onBegin: () => void;
}) {
  return (
    <>
      <header className="flex items-center justify-between pt-4">
        <Link
          href="/plan"
          aria-label="Back to plan"
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
        <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-2">
          Drill {position} of {total} · {drill.duration} · {drill.setup}
        </span>
      </header>

      <DrillBriefContent drill={drill} retestMetric={retestMetric} />

      <div className="flex-1" />

      {/* Shot demo sits centered in the empty space. It renders nothing for
          drills whose animation isn't built yet, in which case the two
          spacers simply collapse into one. */}
      <ShotDemo drillId={drill.id} />

      <div className="flex-1" />

      <div className="flex flex-col gap-3">
        <button
          onClick={onBegin}
          className="flex h-[52px] w-full items-center justify-center rounded-lg bg-optic text-[15px] font-semibold text-optic-ink transition-colors hover:bg-optic-hover active:scale-[0.98]"
        >
          {position === 1 ? "Begin" : `Begin drill ${position}`}
        </button>
        {next && (
          <p className="text-center font-mono text-[11px] uppercase tracking-[0.12em] text-ink-3">
            Next: {next.name} · {next.duration}
          </p>
        )}
      </div>
    </>
  );
}

/* ── Screen 2 — Active / timer ──────────────────────────────────── */
/**
 * The clock counts against a wall-clock deadline rather than decrementing
 * once per tick: a 15-minute drill often runs with the phone locked, where
 * timers are throttled hard, and deriving from Date.now() keeps the clock
 * right when they look back at it. Pause stores what is left and drops the
 * deadline; Resume sets a new one from what is left.
 */
function ActiveScreen({ drill, onFinish }: { drill: GuidedDrill; onFinish: () => void }) {
  const total = Math.max(1, Math.round(drill.durationMinutes * 60));

  const [deadline, setDeadline] = useState<number | null>(() => Date.now() + total * 1000);
  const [remaining, setRemaining] = useState(total);
  const [showInstructions, setShowInstructions] = useState(false);
  const paused = deadline === null;

  // onFinish in a ref so the countdown effect doesn't re-run (and restart the
  // timer) on every parent render.
  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;

  useEffect(() => {
    if (deadline === null) return;
    const tick = () => setRemaining(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [deadline]);

  // Advancing is a side effect of hitting zero, so it belongs in its own
  // effect — firing it from inside the state updater above would be a
  // setState during another component's render.
  useEffect(() => {
    if (remaining === 0) onFinishRef.current();
  }, [remaining]);

  const elapsedPct = ((total - remaining) / total) * 100;

  return (
    <>
      <header className="flex items-center justify-between pt-4">
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-2">
          {paused ? "Paused" : "In session"}
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-2">
          {drill.name}
        </span>
      </header>

      <div className="flex flex-col items-center gap-5 pt-6">
        <p
          className={`font-mono text-[64px] font-medium leading-none tabular-nums ${
            paused ? "text-ink-2" : ""
          }`}
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

      {/* One cue and the measurement reminder — not the paragraph again. */}
      <div className="flex flex-col gap-3">
        <p className="font-display text-[20px] font-bold leading-[1.3] tracking-[-0.01em]">
          {drill.cue}
        </p>
        <p className="font-mono text-[11px] uppercase leading-[1.6] tracking-[0.1em] text-ink-3">
          {drill.logProtocol} When the clock hits zero, stop where you are and log it — falling
          short of {drill.practiceTarget} still counts.
        </p>
        <button
          type="button"
          onClick={() => setShowInstructions((v) => !v)}
          aria-expanded={showInstructions}
          className="self-start font-mono text-[11px] uppercase tracking-[0.12em] text-ink-2 underline decoration-line-hover underline-offset-4 hover:text-ink"
        >
          {showInstructions ? "Hide instructions" : "View instructions"}
        </button>
        {showInstructions && (
          <p className="text-[14px] leading-[1.6] text-ink-2">{drill.instructions}</p>
        )}
      </div>

      <div className="flex-1" />

      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={() =>
            setDeadline((d) => (d === null ? Date.now() + remaining * 1000 : null))
          }
          className="flex h-[52px] w-full items-center justify-center rounded-lg bg-optic text-[15px] font-semibold text-optic-ink transition-colors hover:bg-optic-hover active:scale-[0.98]"
        >
          {paused ? "Resume" : "Pause"}
        </button>
        <button
          type="button"
          onClick={onFinish}
          className="flex h-[44px] w-full items-center justify-center rounded-lg text-[14px] font-medium text-ink-2 transition-colors hover:text-ink"
        >
          Finish drill
        </button>
      </div>
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
      <p className="-mt-3 text-[14px] leading-[1.5] text-ink-2">{drill.counts}</p>

      {/* 0–10 across two rows. Option-select visual language (radius-xl,
          surface/line default, accent border + 8% fill when selected) sized
          down to a square tap target. */}
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
        {pending ? "Saving…" : isLast ? "Log and finish session" : "Log and go to next drill"}
      </button>
    </>
  );
}

/* ── Screen 4 — Confirmation ────────────────────────────────────── */
/**
 * Shown only once every drill's write has been confirmed. Exported so the
 * /session route renders the identical screen when it loads with nothing
 * left to do, which is also what Next swaps in after the last log.
 */
export function SessionCompleteScreen({ weekly }: { weekly: WeeklyProgress }) {
  const weekDone = weekly.total > 0 && weekly.completed >= weekly.total;
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
          {weekly.completed} of {weekly.total} sessions this week.{" "}
          {weekDone ? "That's the week — rest counts too." : "The next one is any other day."}
        </p>
      </div>

      <div className="flex-1" />

      <Link
        href="/plan"
        className="flex h-[52px] w-full items-center justify-center rounded-lg bg-optic text-[15px] font-semibold text-optic-ink transition-colors hover:bg-optic-hover active:scale-[0.98]"
      >
        Back to plan
      </Link>
    </>
  );
}
