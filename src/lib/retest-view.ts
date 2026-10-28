import type { SkillDelta } from "@/lib/delta";
import type { SkillId } from "@/lib/types";

/** Which way a readiness score went between two readings. */
export type Direction = "up" | "flat" | "down";

export function directionOf(change: number): Direction {
  if (change > 0) return "up";
  if (change < 0) return "down";
  return "flat";
}

/** One answer (or level) the trained skill is read from, before and after. */
export interface TrainedRow {
  /** Which question this row quotes ("Kitchen line"). `null` when the skill is asked about once. */
  label: string | null;
  before: string;
  after: string;
  /** Level change on this row alone, so each row's "Moved up" is its own. */
  change: number;
}

export interface TrainedSkillView {
  skill: SkillId;
  /**
   * In the player's own answers ("1–3" → "4–6"), one row per question that
   * measures the skill: the reset is asked about twice and shows both. When
   * either reading's answers are gone, one row of stored levels ("1/3" → "2/3").
   */
  rows: TrainedRow[];
  /** The rows quote levels, not answers. */
  numeric: boolean;
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
   * Per-skill movement for the skills other than `trained`. `null` for a free
   * viewer (locked) and when there is no comparable baseline; check `isPaid`
   * and `comparison` to tell them apart.
   */
  skills: SkillDelta[] | null;
  /** The skill the plan before this re-test worked on. */
  previousBottleneck: SkillId;
  /** The skill the plan after this re-test works on. */
  newBottleneck: SkillId;
  /** The focus skill changed with this re-test. */
  switched: boolean;
  /**
   * The skill the previous plan trained, before and after. Free for every
   * tier; `null` when there is no comparable baseline.
   */
  trained: TrainedSkillView | null;
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

/**
 * Where "See my next plan" goes from a re-test result. A re-test that moved
 * the focus to a new skill first explains it (the reveal's verdict, insight
 * and absolution for the new diagnosis); one that kept the same skill goes
 * straight to the plan.
 */
export function nextPlanHref(view: Pick<RetestView, "diagnosisId" | "switched" | "isLatest">): string {
  return view.switched && view.isLatest ? `${retestHref(view.diagnosisId)}/next` : "/plan";
}
