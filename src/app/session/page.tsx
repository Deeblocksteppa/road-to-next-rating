import Link from "next/link";
import { redirect } from "next/navigation";

import { GuidedSession } from "@/components/session/GuidedSession";
import { SKILL_TITLES } from "@/lib/diagnoses";
import { findDrillById, parseDurationMinutes } from "@/lib/drill-lookup";
import {
  getCompletedThisWeekDrillIds,
  getWeeklyProgress,
} from "@/lib/drill-sessions";
import { createClient } from "@/lib/supabase/server";
import type { SkillId } from "@/lib/types";

/**
 * Guided session flow (brief → timer → log → confirmation).
 *
 * Lives outside the (app) route group deliberately: this is a focused,
 * one-way flow, so it gets no tab bar — same reasoning as /settings.
 *
 * Drill selection: the first drill on the plan not yet logged this week. That
 * matches what the Plan screen strikes through and what Home's "sessions this
 * week" counts, so "Start today's session" always opens the thing that screen
 * says is still outstanding.
 */
export default async function SessionPage() {
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

  const [completedThisWeek, weekly] = await Promise.all([
    getCompletedThisWeekDrillIds(supabase, plan.id),
    getWeeklyProgress(supabase, plan.id, planDrills.length),
  ]);

  const drill = planDrills.find((d) => !completedThisWeek.has(d.id));

  // Everything on the plan is logged for the week. Restrained dead-end rather
  // than dropping them into a session that would dedup into a no-op.
  if (!drill) {
    return (
      <main className="flex min-h-[100dvh] w-full max-w-md flex-col gap-6 bg-background px-6 py-8 text-ink">
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
      drillId={drill.id}
      drillName={drill.name}
      skillTitle={bottleneck ? SKILL_TITLES[bottleneck] : ""}
      instructions={drill.description}
      duration={drill.duration}
      durationMinutes={parseDurationMinutes(drill.duration)}
      logPrompt={drill.logPrompt}
      fallbackWeekly={weekly}
    />
  );
}
