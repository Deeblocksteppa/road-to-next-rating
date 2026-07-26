"use client";

import { createClient } from "@/lib/supabase/client";
import { scoreSkills } from "@/lib/engine";
import type { AnswerMap, Diagnosis } from "@/lib/types";
import type { Roadmap } from "@/lib/roadmap";

/**
 * Anonymous-first persistence. Each row is created with user_id = NULL and an
 * id we generate on the client, so the insert never needs a RETURNING/SELECT
 * policy. We stash those ids in localStorage; at signup they're handed to the
 * `claim_anonymous_records` RPC, which assigns them to the new account.
 */

const STORAGE_KEYS = {
  assessment: "rtnr:assessment_id",
  diagnosis: "rtnr:diagnosis_id",
  plan: "rtnr:plan_id",
} as const;

export interface PendingIds {
  assessment: string | null;
  diagnosis: string | null;
  plan: string | null;
}

function setId(key: string, id: string) {
  try {
    localStorage.setItem(key, id);
  } catch {
    // Private mode / storage disabled — persistence still worked server-side,
    // we just won't be able to claim this row later.
  }
}

/** Save the raw assessment answers as an unclaimed row. Returns the new id. */
export async function saveAssessment(answers: AnswerMap): Promise<string> {
  const supabase = createClient();
  const id = crypto.randomUUID();

  const { error } = await supabase.from("assessments").insert({
    id,
    user_id: null,
    answers,
    band: answers["rating"] ?? null, // free-text self-rating, e.g. "3.5 DUPR"
  });
  if (error) throw error;

  setId(STORAGE_KEYS.assessment, id);
  return id;
}

/**
 * Save the engine's diagnosis, linked to its assessment. Returns the new id.
 * `answers` is used to derive the per-skill scores stored in `skill_scores`
 * (the same numbers the re-test delta later compares against).
 */
export async function saveDiagnosis(
  assessmentId: string,
  diagnosis: Diagnosis,
  answers: AnswerMap
): Promise<string> {
  const supabase = createClient();
  const id = crypto.randomUUID();

  const { error } = await supabase.from("diagnoses").insert({
    id,
    assessment_id: assessmentId,
    user_id: null,
    bottleneck: diagnosis.bottleneck,
    runners_up: diagnosis.runnersUp,
    root_cause: diagnosis.rootCause,
    story_id: diagnosis.storyId,
    readiness: diagnosis.readiness,
    // Per-skill scores (level/importance/gap) — the source the re-test delta
    // compares against. Narrative fields are re-derivable from the answers.
    skill_scores: scoreSkills(answers),
  });
  if (error) throw error;

  setId(STORAGE_KEYS.diagnosis, id);
  return id;
}

/** Save the generated roadmap as a plan, linked to its diagnosis. */
export async function savePlan(
  diagnosisId: string,
  roadmap: Roadmap
): Promise<string> {
  const supabase = createClient();
  const id = crypto.randomUUID();

  const retest = new Date(
    Date.now() + roadmap.weeksTarget * 7 * 24 * 60 * 60 * 1000
  );

  const { error } = await supabase.from("plans").insert({
    id,
    diagnosis_id: diagnosisId,
    user_id: null,
    drill_ids: roadmap.weeklyDrills.map((d) => d.id),
    in_game_rule: roadmap.inGameRule,
    retest_metric: roadmap.retestMetric,
    retest_date: retest.toISOString().slice(0, 10), // YYYY-MM-DD (date column)
    status: "active",
  });
  if (error) throw error;

  setId(STORAGE_KEYS.plan, id);
  return id;
}

export function getPendingIds(): PendingIds {
  if (typeof window === "undefined") {
    return { assessment: null, diagnosis: null, plan: null };
  }
  return {
    assessment: localStorage.getItem(STORAGE_KEYS.assessment),
    diagnosis: localStorage.getItem(STORAGE_KEYS.diagnosis),
    plan: localStorage.getItem(STORAGE_KEYS.plan),
  };
}

export function clearPendingIds() {
  try {
    localStorage.removeItem(STORAGE_KEYS.assessment);
    localStorage.removeItem(STORAGE_KEYS.diagnosis);
    localStorage.removeItem(STORAGE_KEYS.plan);
  } catch {
    // ignore
  }
}

/**
 * Claim any pending anonymous rows for the currently signed-in user. Safe to
 * call whenever a session exists (Save Gate, or on /home after an
 * OAuth / email-confirmation round trip). No-op when nothing is pending.
 * Returns true if a claim was attempted.
 */
export async function claimPendingRecords(): Promise<boolean> {
  const ids = getPendingIds();
  if (!ids.assessment && !ids.diagnosis && !ids.plan) return false;

  const supabase = createClient();
  const { error } = await supabase.rpc("claim_anonymous_records", {
    p_assessment_id: ids.assessment,
    p_diagnosis_id: ids.diagnosis,
    p_plan_id: ids.plan,
  });
  if (error) throw error;

  clearPendingIds();
  return true;
}
