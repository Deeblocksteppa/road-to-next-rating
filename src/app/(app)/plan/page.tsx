import Link from "next/link";
import { redirect } from "next/navigation";

import { PlanView } from "@/components/plan/PlanView";
import { RetestOpen } from "@/components/retest/RetestOpen";
import { DrillPageReadOnly } from "@/components/session/DrillPage";
import { monthDay } from "@/lib/date-format";
import { skillForDrills, toGuidedDrill } from "@/lib/drill-lookup";
import { getTodayLog, getWeeklyProgress, loggedThisUtcDay } from "@/lib/drill-sessions";
import { loadPlanDrills } from "@/lib/plan-drills";
import { getPlanTimeline } from "@/lib/plan-timeline";
import { inGameRuleFor, retestGoalFor } from "@/lib/roadmap";
import { PLAN_WEEKS } from "@/lib/session-plan";
import { createClient } from "@/lib/supabase/server";
import type { AnswerMap, SkillId } from "@/lib/types";
import { weekContext } from "@/lib/week-status";

/**
 * The Plan tab: the current plan (`PlanView`), or, with `?drill=<id>`, that
 * drill's page, read-only. A drill row is a link to the same route with the
 * param, so the phone's back gesture returns to the plan.
 */
export default async function PlanPage({
  searchParams,
}: {
  searchParams: { drill?: string };
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login?next=/plan");
  }

  const { data: plan } = await supabase
    .from("plans")
    .select("id, drill_ids, diagnosis_id, retest_date, status, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // As prescribed: the solo version for a player without a partner.
  const planDrills = plan ? await loadPlanDrills(supabase, plan) : [];

  // A drill row was tapped: that drill's page, with nothing to press. Sessions
  // start from the plan's button and from Home.
  const openIndex = searchParams.drill ? planDrills.findIndex((d) => d.id === searchParams.drill) : -1;
  if (plan && openIndex >= 0) {
    return (
      <main className="flex flex-col px-6 py-8">
        <DrillPageReadOnly
          drill={toGuidedDrill(planDrills[openIndex])}
          position={openIndex + 1}
          total={planDrills.length}
          backHref="/plan"
        />
      </main>
    );
  }

  // The title and the two sentences under the drills are about the skill
  // these drills train, so the skill is read from the plan's own drills: it
  // can't disagree with them, and a plan whose diagnosis can't be read still
  // shows. The newest diagnosis is not it: that can be for a different plan.
  const bottleneck: SkillId | null = skillForDrills(planDrills.map((d) => d.id));

  const [todayLog, weekly] = plan
    ? await Promise.all([
        getTodayLog(supabase, plan.id),
        getWeeklyProgress(supabase, plan.id, planDrills.length),
      ])
    : [[], { completed: 0, total: 0 }];

  const timeline =
    plan && plan.retest_date ? getPlanTimeline(plan.created_at, plan.retest_date) : null;
  const retestOpen = timeline !== null && timeline.daysUntilRetest <= 0;

  // The re-test goal for the third-shot drop is set from where the player
  // started, so it needs the answers behind the diagnosis.
  let answers: AnswerMap | null = null;
  const { data: diagnosis } = plan?.diagnosis_id
    ? await supabase
        .from("diagnoses")
        .select("assessment_id")
        .eq("id", plan.diagnosis_id)
        .eq("user_id", user.id)
        .maybeSingle()
    : { data: null };
  if (diagnosis?.assessment_id) {
    const { data: assessment } = await supabase
      .from("assessments")
      .select("answers")
      .eq("id", diagnosis.assessment_id)
      .maybeSingle();
    if (assessment?.answers && typeof assessment.answers === "object") {
      answers = assessment.answers as AnswerMap;
    }
  }

  return (
    <main className="flex flex-col gap-8 px-6 py-8">
      {/* Open re-test: said first, on every tab, whatever today holds. It
          holds the screen's accent; Start session goes secondary. */}
      {retestOpen && (
        <div className="pt-4">
          <RetestOpen variant="banner" />
        </div>
      )}

      {plan && bottleneck ? (
        <div className={retestOpen ? "" : "pt-4"}>
          <PlanView
            skill={bottleneck}
            drills={planDrills}
            drillBase="/plan"
            // Rendered from code, not read from the plan row, so every plan
            // shows today's wording (the row keeps what was written when the
            // plan was made).
            inGameRule={inGameRuleFor(bottleneck)}
            retestGoal={retestGoalFor(bottleneck, answers)}
            retestWhen={
              retestOpen
                ? "Open now"
                : plan.retest_date
                  ? monthDay(new Date(plan.retest_date))
                  : "Not scheduled"
            }
            weeksTarget={timeline?.weeksTarget ?? PLAN_WEEKS}
            context={{
              kind: "member",
              todayLog,
              weekly,
              week: weekContext(plan.retest_date),
              loggedToday: loggedThisUtcDay(todayLog),
            }}
          />
        </div>
      ) : (
        <p className="mt-4 border-y border-line py-5 text-[16px] leading-[1.6] text-ink-2">
          No plan yet.{" "}
          <Link href="/start" className="text-ink underline underline-offset-4">
            Take the assessment
          </Link>
          .
        </p>
      )}
    </main>
  );
}
