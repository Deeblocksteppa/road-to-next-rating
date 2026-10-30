"use client";

import { createClient } from "@/lib/supabase/client";
import { diagnose, scoreSkills } from "@/lib/engine";
import type { AnswerMap, Diagnosis } from "@/lib/types";
import { generateRoadmap, type Roadmap } from "@/lib/roadmap";
import { clearLocalResult, loadLocalResult } from "@/lib/local-result";

/**
 * Anonymous-first persistence. Each row is created with user_id = NULL and an
 * id we generate on the client, so the insert never needs a RETURNING/SELECT
 * policy. We stash those ids in localStorage; at signup they're handed to the
 * `claim_anonymous_records` RPC, which assigns them to the new account.
 *
 * The three rows (assessment, diagnosis, plan) are one result and are only
 * ever claimed together. `saveAnonymousResult` is the one way they are
 * written: a single promise that saves whichever rows are missing, retrying
 * each, and resolves with the complete set or rejects. The save form waits
 * on it before it reads any id, and the device keeps its result until that
 * complete set has been claimed. The funnel used to fire the saves and move
 * on, so a sign-up could claim a diagnosis whose plan had not landed yet,
 * then clear the answers that could have rebuilt it.
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

/** All three rows of one result, saved. */
export interface SavedIds {
  assessment: string;
  diagnosis: string;
  plan: string;
}

/** Waits between attempts at one insert: three attempts in all. */
const RETRY_DELAYS_MS = [600, 1800];

function setId(key: string, id: string) {
  try {
    localStorage.setItem(key, id);
  } catch {
    // Private mode / storage disabled — persistence still worked server-side,
    // we just won't be able to claim this row later.
  }
}

/**
 * Insert one unclaimed row, retrying on failure. The id is fixed before the
 * first attempt, so if an attempt's insert landed but its response was lost,
 * the retry hits a duplicate key: that row is saved, which is success.
 */
async function insertWithRetry(
  table: "assessments" | "diagnoses" | "plans",
  row: Record<string, unknown>
): Promise<void> {
  for (let attempt = 0; ; attempt++) {
    const { error } = await createClient().from(table).insert(row);
    if (!error || error.code === "23505") return;
    if (attempt >= RETRY_DELAYS_MS.length) throw error;
    await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS_MS[attempt]));
  }
}

/** Save the raw assessment answers as an unclaimed row. Returns the new id. */
async function saveAssessment(answers: AnswerMap): Promise<string> {
  const id = crypto.randomUUID();
  await insertWithRetry("assessments", {
    id,
    user_id: null,
    answers,
    band: answers["rating"] ?? null, // free-text self-rating, e.g. "3.5 DUPR"
  });
  setId(STORAGE_KEYS.assessment, id);
  return id;
}

/**
 * Save the engine's diagnosis, linked to its assessment. Returns the new id.
 * `answers` is used to derive the per-skill scores stored in `skill_scores`
 * (the same numbers the re-test delta later compares against).
 */
