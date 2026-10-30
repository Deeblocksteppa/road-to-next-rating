import Link from "next/link";
import { redirect } from "next/navigation";

import {
  GuidedSession,
  SessionCompleteScreen,
  type NextStep,
} from "@/components/session/GuidedSession";
import { monthDay } from "@/lib/date-format";
import { SKILL_LABELS } from "@/lib/diagnoses";
import { toGuidedDrill } from "@/lib/drill-lookup";
import { loadPlanDrills } from "@/lib/plan-drills";
import {
  getCompletedTodayDrillIds,
  getScoredSessionsByDrill,
  getTodayLog,
  getWeeklyProgress,
  startOfSittingUTC,
  startOfWeekUTC,
} from "@/lib/drill-sessions";
import { getPlanTimeline } from "@/lib/plan-timeline";
import { lastTimeBefore, type RecapRow } from "@/lib/session-recap";
import { createClient } from "@/lib/supabase/server";
import type { SkillId } from "@/lib/types";

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
    .select("id, drill_ids, diagnosis_id, retest_metric, retest_date, created_at")
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

  // The recap's inputs come with the page so the screen is ready the moment
  // the last drill is logged: today's numbers (a session resumed after
  // leaving halfway has drill 1 from an earlier visit) and each drill's last
  // number from before this sitting. Logging is free, and so is this.
  const sittingStart = startOfSittingUTC();
  const [completedToday, weekly, todayLog, scored] = await Promise.all([
    getCompletedTodayDrillIds(supabase, plan.id),
    getWeeklyProgress(supabase, plan.id, planDrills.length),
    getTodayLog(supabase, plan.id),
    getScoredSessionsByDrill(
      supabase,
      planDrills.map((d) => d.id)
    ),
  ]);
  const recap: RecapRow[] = planDrills.map((d) => ({
    id: d.id,
    name: d.name,
    result: todayLog.find((e) => e.drillId === d.id)?.result ?? null,
    target: d.practiceTarget,
    lastTime: lastTimeBefore(scored.get(d.id) ?? [], sittingStart),
  }));
  const next = await nextStep(supabase, plan);

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
      <main className="mx-auto flex min-h-app w-full max-w-md flex-col gap-6 bg-background px-6 py-8 text-ink">
        <SessionCompleteScreen weekly={weekly} recap={recap} next={next} />
      </main>
    );
  }

  // The week's target is met and nothing is half-done: a restrained dead-end
  // rather than a flow that would dedup into a no-op.
  if (remaining.length === 0 || (weekComplete && !startedToday)) {
    return (
      <main className="mx-auto flex min-h-app w-full max-w-md flex-col gap-6 bg-background px-6 py-8 text-ink">
        <div className="flex-1" />
        <div className="flex flex-col gap-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-3">
            Nothing due
          </p>
          <h1 className="font-display text-[28px] font-extrabold leading-[1.15] tracking-[-0.01em]">
            You&apos;re done for the week.
          </h1>
          <p className="text-[16px] leading-[1.6] text-ink-2">
            All {weekly.total} sessions logged. Rest counts too.
          </p>
        </div>
        <div className="flex-1" />
        <Link
          href="/plan"
          className="flex h-[52px] w-full items-center justify-center rounded-lg bg-optic text-[15px] font-semibold text-optic-ink transition-colors hover:bg-optic-hover active:scale-[0.98]"
        >
          Back to my plan
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
      recap={recap}
      next={next}
    />
  );
}

/**
 * What the recap can point to: the re-test once it is open; otherwise
 * another session this week, or, once the week is done, Monday or the
 * re-test if it opens first. The recap chooses with its own weekly count.
 */
async function nextStep(
  supabase: Awaited<ReturnType<typeof createClient>>,
  plan: { diagnosis_id: string | null; retest_date: string | null; created_at: string }
): Promise<NextStep> {
  const timeline = plan.retest_date ? getPlanTimeline(plan.created_at, plan.retest_date) : null;
  const retestOpen = timeline !== null && timeline.daysUntilRetest <= 0;
  let skillPhrase: string | undefined;
  if (retestOpen && plan.diagnosis_id) {
    const { data: diagnosis } = await supabase
      .from("diagnoses")
      .select("bottleneck")
      .eq("id", plan.diagnosis_id)
      .maybeSingle();
    const skill = diagnosis?.bottleneck as SkillId | undefined;
    skillPhrase = skill ? SKILL_LABELS[skill] : undefined;
  }
  const nextWeekStart = new Date(startOfWeekUTC().getTime() + 7 * 24 * 60 * 60 * 1000);
  const retestBeforeNextWeek =
    plan.retest_date && new Date(plan.retest_date).getTime() < nextWeekStart.getTime()
      ? monthDay(new Date(plan.retest_date))
      : null;
  return {
    retestOpen,
    skillPhrase,
    nextWeek: `Monday, ${monthDay(nextWeekStart)}`,
    retestBeforeNextWeek,
  };
}
