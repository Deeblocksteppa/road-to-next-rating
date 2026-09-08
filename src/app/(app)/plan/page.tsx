import Link from "next/link";
import { redirect } from "next/navigation";

import { logDrillSession } from "@/app/(app)/plan/actions";
import { findDrillById } from "@/lib/drill-lookup";
import {
  getCompletedThisWeekDrillIds,
  getCompletedTodayDrillIds,
  getWeeklyProgress,
} from "@/lib/drill-sessions";
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

  const [completedToday, completedThisWeek, weekly] = plan
    ? await Promise.all([
        getCompletedTodayDrillIds(supabase, plan.id),
        getCompletedThisWeekDrillIds(supabase, plan.id),
        getWeeklyProgress(supabase, plan.id, planDrills.length),
      ])
    : [new Set<string>(), new Set<string>(), { completed: 0, total: 0 }];

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
          <div className="flex flex-col gap-3">
            {planDrills.length === 0 && (
              <p className="text-sm text-ink-2">No drills on this plan.</p>
            )}
            {planDrills.map((drill) => {
              const doneWeek = completedThisWeek.has(drill.id);
              const doneToday = completedToday.has(drill.id);

              if (doneWeek) {
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
                      <p className="text-[13px] leading-[1.5] text-ink-3">
                        {drill.duration} · {drill.description}
                      </p>
                    </div>
                  </div>
                );
              }

              return (
                <form key={drill.id} action={logDrillSession.bind(null, plan.id, drill.id)}>
                  <button
                    type="submit"
                    disabled={doneToday}
                    className="flex w-full items-start gap-4 rounded-2xl border border-line-strong bg-surface px-5 py-[18px] text-left transition-colors hover:border-line-hover disabled:pointer-events-none"
                  >
                    <span className="mt-0.5 h-[26px] w-[26px] shrink-0 rounded-sm border-[1.5px] border-line-hover box-border" />
                    <div className="flex flex-1 flex-col gap-1">
                      <p className="font-display text-[17px] font-semibold text-ink">
                        {drill.name}
                      </p>
                      <p className="text-[13px] leading-[1.5] text-ink-2">
                        {drill.duration} · {drill.description}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-xs bg-warn/[0.12] px-[9px] py-[5px] font-mono text-[10px] tracking-[0.1em] text-warn">
                      DUE TODAY
                    </span>
                  </button>
                </form>
              );
            })}
          </div>

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
