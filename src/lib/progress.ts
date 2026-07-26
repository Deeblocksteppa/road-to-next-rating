/**
 * Pure helpers for the Progress screen. Turns raw `diagnoses` rows into the
 * readiness series + re-test history the UI renders. No Supabase here — the
 * page does the querying and passes rows in.
 */

export interface ReadinessPoint {
  readiness: number;
  label: string;
}

export interface HistoryRow {
  label: string;
  dateLabel: string;
  score: number;
  delta: number | null; // null for the baseline row
}

/**
 * The subordinate practice series shown under the readiness line: a single
 * drill's logged result_values over time, so the readiness climb is backed by
 * the real numbers that drove it. `max` is the drill's ceiling (10 — every log
 * prompt is "out of 10").
 */
export interface SessionSeries {
  drillName: string;
  values: number[]; // result values, oldest → newest
  max: number;
}

/** One candidate drill for the session series. */
export interface DrillResults {
  drillName: string;
  values: number[]; // result values, oldest → newest
  lastAt: string | null; // completed_at of the most recent session
}

/**
 * Pick the drill to plot beneath the readiness line: among the current
 * bottleneck's drills, the one with the most scored sessions (ties broken by
 * most-recent activity). Returns null unless that drill has at least 2 scored
 * sessions — below that there's no meaningful progression to show, and the
 * chart falls back to readiness-only.
 */
export function pickSessionSeries(
  candidates: DrillResults[],
  max = 10
): SessionSeries | null {
  let best: DrillResults | null = null;
  for (const c of candidates) {
    if (c.values.length < 2) continue;
    if (
      !best ||
      c.values.length > best.values.length ||
      (c.values.length === best.values.length &&
        (c.lastAt ?? "") > (best.lastAt ?? ""))
    ) {
      best = c;
    }
  }
  return best ? { drillName: best.drillName, values: best.values, max } : null;
}

export interface DiagnosisRow {
  id?: string | null;
  readiness: number | null;
  created_at: string;
}

/** The plan a given diagnosis produced — its window governs the NEXT diagnosis. */
export interface PlanWindow {
  diagnosis_id: string | null;
  created_at: string;
  retest_date: string | null;
}

const MONTHS = [
  "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
  "JUL", "AUG", "SEP", "OCT", "NOV", "DEC",
];

/** "JUL 28" — for axis labels / history rows. */
export function shortDate(iso: string): string {
  const d = new Date(iso);
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

/** "Jul 28" — title-case, for the big Day-One date. */
export function monthDay(iso: string): string {
  const d = new Date(iso);
  const m = MONTHS[d.getUTCMonth()];
  return `${m[0]}${m.slice(1).toLowerCase()} ${d.getUTCDate()}`;
}

export function buildReadinessSeries(diags: DiagnosisRow[]): ReadinessPoint[] {
  return diags.map((d) => ({ readiness: d.readiness ?? 0, label: shortDate(d.created_at) }));
}

/**
 * Labels each re-test by where it landed in the first plan cycle:
 *   • the first diagnosis                        → "Baseline"
 *   • lands before the baseline plan's retest_date → "Mid-plan check"
 *   • first one at/after that retest_date        → "Full re-test"
 *   • anything past that completed cycle         → "Re-test 2", "Re-test 3", …
 *
 * The cycle is anchored to the BASELINE's plan window. Re-testing early spawns a
 * fresh plan (submitRetest always does), so anchoring to the most recent plan
 * would let a mid-plan check silently restart the 3-week clock and the original
 * cycle could never complete. A mid-plan check is a checkpoint inside the cycle,
 * not a new one. If the baseline's plan (or its retest_date) is missing, the
 * cycle counts as complete so rows read as real re-tests, not mid-plan checks.
 */
export function buildHistoryRows(
  diags: DiagnosisRow[],
  plans: PlanWindow[] = []
): HistoryRow[] {
  const planByDiagnosis = new Map<string, PlanWindow>();
  for (const p of plans) {
    if (p.diagnosis_id) planByDiagnosis.set(p.diagnosis_id, p);
  }

  const baselineId = diags[0]?.id;
  const cycleEnd = (baselineId ? planByDiagnosis.get(baselineId) : undefined)?.retest_date;

  let firstCycleComplete = false;
  let nextRetestNumber = 2;

  return diags.map((d, i) => {
    let label: string;

    if (i === 0) {
      label = "Baseline";
    } else if (firstCycleComplete) {
      label = `Re-test ${nextRetestNumber++}`;
    } else {
      const completedCycle = cycleEnd
        ? new Date(d.created_at).getTime() >= new Date(cycleEnd).getTime()
        : true;

      if (completedCycle) {
        label = "Full re-test";
        firstCycleComplete = true;
      } else {
        label = "Mid-plan check";
      }
    }

    return {
      label,
      dateLabel: shortDate(d.created_at),
      score: d.readiness ?? 0,
      delta: i === 0 ? null : (d.readiness ?? 0) - (diags[i - 1].readiness ?? 0),
    };
  });
}

/** Whole weeks between two ISO timestamps, min 1. */
export function weeksBetween(startIso: string, endIso: string): number {
  const ms = new Date(endIso).getTime() - new Date(startIso).getTime();
  return Math.max(1, Math.round(ms / (7 * 24 * 60 * 60 * 1000)));
}
