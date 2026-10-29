import Link from "next/link";
import { redirect } from "next/navigation";

import { PlanView } from "@/components/plan/PlanView";
import { RetestOpen } from "@/components/retest/RetestOpen";
import { monthDay } from "@/lib/date-format";
import { getTodayLog, getWeeklyProgress } from "@/lib/drill-sessions";
import { loadPlanDrills } from "@/lib/plan-drills";
import { getPlanTimeline } from "@/lib/plan-timeline";
import { readinessOfRow } from "@/lib/readiness";
import { retestStart } from "@/lib/result-copy";
import { createClient } from "@/lib/supabase/server";
import type { AnswerMap, SkillId } from "@/lib/types";

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
    .select("bottleneck, readiness, skill_scores, assessment_id")
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
  const retestOpen = timeline !== null && timeline.daysUntilRetest <= 0;

  // The start line under the re-test goal quotes the player's own answer, as
  // the anonymous plan did before sign-up, so the two screens match.
  let answers: AnswerMap | null = null;
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
          holds the screen's accent; every drill's Start goes secondary. */}
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
            inGameRule={plan.in_game_rule}
            retestMetric={plan.retest_metric}
            retestStart={answers ? retestStart(bottleneck, answers) : null}
            retestWhen={
              retestOpen
                ? "Open now"
                : plan.retest_date
                  ? monthDay(new Date(plan.retest_date))
                  : ""
            }
            readiness={diagnosis ? readinessOfRow(diagnosis) : null}
            weeksTarget={timeline?.weeksTarget ?? 3}
            context={{
              kind: "member",
              weekNumber: timeline?.weekNumber ?? null,
              todayLog,
              weekly,
              retestOpen,
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
