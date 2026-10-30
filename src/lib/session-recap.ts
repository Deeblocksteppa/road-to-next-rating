import type { DrillResult } from "@/lib/drill-sessions";

/** One drill on the session recap: what was logged, against what. */
export interface RecapRow {
  id: string;
  name: string;
  /** Today's logged number, or null when the drill was logged without one. */
  result: number | null;
  /** The drill's practice target as written ("7 of 10"). */
  target: string;
  /** The most recent scored log before this sitting. Null on a drill's first logged session. */
  lastTime: number | null;
}

/**
 * The count a practice target asks for: "7 of 10" → 7. Null when the string
 * doesn't start with a number, so the recap can show the target as written.
 */
export function practiceTargetCount(target: string): number | null {
  const n = parseInt(target, 10);
  return Number.isFinite(n) ? n : null;
}

/**
 * A drill's "last time": the newest scored log from before this sitting
 * opened, so tonight's own number is never its own "last time". History
 * spans plans, so a drill carried into a new plan keeps its previous number.
 */
export function lastTimeBefore(history: DrillResult[], sittingStart: Date): number | null {
  const cutoff = sittingStart.getTime();
  for (let i = history.length - 1; i >= 0; i--) {
    if (new Date(history[i].completedAt).getTime() < cutoff) return history[i].resultValue;
  }
  return null;
}
