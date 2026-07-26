/**
 * Derives day/week progress from a plan's created_at + retest_date — no
 * separate "weeks target" column exists, so the total plan length (and thus
 * week count) is derived from the gap between the two, same convention as the
 * UTC day/week boundaries in drill-sessions.ts.
 */
export interface PlanTimeline {
  /** 1-indexed day of the plan (creation day = Day 1). */
  daysElapsed: number;
  /** Total plan length in days (createdAt → retestDate). */
  totalDays: number;
  /** Total plan length in whole weeks, e.g. 3. */
  weeksTarget: number;
  /** 1-indexed current week, clamped to [1, weeksTarget]. */
  weekNumber: number;
  /** Days until the re-test opens; 0 or negative means it's open now. */
  daysUntilRetest: number;
}

function utcMidnight(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export function getPlanTimeline(createdAt: string, retestDate: string): PlanTimeline {
  const start = utcMidnight(new Date(createdAt));
  // retest_date is a date-only column ("YYYY-MM-DD"); Date parses that as UTC midnight already.
  const retest = new Date(retestDate);
  const today = utcMidnight(new Date());

  const dayMs = 24 * 60 * 60 * 1000;
  const totalDays = Math.max(1, Math.round((retest.getTime() - start.getTime()) / dayMs));
  const daysElapsed = Math.max(1, Math.floor((today.getTime() - start.getTime()) / dayMs) + 1);
  const weeksTarget = Math.max(1, Math.round(totalDays / 7));
  const weekNumber = Math.min(weeksTarget, Math.max(1, Math.ceil(daysElapsed / 7)));
  const daysUntilRetest = Math.ceil((retest.getTime() - today.getTime()) / dayMs);

  return { daysElapsed, totalDays, weeksTarget, weekNumber, daysUntilRetest };
}
