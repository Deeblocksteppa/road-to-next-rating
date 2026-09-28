"use server";

import { revalidatePath } from "next/cache";

import { diagnose, scoreSkills } from "@/lib/engine";
import { generateRoadmap } from "@/lib/roadmap";
import { createClient } from "@/lib/supabase/server";
import type { AnswerMap } from "@/lib/types";

/**
 * Re-test flow for a logged-in user. Runs the new answers through the same
 * engine, saves a new assessment + diagnosis owned by the user, retires the old
 * active plan and creates a fresh one for the new bottleneck, and returns the
 * new diagnosis's id.
 *
 * It returns nothing else on purpose. The result screen lives at
 * `/retest/[id]` and is built on the server from the stored rows
 * (`loadRetestView`), which is where the free/paid decision is made. This
 * action used to return the full per-skill delta to every tier and leave the
 * client to blur it, so a free player's browser held the paid breakdown, and
 * the result existed only in that tab: nothing could show it again, including
 * after the player paid to see it.
 */
export async function submitRetest(answers: AnswerMap): Promise<{ diagnosisId: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // 1. Run the engine on the new answers.
  const newDiagnosis = diagnose(answers);
  const newScores = scoreSkills(answers);

  // 2. Save the new assessment + diagnosis, owned by the user from the start.
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

  // 3. Retire the old active plan(s), then create the new active plan targeting
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

  revalidatePath("/home");
  revalidatePath("/plan");
  revalidatePath("/progress");

  return { diagnosisId };
}