async function saveDiagnosis(
  assessmentId: string,
  diagnosis: Diagnosis,
  answers: AnswerMap
): Promise<string> {
  const id = crypto.randomUUID();
  await insertWithRetry("diagnoses", {
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
  setId(STORAGE_KEYS.diagnosis, id);
  return id;
}

/** Save the generated roadmap as a plan, linked to its diagnosis. */
async function savePlan(diagnosisId: string, roadmap: Roadmap): Promise<string> {
  const id = crypto.randomUUID();
  const retest = new Date(
    Date.now() + roadmap.weeksTarget * 7 * 24 * 60 * 60 * 1000
  );
  await insertWithRetry("plans", {
    id,
    diagnosis_id: diagnosisId,
    user_id: null,
    drill_ids: roadmap.weeklyDrills.map((d) => d.id),
    in_game_rule: roadmap.inGameRule,
    retest_metric: roadmap.retestMetric,
    retest_date: retest.toISOString().slice(0, 10), // YYYY-MM-DD (date column)
    status: "active",
  });
  setId(STORAGE_KEYS.plan, id);
  return id;
}

/**
 * Save whichever rows of this result are not saved yet, in order. A stored
 * id is reused only when every row before it is stored too, so the set
 * always hangs together (a diagnosis under its own assessment, a plan under
 * its own diagnosis).
 */
async function saveMissing(
  answers: AnswerMap,
  diagnosis: Diagnosis,
  roadmap: Roadmap
): Promise<SavedIds> {
  const ids = getPendingIds();
  const assessment = ids.assessment ?? (await saveAssessment(answers));
  const diagnosisId =
    (ids.assessment && ids.diagnosis) || (await saveDiagnosis(assessment, diagnosis, answers));
  const plan =
    (ids.assessment && ids.diagnosis && ids.plan) || (await savePlan(diagnosisId, roadmap));
  return { assessment, diagnosis: diagnosisId, plan };
}

/** The save in flight (or done) for one set of answers. */
let current: { key: string; promise: Promise<SavedIds> } | null = null;

/**
 * The one save of the anonymous result. Every caller with the same answers
 * shares the same promise: the funnel starts it when the assessment ends, and
 * "Start session", "Save my plan" and the save form wait on it. A failed
 * save is dropped, so the next call tries again from the first missing row.
 */
export function saveAnonymousResult(
  answers: AnswerMap,
  diagnosis: Diagnosis,
  roadmap: Roadmap
): Promise<SavedIds> {
  const key = JSON.stringify(answers);
  if (current?.key === key) return current.promise;

  const promise = saveMissing(answers, diagnosis, roadmap);
  current = { key, promise };
  promise.catch(() => {
    if (current?.promise === promise) current = null;
  });
  return promise;
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
  current = null;
  try {
    localStorage.removeItem(STORAGE_KEYS.assessment);
    localStorage.removeItem(STORAGE_KEYS.diagnosis);
    localStorage.removeItem(STORAGE_KEYS.plan);
  } catch {
    // ignore
  }
}

async function claimIds(ids: PendingIds): Promise<void> {
  const { error } = await createClient().rpc("claim_anonymous_records", {
    p_assessment_id: ids.assessment,
    p_diagnosis_id: ids.diagnosis,
    p_plan_id: ids.plan,
  });
  if (error) throw error;
}

/**
 * Claim a complete saved set for the signed-in player, then clear the device
 * copy: the plan lives in the account now, and leaving it would make /start
 * keep saying "saved only on this device" about a plan that isn't. On any
 * failure nothing is cleared, so the next claim can try again.
 */
export async function claimAnonymousResult(ids: SavedIds): Promise<void> {
  await claimIds(ids);
  clearPendingIds();
  clearLocalResult();
}

/**
 * Make sure the result on this device ends up in the signed-in player's
 * account: save whatever rows are missing, then claim all three. The player
 * is not asked to take the assessment again.
 */
export async function attachLocalResult(
  answers: AnswerMap,
  diagnosis: Diagnosis,
  roadmap: Roadmap
): Promise<void> {
  await claimAnonymousResult(await saveAnonymousResult(answers, diagnosis, roadmap));
}

/**
 * Claim this device's result for the currently signed-in player (on /home,
 * after an email-confirmation or OAuth round trip). With the answers still
 * here, the complete set is saved and claimed. Without them (ids left by an
 * older build), the ids are claimed as they are, since nothing is left to
 * rebuild a missing row from. Returns true if a claim was made.
 */
export async function claimDeviceResult(): Promise<boolean> {
  const stored = loadLocalResult();
  if (stored) {
    const diagnosis = diagnose(stored.answers);
    await attachLocalResult(stored.answers, diagnosis, generateRoadmap(diagnosis, stored.answers));
    return true;
  }

  const ids = getPendingIds();
  if (!ids.assessment && !ids.diagnosis && !ids.plan) return false;
  await claimIds(ids);
  clearPendingIds();
  return true;
}
