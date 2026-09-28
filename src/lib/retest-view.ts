import type { SkillDelta } from "@/lib/delta";
import type { SkillId } from "@/lib/types";

/** Which way a readiness score went between two readings. */
export type Direction = "up" | "flat" | "down";

export function directionOf(change: number): Direction {
  if (change > 0) return "up";
  if (change < 0) return "down";
  return "flat";
}

/**
 * One re-test result, as the result screen renders it. Built on the server by
 * `loadRetestView`, which is also where the tier decision is made: `skills` is
 * only ever filled in for a paid viewer, so a free player's browser never
 * receives the per-skill breakdown it is shown a locked placeholder of.
 */
export interface RetestView {
  diagnosisId: string;
  /** This reading's readiness. */
  readiness: number;
  /** "Sep 20" — when this re-test was taken. */
  takenOn: string;
  /** Whether this is the player's most recent diagnosis (a fresh result) or an older one opened from history. */
  isLatest: boolean;
  /**
   * The readiness comparison against the reading before this one, or `null`
   * when there is no comparable baseline (see `loadRetestView`). Readiness is
   * free for every tier, so this is always sent when it exists.
   */
  comparison: {
    previous: number;
    current: number;
    change: number;
    direction: Direction;
  } | null;
  /**
   * Per-skill movement. `null` for a free viewer (locked) and when there is no
   * comparable baseline; check `isPaid` and `comparison` to tell them apart.
   */
  skills: SkillDelta[] | null;
  /** The skill the plan before this re-test worked on. */
  previousBottleneck: SkillId;
  /** The skill the plan after this re-test works on. */
  newBottleneck: SkillId;
  isPaid: boolean;
}

/**
 * The only place a re-test's result screen lives. A URL, not client state, so
 * the per-skill breakdown can be reopened from Progress and so checkout can
 * return a player to the breakdown they just paid to see.
 */
export function retestHref(diagnosisId: string): string {
  return `/retest/${diagnosisId}`;
}
