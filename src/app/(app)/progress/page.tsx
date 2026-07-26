import { redirect } from "next/navigation";

import {
  ProgressView,
  type ProgressViewData,
} from "@/components/progress/ProgressView";
import { SKILL_LABELS } from "@/lib/diagnoses";
import { findDrillById } from "@/lib/drill-lookup";
import { getScoredSessionsByDrill, getWeeklyStreak } from "@/lib/drill-sessions";
import { DRILLS } from "@/lib/drills";
import { getPlanTimeline } from "@/lib/plan-timeline";
import {
  buildHistoryRows,
  buildReadinessSeries,
  monthDay,
  pickSessionSeries,
  shortDate,
  weeksBetween,
} from "@/lib/progress";
import { createClient } from "@/lib/supabase/server";
import type { SkillId } from "@/lib/types";

/** Readiness score that marks 4.0-ready — the dashed line on the chart. */
const READINESS_TARGET = 80;

/**
 * Progress — three states driven by real data:
 *   • no diagnosis at all      → prompt to take the assessment
 *   • exactly one diagnosis    → Day One (no re-test history yet)
 *   • 2+ diagnoses + paid      → Full
 *   • 2+ diagnoses + free      → Locked
 * Each re-test inserts a new `diagnoses` row, so row count IS the re-test history.
 */
export default async function ProgressPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login?next=/progress");
  }

  const [diagnosesRes, planRes, profileRes, sessionsRes] = await Promise.all([
    supabase
      .from("diagnoses")
      .select("id, readiness, bottleneck, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true }),
    // Every plan, newest first: [0] drives Day One / the session target, and the
    // full set maps diagnosis_id → window so history rows can be labelled.
    supabase
      .from("plans")
      .select("id, diagnosis_id, drill_ids, retest_date, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("profiles")
      .select("subscription_status")
      .eq("id", user.id)
      .maybeSingle(),
    // RLS scopes drill_sessions to the caller — count of every session logged.
    supabase.from("drill_sessions").select("*", { count: "exact", head: true }),
  ]);

  const diags = diagnosesRes.data ?? [];
  const plans = planRes.data ?? [];
  const plan = plans[0] ?? null;
  const sessionsDone = sessionsRes.count ?? 0;

  let viewData: ProgressViewData;

  if (diags.length === 0) {
    viewData = { kind: "empty" };
  } else if (diags.length < 2) {
    // ── State 1: Day One — baseline only, no re-test yet.
    const bottleneck = diags[diags.length - 1].bottleneck as SkillId;
    const timeline =
      plan?.retest_date && plan.created_at
        ? getPlanTimeline(plan.created_at, plan.retest_date)
        : null;

    viewData = {
      kind: "day-one",
      retestDateLabel: plan?.retest_date ? monthDay(plan.retest_date) : "—",
      daysUntilRetest: timeline?.daysUntilRetest ?? 0,
      weekNumber: timeline?.weekNumber ?? 1,
      weeksTarget: timeline?.weeksTarget ?? 3,
      bottleneckPhrase: SKILL_LABELS[bottleneck] ?? "your bottleneck",
      sessionsDone,
      daysElapsed: timeline?.daysElapsed ?? 1,
    };
  } else {
    // ── State 2/3: has re-test history.
    const first = diags[0];
    const last = diags[diags.length - 1];

    // Weekly session target = number of drills on the current plan.
    const sessionTarget = plan
      ? ((plan.drill_ids as string[] | null) ?? []).filter((id) =>
          Boolean(findDrillById(id))
        ).length
      : 0;

    // The practice series beneath the readiness line: logged scores for the
    // current bottleneck's drills. Picks the drill with the most scored
    // sessions; renders only with 2+ (pickSessionSeries returns null otherwise).
    const bottleneckDrills = DRILLS[last.bottleneck as SkillId] ?? [];
    const scoredByDrill = await getScoredSessionsByDrill(
      supabase,
      bottleneckDrills.map((d) => d.id)
    );
    const sessions = pickSessionSeries(
      bottleneckDrills.map((d) => {
        const results = scoredByDrill.get(d.id) ?? [];
        return {
          drillName: d.name,
          values: results.map((r) => r.resultValue),
          lastAt: results.at(-1)?.completedAt ?? null,
        };
      })
    );

    const chart = {
      series: buildReadinessSeries(diags),
      target: READINESS_TARGET,
      weeksSpan: weeksBetween(first.created_at, last.created_at),
      totalChange: (last.readiness ?? 0) - (first.readiness ?? 0),
      startLabel: shortDate(first.created_at),
      endLabel: shortDate(last.created_at),
      sessions,
    };
    const history = buildHistoryRows(diags, plans);
    const streak = await getWeeklyStreak(supabase, sessionTarget);

    const isPaid = profileRes.data?.subscription_status === "active";

    viewData = isPaid
      ? { kind: "full", history, streak, ...chart }
      : {
          kind: "locked",
          currentReadiness: last.readiness ?? 0,
          history,
          streak,
          ...chart,
        };
  }

  return <ProgressView data={viewData} />;
}
