import { logDrillSession } from "@/app/(app)/plan/actions";
import type { Drill } from "@/lib/drills";
import type { WeeklyProgress } from "@/lib/drill-sessions";
import { sessionShape } from "@/lib/session-plan";

/**
 * The Plan tab's session block: one line saying what this week and today
 * consist of, then today's drills as tappable cards.
 *
 * Presentational on purpose (the page does the querying), so the states can be
 * rendered and checked without a signed-in account — the same split Progress
 * uses with `ProgressView`.
 *
 * Today's session is every drill on the plan, same day (`session-plan.ts`).
 * "In progress" is the one state where a drill really is due today — the
 * session only counts if the rest is logged in the same sitting. Before that
 * there is no schedule to be late against, so nothing is badged: the plan asks
 * for two sessions a week, on any days. The badge used to be unconditional.
 */
export function SessionDrills({
  planId,
  drills: planDrills,
  completedToday,
  weekly,
}: {
  planId: string;
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
      {planDrills.map((drill) => {
        const doneToday = done.has(drill.id);

        if (doneToday) {
          return (
            <div
              key={drill.id}
              className="flex items-start gap-4 rounded-2xl border border-line bg-surface px-5 py-[18px]"
            >
              <span className="mt-0.5 flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-sm bg-optic">
                <span className="text-sm font-bold text-optic-ink">✓</span>
              </span>
              <div className="flex flex-1 flex-col gap-1">
                <p className="font-display text-[17px] font-semibold text-ink-3 line-through">
                  {drill.name}
                </p>
                <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-ink-3">
                  {drill.duration} · logged today
                </p>
              </div>
            </div>
          );
        }

        return (
          <form key={drill.id} action={logDrillSession.bind(null, planId, drill.id)}>
            <button
              type="submit"
              className="flex w-full items-start gap-4 rounded-2xl border border-line-strong bg-surface px-5 py-[18px] text-left transition-colors hover:border-line-hover"
            >
              <span className="mt-0.5 h-[26px] w-[26px] shrink-0 rounded-sm border-[1.5px] border-line-hover box-border" />
              <div className="flex flex-1 flex-col gap-1.5">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-display text-[17px] font-semibold text-ink">
                    {drill.name}
                  </p>
                  {inProgress ? (
                    <span className="shrink-0 rounded-xs bg-warn/[0.12] px-[9px] py-[5px] font-mono text-[10px] leading-none tracking-[0.1em] text-warn">
                      DUE TODAY
                    </span>
                  ) : (
                    <span className="shrink-0 pt-1 font-mono text-[11px] tabular-nums text-ink-3">
                      {drill.duration}
                    </span>
                  )}
                </div>
                <p className="text-[13px] leading-[1.5] text-ink-2">
                  {inProgress ? `${drill.duration} · ` : ""}
                  {drill.description}
                </p>
              </div>
            </button>
          </form>
        );
      })}
    </div>
    </>
  );
}
