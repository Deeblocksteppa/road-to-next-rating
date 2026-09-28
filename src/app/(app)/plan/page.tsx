import Link from "next/link";
import { redirect } from "next/navigation";

import { SessionDrills } from "@/components/plan/SessionDrills";
import { getTodayLog, getWeeklyProgress } from "@/lib/drill-sessions";
import { sessionShape } from "@/lib/session-plan";
import { loadPlanDrills } from "@/lib/plan-drills";
import { getPlanTimeline } from "@/lib/plan-timeline";
import { WEEK_FOCUS_LABELS } from "@/lib/roadmap";
import { createClient } from "@/lib/supabase/server";
import type { SkillId } from "@/lib/types";

export default async function PlanPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login?next=/plan");
  }

  const { data: diagnosis } = await supabase
    .from("diagnoses")
    .select("bottleneck")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: plan } = await supabase
    .from("plans")
    .select("id, drill_ids, diagnosis_id, in_game_rule, retest_metric, retest_date, status, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // As prescribed: the solo version for a player without a partner.
  const planDrills = plan ? await loadPlanDrills(supabase, plan) : [];

  const [todayLog, weekly] = plan
    ? await Promise.all([
        getTodayLog(supabase, plan.id),
        getWeeklyProgress(supabase, plan.id, planDrills.length),
      ])
    : [[], { completed: 0, total: 0 }];

  const timeline =
    plan && plan.retest_date ? getPlanTimeline(plan.created_at, plan.retest_date) : null;

  const bottleneck = diagnosis?.bottleneck as SkillId | undefined;

  return (
    <main className="flex flex-col gap-3.5 px-6 py-8">
      {/*
        Small week marker, the heading, one plain line saying what today is,
        and a compact status. The status used to be an optic "0/2 SESSIONS"
        in the header and a long wrapping mono sentence under it.
      */}
      <header className="flex flex-col gap-1.5 pt-4">
        {timeline && (
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-3">
            Week {timeline.weekNumber} of {timeline.weeksTarget}
          </p>
        )}
        <h1 className="font-display text-2xl font-bold tracking-[-0.01em]">
          {bottleneck ? WEEK_FOCUS_LABELS[bottleneck] : "My Plan"}
        </h1>
        {plan && planDrills.length > 0 && (
          <p className="text-[15px] leading-[1.5] text-ink-2">
            Today: {sessionShape(planDrills).replace(", ", " · ")}
          </p>
        )}
        {plan && (
          <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-ink-3">
            {weekly.completed} of {weekly.total} sessions this week
          </p>
        )}
      </header>

      {plan ? (
        <>
          <SessionDrills drills={planDrills} todayLog={todayLog} weekly={weekly} />

          {/* Neutral, not the accent-tinted variant: the page's one accent
              is the next drill's Start button, and this card is context. */}
          {plan.in_game_rule && (
            <section className="flex flex-col gap-2 rounded-2xl border border-line bg-surface px-5 py-[18px]">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-3">
                In-game rule — this week
              </p>
              <p className="text-pretty text-[15px] leading-[1.55] text-ink">
                {plan.in_game_rule}
              </p>
            </section>
          )}

          {plan.retest_metric && (
            <section className="flex flex-col gap-2 rounded-2xl border border-line bg-surface px-5 py-[18px]">
              {/* "Match" so it cannot be read as the drills' practice target. */}
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-3">
                Match re-test target
              </p>
              <p className="text-[14px] leading-[1.55] text-ink-2">{plan.retest_metric}</p>
            </section>
          )}
        </>
      ) : (
        <p className="rounded-2xl border border-dashed border-line p-4 text-sm text-ink-2">
          No plan yet.{" "}
          <Link href="/start" className="underline underline-offset-4">
            Take the assessment
          </Link>
          .
        </p>
      )}
    </main>
  );
}
