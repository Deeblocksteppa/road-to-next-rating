import Link from "next/link";

import type { Drill } from "@/lib/drills";
import type { TodayLogEntry, WeeklyProgress } from "@/lib/drill-sessions";

/**
 * The Plan tab's drill cards — today's session, one card per drill.
 *
 * Each card is three rows and an action: name with its status chip, a mono
 * metadata line, one sentence saying what the drill is, then a button into
 * the guided session. The next recommended drill (the first not logged today)
 * carries the page's one primary button; any other drill's is secondary. A
 * logged drill keeps its full contrast and shows the number that was logged —
 * dimming it read as disabled, and the result is the point.
 *
 * There is no checkbox. The guided session is the only way to log, so a
 * casual tap cannot create a performance record.
 *
 * Presentational on purpose (the page does the querying), so the states can be
 * rendered and checked without a signed-in account.
 */
export function SessionDrills({
  drills: planDrills,
  todayLog,
  weekly,
}: {
  drills: Drill[];
  /** Drills already logged today, with results. */
  todayLog: TodayLogEntry[];
  weekly: WeeklyProgress;
}) {
  const logged = new Map(todayLog.map((e) => [e.drillId, e.result]));
  const remainingToday = planDrills.filter((d) => !logged.has(d.id));
  const todayComplete = planDrills.length > 0 && remainingToday.length === 0;
  const inProgress = !todayComplete && remainingToday.length < planDrills.length;
  const weekComplete = weekly.total > 0 && weekly.completed >= weekly.total;
  const nextId = remainingToday[0]?.id ?? null;

  return (
    <>
      {todayComplete && (
        <p className="text-[14px] leading-[1.5] text-ink-2">
          Today&apos;s session complete.{" "}
          {weekComplete
            ? "Both sessions done this week — week " +
              "resets Monday."
            : `Next session: any other day this week (${weekly.total - weekly.completed} to go).`}
        </p>
      )}

      <div className="flex flex-col gap-3">
        {planDrills.length === 0 && (
          <p className="text-sm text-ink-2">No drills on this plan.</p>
        )}
        {planDrills.map((drill, i) => {
          const isLogged = logged.has(drill.id);
          const result = logged.get(drill.id) ?? null;
          const isNext = drill.id === nextId;
          return (
            <article key={drill.id} className="rounded-2xl border border-line bg-surface px-5 py-4">
              {/* Row 1 — name and status */}
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-display text-[17px] font-semibold leading-[1.3] text-ink">
                  {drill.name}
                </h3>
                {isLogged ? (
                  <span className="shrink-0 rounded-xs bg-optic-dim px-[9px] py-[5px] font-mono text-[10px] leading-none tracking-[0.1em] text-optic">
                    {result === null ? "LOGGED" : `LOGGED · ${result}/10`}
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
              <p className="mt-2.5 text-pretty text-[14px] leading-[1.5] text-ink-2">
                {drill.task}
              </p>

              {/* Action — into the guided session, the only place a result
                  gets logged. Primary on the next drill, secondary otherwise. */}
              {!isLogged && (
                <Link
                  href={`/session?drill=${encodeURIComponent(drill.id)}`}
                  className={
                    isNext
                      ? "mt-4 inline-flex h-11 items-center justify-center rounded-lg bg-optic px-5 text-[14px] font-semibold text-optic-ink transition-colors hover:bg-optic-hover active:scale-[0.98]"
                      : "mt-4 inline-flex h-11 items-center justify-center rounded-lg border border-line-strong bg-surface-2 px-5 text-[14px] font-semibold text-ink transition-colors hover:border-line-hover"
                  }
                >
                  {isNext && inProgress ? "Continue session" : "Start drill"}
                </Link>
              )}
            </article>
          );
        })}
      </div>
    </>
  );
}
