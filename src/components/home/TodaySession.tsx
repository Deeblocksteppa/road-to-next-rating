import Link from "next/link";

import type { Drill } from "@/lib/drills";
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
 * Home's "today" block: what the session is made of, then the button.
 *
 * The button used to promise "25 MIN" — both drills summed — with nothing on
 * the screen saying that was two drills, and then opened a flow that ran one.
 * Now the card lists each drill with its own length, and the button's minutes
 * are what is LEFT of the session, so a half-finished one reads "Finish
 * today's session · 10 MIN" rather than offering the full 25 again.
 *
 * Presentational (the page does the querying) so its states can be rendered
 * and checked without a signed-in account.
 */
export function TodaySession({
  drills,
  completedToday,
  weekComplete,
}: {
  drills: Drill[];
  /** Ids of drills already logged today. */
  completedToday: string[];
  /** This week's session target is already met. */
  weekComplete: boolean;
}) {
  const { done, remaining, todayDone, startedToday, allDone } = todayState(
    drills,
    completedToday,
    weekComplete
  );
  const minutesLeft = sessionMinutes(remaining);

  return (
    <>
      {drills.length > 0 && !allDone && (
        <section className="flex flex-col rounded-2xl border border-line bg-surface px-[22px] py-4">
          <p className="pb-1 font-mono text-[10px] uppercase leading-[1.6] tracking-[0.14em] text-ink-3">
            {todayDone ? "Today's session · done" : `Today · ${sessionShape(drills)}`}
          </p>
          {drills.map((drill, i) => {
            const logged = done.has(drill.id);
            return (
              <div
                key={drill.id}
                className={`flex items-center justify-between gap-3 py-2.5 ${
                  i === 0 ? "" : "border-t border-line"
                }`}
              >
                <span
                  className={`text-[15px] font-semibold leading-[1.3] ${
                    logged ? "text-ink-3 line-through" : "text-ink"
                  }`}
                >
                  {drill.name}
                </span>
                <span className="shrink-0 font-mono text-[11px] uppercase tracking-[0.1em] tabular-nums text-ink-3">
                  {logged ? "Logged" : drill.duration}
                </span>
              </div>
            );
          })}
        </section>
      )}

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
          className="flex h-14 w-full items-center justify-center gap-2.5 rounded-lg bg-optic text-[15px] font-semibold text-optic-ink transition-colors hover:bg-optic-hover active:scale-[0.98]"
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
