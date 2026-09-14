"use server";

import { revalidatePath } from "next/cache";

import {
  computeDiagnosisDelta,
  parseStoredSkillScores,
  type DiagnosisDelta,
} from "@/lib/delta";
import { SKILL_LABELS } from "@/lib/diagnoses";
import { diagnose, scoreSkills } from "@/lib/engine";
import { generateRoadmap } from "@/lib/roadmap";
import { createClient } from "@/lib/supabase/server";
import type { AnswerMap, SkillId, SkillScore } from "@/lib/types";

export interface RetestResult {
  /** The new diagnosis's readiness — always present, delta or not. */
  readiness: number;
  /**
   * Movement since the previous diagnosis, or `null` when there is no
   * comparable baseline: no previous diagnosis, or one whose per-skill scores
   * cannot be recovered from either its assessment answers or its stored
   * `skill_scores`. A null delta renders as a baseline reading, never as a
   * delta against assumed zeros.
   */
  delta: DiagnosisDelta | null;
  previousBottleneck: SkillId;
  previousBottleneckLabel: string;
  newBottleneck: SkillId;
  newBottleneckLabel: string;
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
    .select("bottleneck, readiness, assessment_id, skill_scores")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  /*
   * The baseline the delta is measured against, resolved in order:
   *   1. the previous assessment's answers, re-scored — canonical, and
   *      independent of whatever shape the stored column holds;
   *   2. the previous diagnosis's stored `skill_scores`, if it validates as a
   *      complete set of levels;
   *   3. nothing — `previousScores` stays null and no delta is computed.
   *
   * It used to fall through to an empty array, which `computeDiagnosisDelta`
   * read as level 0 on every skill, so a player whose earlier assessment row
   * was missing saw "+2" on each skill they had not moved at all. A missing
   * baseline is now shown as a baseline, never as a fabricated delta — and
   * that includes the readiness number: a stored readiness with no recoverable
   * skill levels is not a comparable baseline for this screen.
   */
  let previousScores: SkillScore[] | null = null;
  let previousReadiness: number | null = null;
  let previousBottleneck: SkillId | null = null;

  if (prevDiag) {
    previousBottleneck = prevDiag.bottleneck as SkillId;

    if (prevDiag.assessment_id) {
      const { data: prevAssessment } = await supabase
        .from("assessments")
        .select("answers")
        .eq("id", prevDiag.assessment_id)
        .maybeSingle();
      if (prevAssessment?.answers && typeof prevAssessment.answers === "object") {
        previousScores = scoreSkills(prevAssessment.answers as AnswerMap);
      }
    }

    if (!previousScores) {
      previousScores = parseStoredSkillScores(prevDiag.skill_scores);
    }

    if (previousScores && typeof prevDiag.readiness === "number") {
      previousReadiness = prevDiag.readiness;
    } else {
      previousScores = null;
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

  // 5. Compute the delta (previous vs. new) — only against a real baseline.
  const delta =
    previousScores && previousReadiness !== null
      ? computeDiagnosisDelta(
          { readiness: previousReadiness, skillScores: previousScores },
          { readiness: newDiagnosis.readiness, skillScores: newScores }
        )
      : null;

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
    readiness: newDiagnosis.readiness,
    delta,
    previousBottleneck: effectivePreviousBottleneck,
    previousBottleneckLabel: SKILL_LABELS[effectivePreviousBottleneck],
    newBottleneck: newDiagnosis.bottleneck,
    newBottleneckLabel: SKILL_LABELS[newDiagnosis.bottleneck],
    isPaid: profile?.subscription_status === "active",
  };
}
