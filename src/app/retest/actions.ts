"use server";

import { revalidatePath } from "next/cache";

import { computeDiagnosisDelta, type DiagnosisDelta } from "@/lib/delta";
import { SKILL_LABELS } from "@/lib/diagnoses";
import { diagnose, scoreSkills } from "@/lib/engine";
import { generateRoadmap } from "@/lib/roadmap";
import { createClient } from "@/lib/supabase/server";
import type { AnswerMap, SkillId } from "@/lib/types";

export interface RetestResult {
  delta: DiagnosisDelta;
  previousBottleneck: SkillId;
  previousBottleneckLabel: string;
  newBottleneck: SkillId;
  newBottleneckLabel: string;
  /** False if the user had no prior diagnosis (delta is then vs. a zero baseline). */
  hadPrevious: boolean;
  /** Drives the Delta screen's paid/free branch (defaults to free if the row is missing). */
  isPaid: boolean;
}

/**
 * Re-test flow for a logged-in user. Runs the new answers through the same
 * engine, saves a new assessment + diagnosis owned by the user, retires the old
 * active plan and creates a fresh one for the new bottleneck, and returns the
 * delta vs. their most recent previous diagnosis.
 */
export async function submitRetest(answers: AnswerMap): Promise<RetestResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // 1. Capture the most recent PREVIOUS diagnosis before inserting the new one.
  const { data: prevDiag } = await supabase
    .from("diagnoses")
    .select("bottleneck, readiness, assessment_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let previousScores: ReturnType<typeof scoreSkills> = [];
  let previousReadiness = 0;
  let previousBottleneck: SkillId | null = null;

  if (prevDiag) {
    previousReadiness = prevDiag.readiness ?? 0;
    previousBottleneck = prevDiag.bottleneck as SkillId;

    // Recompute the previous skill scores from that assessment's answers — the
    // canonical, format-independent source (works regardless of what shape the
    // older skill_scores column happens to hold).
    if (prevDiag.assessment_id) {
      const { data: prevAssessment } = await supabase
        .from("assessments")
        .select("answers")
        .eq("id", prevDiag.assessment_id)
        .maybeSingle();
      if (prevAssessment?.answers) {
        previousScores = scoreSkills(prevAssessment.answers as AnswerMap);
      }
    }
  }

  // 2. Run the engine on the new answers.
  const newDiagnosis = diagnose(answers);
  const newScores = scoreSkills(answers);

  // 3. Save the new assessment + diagnosis, owned by the user from the start.
  const assessmentId = crypto.randomUUID();
  const { error: assessmentError } = await supabase.from("assessments").insert({
    id: assessmentId,
    user_id: user.id,
    answers,
    band: answers["rating"] ?? null,
  });
  if (assessmentError) throw assessmentError;

  const diagnosisId = crypto.randomUUID();
  const { error: diagnosisError } = await supabase.from("diagnoses").insert({
    id: diagnosisId,
    assessment_id: assessmentId,
    user_id: user.id,
    bottleneck: newDiagnosis.bottleneck,
    runners_up: newDiagnosis.runnersUp,
    root_cause: newDiagnosis.rootCause,
    story_id: newDiagnosis.storyId,
    readiness: newDiagnosis.readiness,
    skill_scores: newScores,
  });
  if (diagnosisError) throw diagnosisError;

  // 4. Retire the old active plan(s), then create the new active plan targeting
  // the new bottleneck.
  const { error: retireError } = await supabase
    .from("plans")
    .update({ status: "completed" })
    .eq("user_id", user.id)
    .eq("status", "active");
  if (retireError) throw retireError;

  const roadmap = generateRoadmap(newDiagnosis, answers);
  const retest = new Date(
    Date.now() + roadmap.weeksTarget * 7 * 24 * 60 * 60 * 1000
  );
  const { error: planError } = await supabase.from("plans").insert({
    id: crypto.randomUUID(),
    diagnosis_id: diagnosisId,
    user_id: user.id,
    drill_ids: roadmap.weeklyDrills.map((d) => d.id),
    in_game_rule: roadmap.inGameRule,
    retest_metric: roadmap.retestMetric,
    retest_date: retest.toISOString().slice(0, 10),
    status: "active",
  });
  if (planError) throw planError;

  // 5. Compute the delta (previous vs. new).
  const delta = computeDiagnosisDelta(
    { readiness: previousReadiness, skillScores: previousScores },
    { readiness: newDiagnosis.readiness, skillScores: newScores }
  );

  // 6. Subscription tier — determines which Delta screen variant renders.
  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_status")
    .eq("id", user.id)
    .maybeSingle();

  revalidatePath("/home");
  revalidatePath("/plan");
  revalidatePath("/progress");

  const effectivePreviousBottleneck = previousBottleneck ?? newDiagnosis.bottleneck;

  return {
    delta,
    previousBottleneck: effectivePreviousBottleneck,
    previousBottleneckLabel: SKILL_LABELS[effectivePreviousBottleneck],
    newBottleneck: newDiagnosis.bottleneck,
    newBottleneckLabel: SKILL_LABELS[newDiagnosis.bottleneck],
    hadPrevious: Boolean(prevDiag),
    isPaid: profile?.subscription_status === "active",
  };
}
