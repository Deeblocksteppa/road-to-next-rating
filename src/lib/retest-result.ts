import type { SupabaseClient } from "@supabase/supabase-js";

import { computeDiagnosisDelta, parseStoredSkillScores, type SkillDelta } from "@/lib/delta";
import { scoreSkills } from "@/lib/engine";
import { monthDay } from "@/lib/progress";
import { QUESTIONS } from "@/lib/questions";
import { readinessFromScores, readinessOfRow } from "@/lib/readiness";
import {
  directionOf,
  type Direction,
  type RetestView,
  type TrainedRow,
  type TrainedSkillView,
} from "@/lib/retest-view";
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
 * Names for the rows when a skill is asked about more than once. Only the
 * reset is: once about getting to the kitchen line, once about a ball at your
 * feet mid-court.
 */
const ROW_LABELS: Record<string, string> = {
  net_hold: "Kitchen line",
  transition_reset: "Mid-court",
};

/**
 * The skill the last plan trained, before and after, in the player's own
 * answers ("1–3" → "4–6"). Free for every tier: it answers the one question
 * a player brings to a re-test, whether the thing they practised moved.
 *
 * Every question that measures the skill gets its own row and its own change.
 * The reset's score averages two questions, so one answer moving can leave
 * the score between levels; quoting one question under the averaged change
 * once showed "Same answer" beside an answer that had improved. Each row
 * quotes the option's `short` ("1–3"), never a cut of its label. `null` when
 * an answer can't be read back, and the caller falls back to levels.
 */
function trainedFromAnswers(
  skill: SkillId,
  before: AnswerMap,
  after: AnswerMap
): TrainedSkillView | null {
  const questions = QUESTIONS.filter((q) => q.measures === skill);
  if (questions.length === 0) return null;
  const option = (answers: AnswerMap, id: string) =>
    QUESTIONS.find((q) => q.id === id)?.options?.find((o) => o.id === answers[id]);

  const rows: TrainedRow[] = [];
  for (const question of questions) {
    const was = option(before, question.id);
    const now = option(after, question.id);
    const beforeLabel = was?.short;
    const afterLabel = now?.short;
    if (!beforeLabel || !afterLabel) return null;
    rows.push({
      label: questions.length > 1 ? ROW_LABELS[question.id] ?? null : null,
      before: beforeLabel,
      after: afterLabel,
      change: (now?.skillLevel ?? 0) - (was?.skillLevel ?? 0),
    });
  }
  return { skill, rows, numeric: false };
}

/**
 * The trained skill from its stored levels, for a reading whose answers are
 * gone (an older row, or an assessment that didn't load). Coarser than the
 * answers, but it still says whether the practised skill moved, and the
 * skill is never silently missing from both the free and paid screens.
 */
function trainedFromLevels(delta: SkillDelta): TrainedSkillView {
  const level = (n: number) => `${Number.isInteger(n) ? n : n.toFixed(1)}/3`;
  return {
    skill: delta.skill,
    rows: [
      {
        label: null,
        before: level(delta.previousLevel),
        after: level(delta.currentLevel),
        change: delta.delta,
      },
    ],
    numeric: true,
  };
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
      if (trainedDelta) {
        trained =
          (before.answers && after.answers
            ? trainedFromAnswers(previousBottleneck, before.answers, after.answers)
            : null) ?? trainedFromLevels(trainedDelta);
      }
      // The other skills are withheld, not hidden: the free screen renders a
      // placeholder of their names and the levels never reach the browser.
      // Only a skill shown above as trained is left out of the breakdown.
      if (isPaid) skills = delta.skills.filter((d) => d.skill !== trained?.skill);
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
