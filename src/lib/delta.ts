import type { SkillId, SkillScore } from "@/lib/types";

/**
 * Every skill the engine scores. Typed as a record so adding a `SkillId`
 * without listing it here is a compile error, not a silently incomplete
 * baseline check.
 */
const SKILL_IDS: Record<SkillId, true> = {
  third_shot_drop: true,
  reset: true,
  net_defense: true,
  dink_patience: true,
};

/** Movement on a single skill between two diagnoses. */
export interface SkillDelta {
  skill: SkillId;
  previousLevel: number;
  currentLevel: number;
  delta: number;
}

/** Readiness + per-skill movement from a previous diagnosis to the current one. */
export interface DiagnosisDelta {
  readiness: { previous: number; current: number; delta: number };
  skills: SkillDelta[];
}

interface DiagnosisSnapshot {
  readiness: number;
  skillScores: SkillScore[];
}

/**
 * Compare a new diagnosis against the most recent previous one for the same
 * user: readiness delta (new − old) and per-skill level deltas.
 *
 * Returns `null` when the previous snapshot is missing any skill the current
 * one scores. It used to substitute level 0 for a missing skill, which turned
 * an absent baseline into a delta equal to the player's full current level —
 * a false "+2" on the most emotionally loaded screen in the app. A delta is
 * only ever computed against a baseline that actually measured every skill.
 */
export function computeDiagnosisDelta(
  previous: DiagnosisSnapshot,
  current: DiagnosisSnapshot
): DiagnosisDelta | null {
  const previousLevels = new Map<SkillId, number>(
    previous.skillScores.map((s) => [s.skill, s.level])
  );

  const skills: SkillDelta[] = [];
  for (const s of current.skillScores) {
    const previousLevel = previousLevels.get(s.skill);
    if (previousLevel === undefined) return null;
    skills.push({
      skill: s.skill,
      previousLevel,
      currentLevel: s.level,
      delta: s.level - previousLevel,
    });
  }

  return {
    readiness: {
      previous: previous.readiness,
      current: current.readiness,
      delta: current.readiness - previous.readiness,
    },
    skills,
  };
}

/** Convenience: the delta entry for a specific skill (e.g. the old bottleneck). */
export function skillDeltaFor(
  delta: DiagnosisDelta,
  skill: SkillId
): SkillDelta | undefined {
  return delta.skills.find((s) => s.skill === skill);
}

/**
 * Read the `diagnoses.skill_scores` jsonb column back into usable scores.
 *
 * It is the fallback baseline when a previous diagnosis has no loadable
 * assessment answers, so it is validated rather than trusted: the value must
 * be an array covering every skill in `SKILL_IDS`, each with a finite level
 * in the engine's 0–3 range. Anything else returns `null`, and the caller
 * treats the re-test as having no comparable baseline. `importance` and `gap`
 * are carried through when present but are not needed for a delta.
 */
export function parseStoredSkillScores(value: unknown): SkillScore[] | null {
  if (!Array.isArray(value)) return null;

  const bySkill = new Map<SkillId, SkillScore>();
  for (const entry of value) {
    if (typeof entry !== "object" || entry === null) return null;
    const { skill, level, importance, gap } = entry as Record<string, unknown>;
    if (typeof skill !== "string" || !(skill in SKILL_IDS)) return null;
    if (typeof level !== "number" || !Number.isFinite(level) || level < 0 || level > 3) {
      return null;
    }
    bySkill.set(skill as SkillId, {
      skill: skill as SkillId,
      level,
      importance: typeof importance === "number" ? importance : 0,
      gap: typeof gap === "number" ? gap : 0,
    });
  }

  const scores: SkillScore[] = [];
  for (const skill of Object.keys(SKILL_IDS) as SkillId[]) {
    const score = bySkill.get(skill);
    if (!score) return null;
    scores.push(score);
  }
  return scores;
}
