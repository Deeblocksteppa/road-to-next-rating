import Link from "next/link";
import { redirect } from "next/navigation";

import { GuidedSession } from "@/components/session/GuidedSession";
import { SKILL_TITLES } from "@/lib/diagnoses";
import { findDrillById, parseDurationMinutes } from "@/lib/drill-lookup";
import { getCompletedTodayDrillIds, getWeeklyProgress } from "@/lib/drill-sessions";
import { sessionShape } from "@/lib/session-plan";
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

  const [{ data: plan }, { data: diagnosis }] = await Promise.all([
    supabase
      .from("plans")
      .select("id, drill_ids")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("diagnoses")
      .select("bottleneck")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (!plan) {
    redirect("/home");
  }

  const planDrills = ((plan.drill_ids as string[] | null) ?? [])
    .map((id) => findDrillById(id))
    .filter((d): d is NonNullable<typeof d> => Boolean(d));

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

  // Nothing to run: today's session is finished, or the week's target is met
  // and nothing is half-done. Restrained dead-end rather than dropping them
  // into a flow that would dedup into a no-op.
  if (remaining.length === 0 || (weekComplete && !startedToday)) {
    return (
      <main className="flex min-h-[100dvh] w-full max-w-md flex-col gap-6 bg-background px-6 py-8 text-ink">
        <div className="flex-1" />
        <div className="flex flex-col gap-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-3">
            Nothing due
          </p>
          <h1 className="font-display text-[28px] font-extrabold leading-[1.15] tracking-[-0.01em]">
            {weekComplete ? "You're done for the week." : "Today's session is done."}
          </h1>
          <p className="text-[15px] leading-[1.6] text-ink-2">
            {weekComplete
              ? `All ${weekly.total} sessions logged. Rest counts too.`
              : `${weekly.completed} of ${weekly.total} sessions this week. The next one is any other day.`}
          </p>
        </div>
        <div className="flex-1" />
        <Link
          href="/home"
          className="flex h-[52px] w-full items-center justify-center rounded-lg bg-optic text-[15px] font-semibold text-optic-ink transition-colors hover:bg-optic-hover active:scale-[0.98]"
        >
          Back to home
        </Link>
      </main>
    );
  }

  const bottleneck = diagnosis?.bottleneck as SkillId | undefined;

  return (
    <GuidedSession
      planId={plan.id as string}
      skillTitle={bottleneck ? SKILL_TITLES[bottleneck] : ""}
      sessionShape={sessionShape(planDrills)}
      outline={planDrills.map((d) => ({
        id: d.id,
        name: d.name,
        duration: d.duration,
        doneToday: completedToday.has(d.id),
      }))}
      drills={remaining.map((d) => ({
        id: d.id,
        name: d.name,
        instructions: d.description,
        duration: d.duration,
        durationMinutes: parseDurationMinutes(d.duration),
        logPrompt: d.logPrompt,
      }))}
      fallbackWeekly={weekly}
    />
  );
}
