import type { Drill } from "@/lib/drills";

/**
 * What a "session" is — the one definition every surface reads from.
 *
 *   A session is one visit to the court (or the wall) in which the player does
 *   EVERY drill on their plan, back to back. The plan asks for
 *   `SESSIONS_PER_WEEK` of them. A session counts once all of its drills are
 *   logged in one sitting — the same UTC day, or within `SESSION_WINDOW_MS`
 *   of each other when an evening runs across midnight UTC. One drill on
 *   Monday and the other on Wednesday is two unfinished sessions, not one
 *   finished one.
 *
 * This replaced an accidental definition. The data model stores one
 * `drill_sessions` row per drill per day, and the weekly counter used to count
 * *distinct drills logged this week* out of *drills on the plan* — so with two
 * drills, "2 sessions a week" secretly meant "each drill once". Meanwhile the
 * plan preview promised "2× a week · 15 min each" (one drill is 10), Home
 * offered "today's session · 25 min" (both drills summed) and then opened a
 * guided flow that ran only one of them, and the Plan tab marked both drills
 * "due today" beside "0/2 sessions". Someone booking a court or a partner
 * could not tell what they had agreed to.
 *
 * The table is unchanged: a row is still one drill on one day, which is what
 * the per-day unique index guarantees. A session is derived from the rows —
 * see `countSessions` — so nothing needed migrating.
 */
export const SESSIONS_PER_WEEK = 2;

/** Whole minutes from a drill's duration string ("15 min" → 15). */
function minutesOf(duration: string): number {
  const n = parseInt(duration, 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** Total minutes for a set of drills — a whole session, or what is left of one. */
export function sessionMinutes(drills: Pick<Drill, "duration">[]): number {
  return drills.reduce((sum, d) => sum + minutesOf(d.duration), 0);
}

/** "25 minutes, 2 drills" — the shape of one session, for any surface. */
export function sessionShape(drills: Pick<Drill, "duration">[]): string {
  const n = drills.length;
  return `${sessionMinutes(drills)} minutes, ${n} drill${n === 1 ? "" : "s"}`;
}

/** "2 sessions a week · 25 minutes, 2 drills each" — the whole commitment. */
export function weeklyCommitment(drills: Pick<Drill, "duration">[]): string {
  return `${SESSIONS_PER_WEEK} sessions a week · ${sessionShape(drills)} each`;
}

/** A logged drill, reduced to what session-counting needs. */
export interface LoggedDrill {
  planId: string | null;
  drillId: string;
  /** ISO timestamp. */
  completedAt: string;
}

/** UTC calendar day of a timestamp, "2026-09-19". */
export function utcDay(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

/**
 * How long one sitting can run. The app's "day" is UTC — that is what the
 * per-day unique index is built on — and midnight UTC is 8pm Eastern, right in
 * the middle of an evening session. Without this, a player who logs the first
 * drill at 7:55pm and the second at 8:10pm would have done two halves of two
 * different days and been credited with nothing. Drills logged within this
 * window of the sitting's first drill belong to that sitting even if the UTC
 * date rolled over in between.
 */
export const SESSION_WINDOW_MS = 6 * 60 * 60 * 1000;

/**
 * Completed sessions in a set of logged drills.
 *
 * Per plan, in time order, logs are gathered into sittings: a log joins the
 * current sitting if it falls on the same UTC day as the sitting's first log,
 * or within `SESSION_WINDOW_MS` of it. A sitting is a session once it holds at
 * least `drillsPerSession` distinct drills. Grouping by plan keeps a re-test
 * day honest — the old plan's drills and the new plan's never add up to one
 * session between them.
 */
export function countSessions(rows: LoggedDrill[], drillsPerSession: number): number {
  if (drillsPerSession <= 0) return 0;

  const byPlan = new Map<string, LoggedDrill[]>();
  for (const row of rows) {
    const key = row.planId ?? "";
    const list = byPlan.get(key) ?? [];
    list.push(row);
    byPlan.set(key, list);
  }

  let sessions = 0;
  byPlan.forEach((list) => {
    const sorted = [...list].sort(
      (a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime()
    );
    let firstAt = 0;
    let firstDay = "";
    let drills = new Set<string>();
    const close = () => {
      if (drills.size >= drillsPerSession) sessions++;
    };
    for (const row of sorted) {
      const at = new Date(row.completedAt).getTime();
      const sameSitting =
        drills.size > 0 &&
        (utcDay(row.completedAt) === firstDay || at - firstAt <= SESSION_WINDOW_MS);
      if (!sameSitting) {
        close();
        firstAt = at;
        firstDay = utcDay(row.completedAt);
        drills = new Set<string>();
      }
      drills.add(row.drillId);
    }
    close();
  });
  return sessions;
}
