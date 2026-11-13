import Link from "next/link";

import { setupRowLabel, type Drill } from "@/lib/drills";
import { sessionMinutes, sessionShape } from "@/lib/session-plan";

/**
 * Where today's session stands, derived once so the card, the button and the
 * page's caption all agree.
 *
 * A session is every drill on the plan, same day (`session-plan.ts`).
 */
export function todayState(drills: Drill[], completedToday: string[], weekComplete: boolean) {
  const done = new Set(completedToday);
  const remaining = drills.filter((d) => !done.has(d.id));
  const todayDone = drills.length > 0 && remaining.length === 0;
  const startedToday = !todayDone && remaining.length < drills.length;
  // The week's target is met. A session already under way today is still
  // worth finishing, so that case keeps the button live.
  const allDone = weekComplete && !startedToday;
  return { done, remaining, todayDone, startedToday, allDone };
}

/**
 * Home's "today" block, the page's dominant element: what the session is
 * made of, this week's count, then the button.
 *
 * The button used to promise "25 MIN" — both drills summed — with nothing on
 * the screen saying that was two drills, and then opened a flow that ran one.
 * Now the list names each drill with its own length, and the button's minutes
 * are what is LEFT of the session, so a half-finished one reads "Finish
 * today's session · 10 MIN" rather than offering the full 25 again.
 *
 * Under the label, the week's count in words: "1 of 2 sessions this week".
 * It counts sessions, not today's drills, and says so. Each drill row has
 * its minutes and who it needs ("15 MIN · SOLO · WALL").
 *
 * Accent: the button, when it is live and nothing else on the screen is the
 * main action. Otherwise (re-test open, or nothing left to start today)
 * nothing here is optic.
 *
 * Presentational (the page does the querying) so its states can be rendered
 * and checked without a signed-in account.
 */
export function TodaySession({
  drills,
  completedToday,
  weekComplete,
  weekly,
  secondary = false,
}: {
  drills: Drill[];
  /** Ids of drills already logged today. */
  completedToday: string[];
  /** This week's session target is already met. */
  weekComplete: boolean;
  /** Sessions done this week against the weekly target (free; not the paid streak). */
  weekly: { completed: number; total: number };
  /** Something else on the screen is the main action (an open re-test). */
  secondary?: boolean;
}) {
  const { done, remaining, todayDone, startedToday, allDone } = todayState(
    drills,
    completedToday,
    weekComplete
  );
  const minutesLeft = sessionMinutes(remaining);
  const buttonIsAccent = !(allDone || todayDone) && !secondary;

  return (
    <>
      <section className="flex flex-col">
        <div className="flex flex-col gap-1.5 pb-3">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3">
            {allDone ? "This week · done" : todayDone ? "Today · done" : `Today · ${sessionShape(drills)}`}
          </p>
          {weekly.total > 0 && (
            <p className="text-[16px] leading-[1.5] tabular-nums text-ink-2">
              {weekly.completed} of {weekly.total} sessions this week
            </p>
          )}
        </div>

        {drills.length > 0 && !allDone && (
          <ul className="border-b border-line">
            {drills.map((drill) => {
              const logged = done.has(drill.id);
              return (
                <li
                  key={drill.id}
                  className="flex items-baseline justify-between gap-3 border-t border-line py-4"
                >
                  <span
                    className={`font-display text-[18px] font-semibold leading-[1.3] ${
                      logged ? "text-ink-3 line-through" : "text-ink"
                    }`}
                  >
                    {drill.name}
                  </span>
                  <span className="shrink-0 font-mono text-[11px] uppercase tracking-[0.1em] tabular-nums text-ink-3">
                    {logged ? "Logged" : `${drill.duration} · ${setupRowLabel(drill.setup)}`}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <div className="flex-1" />

      {allDone || todayDone ? (
        <button
          type="button"
          disabled
          className="flex h-14 w-full items-center justify-center gap-2 rounded-lg border border-line bg-surface text-[15px] font-semibold text-ink-3"
        >
          {allDone ? "All sessions done this week" : "Today's session done"}
          <span aria-hidden="true">✓</span>
        </button>
      ) : (
        <Link
          href="/session"
          className={`flex h-14 w-full items-center justify-center gap-2.5 rounded-lg text-[15px] font-semibold transition-colors active:scale-[0.98] ${
            buttonIsAccent
              ? "bg-optic text-optic-ink hover:bg-optic-hover"
              : "border border-line-strong bg-surface-2 text-ink hover:border-line-hover"
          }`}
        >
          {startedToday ? "Finish today's session" : "Start today's session"}
          {minutesLeft > 0 && (
            <span className="font-mono text-[11px] opacity-75">{minutesLeft} MIN</span>
          )}
        </Link>
      )}
    </>
  );
}
