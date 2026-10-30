import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";

import { diagnose, scoreSkills } from "@/lib/engine";
import { openRetestPlan } from "@/lib/retest-gate";
import { generateRoadmap } from "@/lib/roadmap";
import type { AnswerMap } from "@/lib/types";

/**
 * The column (`supabase/migrations/20261029120000_retest_source_plan.sql`)
 * isn't on this database yet. PostgREST answers PGRST204 for a column missing
 * from its schema cache; Postgres itself, 42703.
 */
function isMissingColumn(error: PostgrestError): boolean {
  return error.code === "PGRST204" || error.code === "42703";
}

/**
 * Save a re-test for `userId`: a new assessment and diagnosis owned by the
 * player, a fresh active plan for the new bottleneck, and the old active
 * plan(s) retired. Returns the new diagnosis's id. `submitRetest` is the
 * only caller; it lives here so it takes any client.
 *
 * One re-test per plan. The new plan records the plan the re-test was taken
 * against (`source_plan_id`, unique), and that insert is what makes the
 * result count: a result is only complete once its plan exists. A second
 * submit for the same plan (a double tap, two tabs) loses on that index,
 * deletes its own assessment (its diagnosis goes with it, by cascade) and
 * returns the first submit's result. A submit that failed before its plan
 * landed claimed nothing, so trying again works.
 *
 * Until the migration runs, the plan is saved without `source_plan_id` and
 * there is no guard beyond the disabled button.
 */
export async function saveRetest(
  supabase: SupabaseClient,
  userId: string,
  answers: AnswerMap
): Promise<{ diagnosisId: string }> {
  // 0. The re-test opens on the plan's retest_date, never before, and never
  // without one. The /retest page redirects on the same check; this is the
  // one that holds when the action is called directly.
  const source = await openRetestPlan(supabase, userId);
  if (!source) {
    throw new Error("Your re-test isn't open yet.");
  }
  const sourcePlanId = source.id;

  // 1. Run the engine on the new answers.
  const newDiagnosis = diagnose(answers);
  const newScores = scoreSkills(answers);

  // 2. Save the new assessment + diagnosis, owned by the user from the start.
  const assessmentId = crypto.randomUUID();
  const { error: assessmentError } = await supabase.from("assessments").insert({
    id: assessmentId,
    user_id: userId,
    answers,
    band: answers["rating"] ?? null,
  });
  if (assessmentError) throw assessmentError;

  const diagnosisId = crypto.randomUUID();
  const { error: diagnosisError } = await supabase.from("diagnoses").insert({
    id: diagnosisId,
    assessment_id: assessmentId,
    user_id: userId,
    bottleneck: newDiagnosis.bottleneck,
    runners_up: newDiagnosis.runnersUp,
    root_cause: newDiagnosis.rootCause,
    story_id: newDiagnosis.storyId,
    readiness: newDiagnosis.readiness,
    skill_scores: newScores,
  });
  if (diagnosisError) throw diagnosisError;

  // 3. Create the new active plan targeting the new bottleneck. This is the
  // claim on the source plan.
  const roadmap = generateRoadmap(newDiagnosis, answers);
  const retest = new Date(
    Date.now() + roadmap.weeksTarget * 7 * 24 * 60 * 60 * 1000
  );
  const planId = crypto.randomUUID();
  const planRow = {
    id: planId,
    diagnosis_id: diagnosisId,
    user_id: userId,
    drill_ids: roadmap.weeklyDrills.map((d) => d.id),
    in_game_rule: roadmap.inGameRule,
    retest_metric: roadmap.retestMetric,
    retest_date: retest.toISOString().slice(0, 10),
    status: "active",
  };
  let { error: planError } = await supabase
    .from("plans")
    .insert({ ...planRow, source_plan_id: sourcePlanId });
  if (planError && isMissingColumn(planError)) {
    ({ error: planError } = await supabase.from("plans").insert(planRow));
  }

  let resultDiagnosisId = diagnosisId;
  if (planError?.code === "23505") {
    // Another submit for this plan got there first. Its result stands.
    const { data: winner, error: winnerError } = await supabase
      .from("plans")
      .select("id, diagnosis_id")
      .eq("user_id", userId)
      .eq("source_plan_id", sourcePlanId)
      .maybeSingle();
    if (winnerError) throw winnerError;
    if (!winner?.diagnosis_id) throw planError;

    const { error: cleanupError } = await supabase
      .from("assessments")
      .delete()
      .eq("id", assessmentId)
      .eq("user_id", userId);
    if (cleanupError) console.error("saveRetest: could not remove the duplicate", cleanupError.code);

    resultDiagnosisId = winner.diagnosis_id as string;
  } else if (planError) {
    throw planError;
  }

  // 4. Retire the old active plan(s): the source and anything older, never a
  // plan made by this re-test or a concurrent one (before the migration two
  // can exist, and each would otherwise retire the other). The result is
  // saved by now, so a failure here is logged, not thrown: an old plan left
  // active is retired by the next re-test.
  const { error: retireError } = await supabase
    .from("plans")
    .update({ status: "completed" })
    .eq("user_id", userId)
    .eq("status", "active")
    .lte("created_at", source.created_at);
  if (retireError) console.error("saveRetest: could not retire old plans", retireError.code);

  return { diagnosisId: resultDiagnosisId };
}
