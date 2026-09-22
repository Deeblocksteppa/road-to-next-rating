import Link from "next/link";
import { redirect } from "next/navigation";

import { SessionDrills } from "@/components/plan/SessionDrills";
import { findDrillById } from "@/lib/drill-lookup";
import { getCompletedTodayDrillIds, getWeeklyProgress } from "@/lib/drill-sessions";
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
    .select("id, drill_ids, in_game_rule, retest_metric, retest_date, status, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const planDrills = plan
    ? ((plan.drill_ids as string[] | null) ?? [])
        .map((id) => findDrillById(id))
        .filter((d): d is NonNullable<typeof d> => Boolean(d))
    : [];

  const [completedToday, weekly] = plan
    ? await Promise.all([
        getCompletedTodayDrillIds(supabase, plan.id),
        getWeeklyProgress(supabase, plan.id, planDrills.length),
      ])
    : [new Set<string>(), { completed: 0, total: 0 }];

  const timeline =
    plan && plan.retest_date ? getPlanTimeline(plan.created_at, plan.retest_date) : null;

  const bottleneck = diagnosis?.bottleneck as SkillId | undefined;

  return (
    <main className="flex flex-col gap-3.5 px-6 py-8">
      <header className="flex items-end justify-between pt-4">
        <div>
          {timeline && (
            <p className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-3">
              Week {timeline.weekNumber} of {timeline.weeksTarget}
            </p>
          )}
          <h1 className="font-display text-2xl font-bold tracking-[-0.01em]">
            {bottleneck ? WEEK_FOCUS_LABELS[bottleneck] : "My Plan"}
          </h1>
        </div>
        {plan && (
          <span className="pb-1 font-mono text-[11px] tracking-[0.1em] text-optic">
            {weekly.completed}/{weekly.total} SESSIONS
          </span>
        )}
      </header>

      {plan ? (
        <>
          <SessionDrills
            drills={planDrills}
            completedToday={Array.from(completedToday)}
            weekly={weekly}
          />

          {plan.in_game_rule && (
            <section className="flex flex-col gap-2 rounded-2xl border border-optic bg-optic/[0.04] px-5 py-[18px]">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-optic">
                In-game rule — this week
              </p>
              <p className="text-pretty text-[15px] leading-[1.55] text-ink">
                {plan.in_game_rule}
              </p>
            </section>
          )}

          {plan.retest_metric && (
            <section className="flex flex-col gap-2 rounded-2xl border border-line bg-surface px-5 py-[18px]">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-3">
                Re-test metric
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
