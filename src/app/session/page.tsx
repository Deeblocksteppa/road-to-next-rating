import Link from "next/link";
import { redirect } from "next/navigation";

import { GuidedSession, SessionCompleteScreen } from "@/components/session/GuidedSession";
import { toGuidedDrill } from "@/lib/drill-lookup";
import { loadPlanDrills } from "@/lib/plan-drills";
import { getCompletedTodayDrillIds, getWeeklyProgress } from "@/lib/drill-sessions";
import { createClient } from "@/lib/supabase/server";

/**
 * Guided session flow (brief → timer → log → confirmation).
 *
 * Lives outside the (app) route group deliberately: this is a focused,
 * one-way flow, so it gets no tab bar — same reasoning as /settings.
 *
 * A session is every drill on the plan, same day (`session-plan.ts`), so this
 * route runs them all, in plan order, one brief → timer → log loop per drill.
 * It used to open only the first drill not yet logged this week, under a Home
 * button that promised the combined length of both. Drills already logged
 * today are skipped, so leaving halfway and coming back resumes the session
 * rather than restarting it. `?drill=<id>` — the Plan tab's "Start drill" —
 * starts with that drill; the rest of the session still follows.
 */
export default async function SessionPage({
  searchParams,
}: {
  searchParams: { drill?: string };
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login?next=/session");
  }

  const { data: plan } = await supabase
    .from("plans")
    .select("id, drill_ids, diagnosis_id, retest_metric")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!plan) {
    redirect("/home");
  }

  // As prescribed: the solo version for a player without a partner. The brief,
  // the timer cue and the log question all come from this.
  const planDrills = await loadPlanDrills(supabase, plan);

  const [completedToday, weekly] = await Promise.all([
    getCompletedTodayDrillIds(supabase, plan.id),
    getWeeklyProgress(supabase, plan.id, planDrills.length),
  ]);

  const notDone = planDrills.filter((d) => !completedToday.has(d.id));
  const requested = notDone.findIndex((d) => d.id === searchParams.drill);
  const remaining =
    requested > 0 ? [...notDone.slice(requested), ...notDone.slice(0, requested)] : notDone;
  const weekComplete = weekly.total > 0 && weekly.completed >= weekly.total;
  const startedToday = remaining.length < planDrills.length;

  // Today's session is finished: the same screen the guided flow ends on, so
  // the re-render Next makes after the last log lands on identical content.
  if (remaining.length === 0 && planDrills.length > 0) {
    return (
      <main className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col gap-6 bg-background px-6 py-8 text-ink">
        <SessionCompleteScreen weekly={weekly} />
      </main>
    );
  }

  // The week's target is met and nothing is half-done: a restrained dead-end
  // rather than a flow that would dedup into a no-op.
  if (remaining.length === 0 || (weekComplete && !startedToday)) {
    return (
      <main className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col gap-6 bg-background px-6 py-8 text-ink">
        <div className="flex-1" />
        <div className="flex flex-col gap-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-3">
            Nothing due
          </p>
          <h1 className="font-display text-[28px] font-extrabold leading-[1.15] tracking-[-0.01em]">
            You&apos;re done for the week.
          </h1>
          <p className="text-[15px] leading-[1.6] text-ink-2">
            All {weekly.total} sessions logged. Rest counts too.
          </p>
        </div>
        <div className="flex-1" />
        <Link
          href="/plan"
          className="flex h-[52px] w-full items-center justify-center rounded-lg bg-optic text-[15px] font-semibold text-optic-ink transition-colors hover:bg-optic-hover active:scale-[0.98]"
        >
          Back to plan
        </Link>
      </main>
    );
  }

  return (
    <GuidedSession
      planId={plan.id as string}
      outline={planDrills.map((d) => ({
        id: d.id,
        name: d.name,
        duration: d.duration,
        doneToday: completedToday.has(d.id),
      }))}
      drills={remaining.map(toGuidedDrill)}
      retestMetric={(plan.retest_metric as string | null) ?? null}
      fallbackWeekly={weekly}
    />
  );
}
