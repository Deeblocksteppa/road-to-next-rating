import { redirect } from "next/navigation";

import {
  ProgressView,
  type ProgressViewData,
} from "@/components/progress/ProgressView";
import { SKILL_LABELS } from "@/lib/diagnoses";
import { findDrillById } from "@/lib/drill-lookup";
import {
  getPlanSessions,
  getScoredSessionsByDrill,
  getWeeklyStreak,
} from "@/lib/drill-sessions";
import { DRILLS } from "@/lib/drills";
import { loadPlanDrills } from "@/lib/plan-drills";
import { getPlanTimeline } from "@/lib/plan-timeline";
import { readinessOfRow } from "@/lib/readiness";
import { hasCompletedRetest } from "@/lib/retest-gate";
import { PLAN_SESSIONS } from "@/lib/session-plan";
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

/**
 * Progress, by whether the player has finished a re-test (`hasCompletedRetest`:
 * a plan a re-test made), not by how many diagnoses they have, since a
 * signed-in retake on /start adds one with no re-test:
 *   • no diagnosis at all       → prompt to take the assessment
 *   • no completed re-test      → Before the first re-test: this plan's
 *                                 sessions out of six, the baseline readiness
 *                                 and the re-test date. Nothing is sold before
 *                                 there is a re-test to show. Subscribers also
 *                                 get the history empty state and live weeks
 *                                 with both sessions.
 *   • completed re-test + free  → Locked (placeholder only; paid data never loaded)
 *   • completed re-test + paid  → Full
 */
export default async function ProgressPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login?next=/progress");
  }

  const [diagnosesRes, planRes, profileRes, retestDone] = await Promise.all([
    supabase
      .from("diagnoses")
      .select("id, readiness, skill_scores, bottleneck, created_at")
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
    hasCompletedRetest(supabase, user.id),
  ]);
  const isPaid = profileRes.data?.subscription_status === "active";

  // Readiness from each row's skill levels, on the current 0–100 scale, so
  // rows saved under the old 40–85 formula line up with new ones.
  const diags = (diagnosesRes.data ?? []).map((d) => ({ ...d, readiness: readinessOfRow(d) }));
  const plans = planRes.data ?? [];
  const plan = plans[0] ?? null;

  // Drills in one session = drills on the current plan that still resolve.
  const drillsPerSession = plan
    ? ((plan.drill_ids as string[] | null) ?? []).filter((id) =>
        Boolean(findDrillById(id))
      ).length
    : 0;

  let viewData: ProgressViewData;

  if (diags.length === 0) {
    viewData = { kind: "empty" };
  } else if (!retestDone) {
    // ── State 1: before the first re-test. A retake can mean more than one
    // diagnosis here; the latest one is this plan's baseline.
    const timeline =
      plan?.retest_date && plan.created_at
        ? getPlanTimeline(plan.created_at, plan.retest_date)
        : null;

    // Free and paid: one count, one number, one date. The view is handed these
    // and nothing else: never the diagnoses or plans themselves, so no earlier
    // reading, no re-test history and no logged result can reach the browser.
    viewData = {
      kind: "day-one",
      // This plan's sessions only (completed ones: both drills, one sitting).
      sessionsDone: plan ? await getPlanSessions(supabase, plan.id, drillsPerSession) : 0,
      sessionsTotal: PLAN_SESSIONS,
      // The reading this plan was built from: the plan's own diagnosis, and
      // the newest only if the plan has no link. (They differ when a re-test
      // saved its diagnosis and then failed to save its plan.) Free for
      // everyone: it is the number the reveal showed, with no tier check.
      baselineReadiness: (diags.find((d) => d.id === plan?.diagnosis_id) ?? diags[diags.length - 1])
        .readiness,
      retest:
        plan?.retest_date && timeline
          ? {
              dateLabel: monthDay(plan.retest_date),
              daysUntilRetest: timeline.daysUntilRetest,
            }
          : null,
      // A subscriber's weeks with both sessions are live from the start; the
      // chart, history and logged-sessions series need a re-test and are not
      // read here, so nothing sits in the page under the empty states.
      paidStreak: isPaid ? await getWeeklyStreak(supabase, drillsPerSession) : null,
    };
  } else if (!isPaid) {
    // ── State 2: Locked (free). Only what the free tier shows is read and
    // sent: the current number, the change since the first reading, and how
    // many readings exist (the shape of the placeholder). The chart series,
    // re-test history and streak are paid, and a CSS blur over the real data
    // would still hand them to the browser.
    const first = diags[0];
    const last = diags[diags.length - 1];
    viewData = {
      kind: "locked",
      currentReadiness: last.readiness ?? 0,
      totalChange: (last.readiness ?? 0) - (first.readiness ?? 0),
      readingCount: diags.length,
    };
  } else {
    // ── State 3: Full (paid).
    const first = diags[0];
    const last = diags[diags.length - 1];

    // The practice series beneath the readiness line: logged scores for the
    // current bottleneck's drills. Picks the drill with the most scored
    // sessions; renders only with 2+ (pickSessionSeries returns null otherwise).
    const bottleneckDrills = DRILLS[last.bottleneck as SkillId] ?? [];
    // Named as prescribed to this player: a solo version can have its own name.
    const prescribedNames = new Map(
      (plan ? await loadPlanDrills(supabase, plan) : []).map((d) => [d.id, d.name])
    );
    const scoredByDrill = await getScoredSessionsByDrill(
      supabase,
      bottleneckDrills.map((d) => d.id)
    );
    const sessions = pickSessionSeries(
      bottleneckDrills.map((d) => {
        const results = scoredByDrill.get(d.id) ?? [];
        return {
          drillName: prescribedNames.get(d.id) ?? d.name,
          values: results.map((r) => r.resultValue),
          lastAt: results.at(-1)?.completedAt ?? null,
        };
      })
    );

    viewData = {
      kind: "full",
      series: buildReadinessSeries(diags),
      weeksSpan: weeksBetween(first.created_at, last.created_at),
      totalChange: (last.readiness ?? 0) - (first.readiness ?? 0),
      startLabel: shortDate(first.created_at),
      endLabel: shortDate(last.created_at),
      sessions,
      history: buildHistoryRows(diags, plans),
      streak: await getWeeklyStreak(supabase, drillsPerSession),
    };
  }

  // Whether the current plan's re-test is open, in every state, so Progress
  // always offers it on the day it opens.
  const currentTimeline =
    plan?.retest_date && plan.created_at ? getPlanTimeline(plan.created_at, plan.retest_date) : null;
  const latestBottleneck = diags.length > 0 ? (diags[diags.length - 1].bottleneck as SkillId) : null;
  const retestOpenFor =
    currentTimeline && currentTimeline.daysUntilRetest <= 0 && latestBottleneck
      ? SKILL_LABELS[latestBottleneck]
      : null;

  return <ProgressView data={viewData} retestOpenFor={retestOpenFor} />;
}
