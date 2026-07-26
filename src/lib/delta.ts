import type { SkillId, SkillScore } from "@/lib/types";

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
 * user: readiness delta (new − old) and per-skill level deltas. Skills present
 * in the current diagnosis drive the list; a skill missing from the previous
 * snapshot is treated as level 0.
 */
export function computeDiagnosisDelta(
  previous: DiagnosisSnapshot,
  current: DiagnosisSnapshot
): DiagnosisDelta {
  const previousLevels = new Map<SkillId, number>(
    previous.skillScores.map((s) => [s.skill, s.level])
  );

  const skills: SkillDelta[] = current.skillScores.map((s) => {
    const previousLevel = previousLevels.get(s.skill) ?? 0;
    return {
      skill: s.skill,
      previousLevel,
      currentLevel: s.level,
      delta: s.level - previousLevel,
    };
  });

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
