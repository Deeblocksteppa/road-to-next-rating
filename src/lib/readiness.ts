import { parseStoredSkillScores } from "./delta";
import { QUESTIONS } from "./questions";
import type { SkillId, SkillScore } from "./types";

/**
 * The lowest and highest level each skill can score, from the questions
 * themselves. A skill asked about twice (the reset) scores the average of its
 * questions, so its bounds are the averages of theirs. Not every skill can
 * reach 0: the dinking question's worst answers both score 1.
 */
function skillBounds(): Record<SkillId, { min: number; max: number }> {
  const bySkill = new Map<SkillId, { mins: number[]; maxes: number[] }>();
  for (const q of QUESTIONS) {
    if (!q.measures || !q.options) continue;
    const levels = q.options.map((o) => o.skillLevel ?? 0);
    const entry = bySkill.get(q.measures) ?? { mins: [], maxes: [] };
    entry.mins.push(Math.min(...levels));
    entry.maxes.push(Math.max(...levels));
    bySkill.set(q.measures, entry);
  }
  const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  return Object.fromEntries(
    Array.from(bySkill, ([skill, { mins, maxes }]) => [skill, { min: mean(mins), max: mean(maxes) }])
  ) as Record<SkillId, { min: number; max: number }>;
}

const BOUNDS = skillBounds();
const TOTAL_MIN = Object.values(BOUNDS).reduce((sum, b) => sum + b.min, 0);
const TOTAL_MAX = Object.values(BOUNDS).reduce((sum, b) => sum + b.max, 0);

/**
 * Readiness: the four skill levels from the assessment as one number from 0
 * to 100, where the worst possible set of answers scores 0 and the best
 * scores 100.
 *
 * It used to be 40 + 45 × (share of the maximum), which ran 40 to 85: no
 * player could reach 100, and on a bar labelled 3.0 to 4.0 it read like a
 * rating estimate. The ordering of players is unchanged; only the scale is.
 * It is a score from the player's own answers, not a DUPR estimate, and the
 * screens that show it say so.
 */
export function readinessFromScores(scores: Pick<SkillScore, "level">[]): number {
  if (scores.length === 0 || TOTAL_MAX <= TOTAL_MIN) return 0;
  const sum = scores.reduce((total, s) => total + s.level, 0);
  const share = (sum - TOTAL_MIN) / (TOTAL_MAX - TOTAL_MIN);
  return Math.round(Math.max(0, Math.min(1, share)) * 100);
}

/**
 * A stored diagnosis's readiness, on the current scale.
 *
 * Computed from the row's `skill_scores` (every diagnosis stores them) rather
 * than read from its `readiness` column, so rows saved under the old 40–85
 * formula read correctly without waiting on a data migration, and a re-test
 * is never compared across two scales. Falls back to the column only when the
 * scores are missing or malformed.
 */
export function readinessOfRow(row: { readiness?: number | null; skill_scores?: unknown }): number | null {
  const scores = parseStoredSkillScores(row.skill_scores);
  if (scores) return readinessFromScores(scores);
  return typeof row.readiness === "number" ? row.readiness : null;
}
