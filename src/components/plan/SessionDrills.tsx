import Link from "next/link";

import type { Drill } from "@/lib/drills";
import type { WeeklyProgress } from "@/lib/drill-sessions";
import { sessionShape } from "@/lib/session-plan";

/**
 * The Plan tab's session block: one line saying what this week and today
 * consist of, then today's drills as cards.
 *
 * Each card is three rows and an action — name with its status, a mono
 * metadata line, one sentence saying what the drill is, then "Start drill"
 * into the guided session. The technique instructions are not here: they
 * belong on the guided session's brief, beside the animated shot, and putting
 * them on a list card squeezed eight lines of text between a checkbox and a
 * status badge. Status sits in the first row, not in a column of its own.
 *
 * There is no checkbox. The old card was a form that logged the drill as done
 * on a single tap — the same record the guided session writes after a timed
 * drill and a scored result, so a casual tap created a performance entry
 * indistinguishable from a real one. The guided session is now the only way
 * to log, and the card just says whether that has happened.
 *
 * Presentational on purpose (the page does the querying), so the states can be
 * rendered and checked without a signed-in account.
 *
 * Today's session is every drill on the plan, same sitting (`session-plan.ts`).
 * "In progress" is the one state where a drill really is due today — the
 * session only counts if the rest is logged in the same sitting. Before that
 * there is no schedule to be late against, so nothing is badged: the plan asks
 * for two sessions a week, on any days.
 */
export function SessionDrills({
  drills: planDrills,
  completedToday,
  weekly,
}: {
  drills: Drill[];
  /** Ids of drills already logged today. */
  completedToday: string[];
  weekly: WeeklyProgress;
}) {
  const done = new Set(completedToday);
  const remainingToday = planDrills.filter((d) => !done.has(d.id));
  const todayComplete = planDrills.length > 0 && remainingToday.length === 0;
  const inProgress = !todayComplete && remainingToday.length < planDrills.length;
  const weekComplete = weekly.total > 0 && weekly.completed >= weekly.total;

  return (
    <>
      {/*
        One line that says what was agreed to, in the same words the plan
        preview used: how many sessions this week, and what today's is
        made of. The drill cards under it are that session's contents.
      */}
      {planDrills.length > 0 && (
        <p className="font-mono text-[11px] uppercase leading-[1.6] tracking-[0.1em] text-ink-2">
          This week: {weekly.total} sessions ·{" "}
          {todayComplete
            ? "today's is done"
            : inProgress
              ? `left today: ${sessionShape(remainingToday)}`
              : weekComplete
                ? "all done — anything more is extra"
                : `today: ${sessionShape(planDrills)}`}
        </p>
      )}

      <div className="flex flex-col gap-3">
        {planDrills.length === 0 && (
          <p className="text-sm text-ink-2">No drills on this plan.</p>
        )}
        {planDrills.map((drill, i) => {
          const logged = done.has(drill.id);
          return (
            <article
              key={drill.id}
              className={`rounded-2xl border bg-surface px-5 py-4 ${
                logged ? "border-line" : "border-line-strong"
              }`}
            >
              {/* Row 1 — name and status */}
              <div className="flex items-start justify-between gap-3">
                <h3
                  className={`font-display text-[17px] font-semibold leading-[1.3] ${
                    logged ? "text-ink-3" : "text-ink"
                  }`}
                >
                  {drill.name}
                </h3>
                {logged ? (
                  <span className="shrink-0 rounded-xs bg-optic-dim px-[9px] py-[5px] font-mono text-[10px] leading-none tracking-[0.1em] text-optic">
                    LOGGED
                  </span>
                ) : inProgress ? (
                  <span className="shrink-0 rounded-xs bg-warn/[0.12] px-[9px] py-[5px] font-mono text-[10px] leading-none tracking-[0.1em] text-warn">
                    DUE TODAY
                  </span>
                ) : null}
              </div>

              {/* Row 2 — metadata */}
              <p className="mt-1.5 font-mono text-[11px] uppercase leading-[1.5] tracking-[0.1em] text-ink-3">
                {drill.duration} · {drill.setup} · drill {i + 1} of {planDrills.length}
              </p>

              {/* Row 3 — the task, one sentence, full width */}
              <p
                className={`mt-2.5 text-pretty text-[14px] leading-[1.5] ${
                  logged ? "text-ink-3" : "text-ink-2"
                }`}
              >
                {drill.task}
              </p>

              {/* Action — into the guided session, which is the only place a
                  result gets logged. Secondary, not optic: the page's one
                  accent is the in-game rule card. */}
              {!logged && (
                <Link
                  href={`/session?drill=${encodeURIComponent(drill.id)}`}
                  className="mt-4 inline-flex h-11 items-center justify-center rounded-lg border border-line-strong bg-surface-2 px-5 text-[14px] font-semibold text-ink transition-colors hover:border-line-hover"
                >
                  {inProgress && remainingToday[0]?.id === drill.id
                    ? "Continue session"
                    : "Start drill"}
                </Link>
              )}
            </article>
          );
        })}
      </div>
    </>
  );
}
