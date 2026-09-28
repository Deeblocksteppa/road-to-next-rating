import type { SupabaseClient } from "@supabase/supabase-js";

import { computeDiagnosisDelta, parseStoredSkillScores } from "@/lib/delta";
import { scoreSkills } from "@/lib/engine";
import { monthDay } from "@/lib/progress";
import { directionOf, type Direction, type RetestView } from "@/lib/retest-view";
import type { AnswerMap, SkillId, SkillScore } from "@/lib/types";

interface DiagnosisRecord {
  id: string;
  readiness: number | null;
  bottleneck: string;
  assessment_id: string | null;
  skill_scores: unknown;
  created_at: string;
}

/**
 * A diagnosis's per-skill levels, resolved in order:
 *   1. its assessment's answers, re-scored — canonical, and independent of
 *      whatever shape the stored column holds;
 *   2. its stored `skill_scores`, if they validate as a complete set;
 *   3. nothing.
 *
 * A diagnosis with no recoverable levels is not a comparable baseline, and
 * the screen shows it as a reading rather than as a delta against assumed
 * zeros (the bug that once showed "+2" on skills nobody had moved).
 */
async function resolveSkillScores(
  supabase: SupabaseClient,
  diagnosis: DiagnosisRecord
): Promise<SkillScore[] | null> {
  if (diagnosis.assessment_id) {
    const { data: assessment } = await supabase
      .from("assessments")
      .select("answers")
      .eq("id", diagnosis.assessment_id)
      .maybeSingle();
    if (assessment?.answers && typeof assessment.answers === "object") {
      return scoreSkills(assessment.answers as AnswerMap);
    }
  }
  return parseStoredSkillScores(diagnosis.skill_scores);
}

async function isPaidUser(supabase: SupabaseClient, userId: string): Promise<boolean> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_status")
    .eq("id", userId)
    .maybeSingle();
  return profile?.subscription_status === "active";
}

/**
 * Any of the player's re-tests, compared with the reading before it.
 *
 * Every re-test is already stored as a `diagnoses` row, and the rows carry
 * enough to rebuild the comparison, so the result screen can be reopened at
 * any time — nothing about it lives only in the browser tab that took the
 * re-test. Returns `null` when the diagnosis isn't the signed-in player's.
 *
 * The tier decision is made here, on the server: a free viewer gets the
 * readiness comparison (free for everyone) and `skills: null`.
 */
export async function loadRetestView(
  supabase: SupabaseClient,
  userId: string,
  diagnosisId: string
): Promise<RetestView | null> {
  const { data } = await supabase
    .from("diagnoses")
    .select("id, readiness, bottleneck, assessment_id, skill_scores, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  const diagnoses = (data ?? []) as DiagnosisRecord[];
  const index = diagnoses.findIndex((d) => d.id === diagnosisId);
  if (index === -1) return null;

  const current = diagnoses[index];
  const previous = index > 0 ? diagnoses[index - 1] : null;
  const isPaid = await isPaidUser(supabase, userId);

  let comparison: RetestView["comparison"] = null;
  let skills: RetestView["skills"] = null;

  if (previous && typeof previous.readiness === "number" && typeof current.readiness === "number") {
    const [previousScores, currentScores] = await Promise.all([
      resolveSkillScores(supabase, previous),
      resolveSkillScores(supabase, current),
    ]);
    const delta =
      previousScores && currentScores
        ? computeDiagnosisDelta(
            { readiness: previous.readiness, skillScores: previousScores },
            { readiness: current.readiness, skillScores: currentScores }
          )
        : null;

    if (delta) {
      comparison = {
        previous: delta.readiness.previous,
        current: delta.readiness.current,
        change: delta.readiness.delta,
        direction: directionOf(delta.readiness.delta),
      };
      // Withheld, not hidden: the free screen renders a placeholder.
      if (isPaid) skills = delta.skills;
    }
  }

  return {
    diagnosisId: current.id,
    readiness: current.readiness ?? 0,
    takenOn: monthDay(current.created_at),
    isLatest: index === diagnoses.length - 1,
    comparison,
    skills,
    previousBottleneck: (previous?.bottleneck ?? current.bottleneck) as SkillId,
    newBottleneck: current.bottleneck as SkillId,
    isPaid,
  };
}

/**
 * Which way a re-test's readiness went — the paywall's copy follows it, so a
 * player whose score just fell is never told they're improving. Uses the
 * given diagnosis when there is one, else the most recent. `null` when the
 * player has no re-test yet (one reading, nothing to compare).
 */
export async function loadRetestDirection(
  supabase: SupabaseClient,
  userId: string,
  diagnosisId?: string | null
): Promise<{ direction: Direction; change: number } | null> {
  const { data } = await supabase
    .from("diagnoses")
    .select("id, readiness")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  const rows = data ?? [];
  const index = diagnosisId ? rows.findIndex((d) => d.id === diagnosisId) : rows.length - 1;
  if (index < 1) return null;

  const current = rows[index].readiness;
  const previous = rows[index - 1].readiness;
  if (typeof current !== "number" || typeof previous !== "number") return null;

  const change = current - previous;
  return { direction: directionOf(change), change };
}
