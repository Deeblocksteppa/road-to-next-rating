import type { SupabaseClient } from "@supabase/supabase-js";

import { computeDiagnosisDelta, parseStoredSkillScores } from "@/lib/delta";
import { scoreSkills } from "@/lib/engine";
import { monthDay } from "@/lib/progress";
import { QUESTIONS } from "@/lib/questions";
import { readinessFromScores, readinessOfRow } from "@/lib/readiness";
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
 * A diagnosis's answers and per-skill levels. Levels resolve in order:
 *   1. its assessment's answers, re-scored — canonical, and independent of
 *      whatever shape the stored column holds;
 *   2. its stored `skill_scores`, if they validate as a complete set;
 *   3. nothing.
 *
 * A diagnosis with no recoverable levels is not a comparable baseline, and
 * the screen shows it as a reading rather than as a delta against assumed
 * zeros (the bug that once showed "+2" on skills nobody had moved).
 */
async function resolveReading(
  supabase: SupabaseClient,
  diagnosis: DiagnosisRecord
): Promise<{ answers: AnswerMap | null; scores: SkillScore[] | null }> {
  if (diagnosis.assessment_id) {
    const { data: assessment } = await supabase
      .from("assessments")
      .select("answers")
      .eq("id", diagnosis.assessment_id)
      .maybeSingle();
    if (assessment?.answers && typeof assessment.answers === "object") {
      const answers = assessment.answers as AnswerMap;
      return { answers, scores: scoreSkills(answers) };
    }
  }
  return { answers: null, scores: parseStoredSkillScores(diagnosis.skill_scores) };
}

/**
 * The skill the last plan trained, before and after, in the player's own
 * answers ("1–3" → "4–6"). Free for every tier: it answers the one question
 * a player brings to a re-test, whether the thing they practised moved.
 *
 * The reset is asked about twice; the question quoted is the one that was
 * weaker at the baseline (the mid-court one on a tie), and the same question
 * is quoted after, so the two sides always compare like with like. Labels are
 * cut at their dash: "1–3 — most sit up…" reads "1–3".
 */
function trainedSkill(
  skill: SkillId,
  before: AnswerMap,
  after: AnswerMap,
  change: number
): RetestView["trained"] {
  const questions = QUESTIONS.filter((q) => q.measures === skill);
  const option = (answers: AnswerMap, id: string) =>
    QUESTIONS.find((q) => q.id === id)?.options?.find((o) => o.id === answers[id]);
  const level = (answers: AnswerMap, id: string) => option(answers, id)?.skillLevel ?? 0;
  const question = [...questions].sort(
    (a, b) =>
      level(before, a.id) - level(before, b.id) ||
      (a.id === "transition_reset" ? -1 : b.id === "transition_reset" ? 1 : 0)
  )[0];
  if (!question) return null;
  const short = (label: string | undefined) => label?.split(" — ")[0]?.trim() ?? null;
  const beforeLabel = short(option(before, question.id)?.label);
  const afterLabel = short(option(after, question.id)?.label);
  if (!beforeLabel || !afterLabel) return null;
  return { skill, before: beforeLabel, after: afterLabel, change };
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
 * readiness comparison and the trained skill's before and after (free for
 * everyone) and `skills: null`.
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

  const previousBottleneck = (previous?.bottleneck ?? current.bottleneck) as SkillId;
  let trained: RetestView["trained"] = null;

  if (previous) {
    const [before, after] = await Promise.all([
      resolveReading(supabase, previous),
      resolveReading(supabase, current),
    ]);
    // Readiness is computed from the levels, never read from the stored
    // column, so a baseline saved under the old 40–85 scale is compared on
    // the same 0–100 scale as the re-test (see `readiness.ts`).
    const delta =
      before.scores && after.scores
        ? computeDiagnosisDelta(
            { readiness: readinessFromScores(before.scores), skillScores: before.scores },
            { readiness: readinessFromScores(after.scores), skillScores: after.scores }
          )
        : null;

    if (delta) {
      comparison = {
        previous: delta.readiness.previous,
        current: delta.readiness.current,
        change: delta.readiness.delta,
        direction: directionOf(delta.readiness.delta),
      };
      const trainedDelta = delta.skills.find((d) => d.skill === previousBottleneck);
      if (before.answers && after.answers && trainedDelta) {
        trained = trainedSkill(previousBottleneck, before.answers, after.answers, trainedDelta.delta);
      }
      // The other skills are withheld, not hidden: the free screen renders a
      // placeholder of their names and the levels never reach the browser.
      if (isPaid) skills = delta.skills.filter((d) => d.skill !== previousBottleneck);
    }
  }

  return {
    diagnosisId: current.id,
    readiness: readinessOfRow(current) ?? 0,
    takenOn: monthDay(current.created_at),
    isLatest: index === diagnoses.length - 1,
    comparison,
    skills,
    previousBottleneck,
    newBottleneck: current.bottleneck as SkillId,
    switched: Boolean(previous) && previousBottleneck !== current.bottleneck,
    trained,
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
    .select("id, readiness, skill_scores")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  const rows = (data ?? []).map((row) => ({ id: row.id, readiness: readinessOfRow(row) }));
  const index = diagnosisId ? rows.findIndex((d) => d.id === diagnosisId) : rows.length - 1;
  if (index < 1) return null;

  const current = rows[index].readiness;
  const previous = rows[index - 1].readiness;
  if (typeof current !== "number" || typeof previous !== "number") return null;

  const change = current - previous;
  return { direction: directionOf(change), change };
}
