import type { SupabaseClient } from "@supabase/supabase-js";

import {
  SESSIONS_PER_WEEK,
  SESSION_WINDOW_MS,
  countSessions,
  type LoggedDrill,
} from "@/lib/session-plan";

/**
 * Drill-session queries. "Week" and "today" are computed in UTC (simplest, and
 * consistent with the per-UTC-day dedup index on drill_sessions). Pass any
 * Supabase client whose session belongs to the plan's owner — RLS scopes every
 * read to the current user's own rows.
 */

/** Midnight UTC at the start of the current ISO week (Monday). */
export function startOfWeekUTC(now: Date = new Date()): Date {
  const d = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
  const day = d.getUTCDay(); // 0 = Sunday … 6 = Saturday
  const shiftToMonday = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + shiftToMonday);
  return d;
}

/** Midnight UTC at the start of today. */
export function startOfTodayUTC(now: Date = new Date()): Date {
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
}

/**
 * Insert a drill session for today, deduped per (plan, drill, UTC day).
 *
 * Shared by every logging path (plain "mark done" and guided sessions) so the
 * ownership check and the dedup rule live in exactly one place. Callers own
 * auth and cache revalidation.
 *
 * `resultValue` is the guided-session score; pass null/undefined when logging
 * without a number. When a row for today already exists, a non-null
 * `resultValue` is written onto it — a user who taps "done" and then completes
 * the guided version of the same drill should keep the number, not lose it to
 * the earlier bare row. A null `resultValue` never clears an existing score.
 *
 * Returns true when a new row was created, false when today's row already
 * existed (whether or not it was updated).
 */
export async function recordDrillSession(
  supabase: SupabaseClient,
  userId: string,
  planId: string,
  drillId: string,
  resultValue?: number | null
): Promise<boolean> {
  // Only the plan's owner may log against it (RLS scopes drill_sessions by
  // user_id, but this also stops logging sessions onto someone else's plan id).
  const { data: plan } = await supabase
    .from("plans")
    .select("id")
    .eq("id", planId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!plan) return false;

  const { data: existing } = await supabase
    .from("drill_sessions")
    .select("id")
    .eq("plan_id", planId)
    .eq("drill_id", drillId)
    .gte("completed_at", startOfTodayUTC().toISOString())
    .maybeSingle();

  if (existing) {
    if (resultValue != null) {
      const { error } = await supabase
        .from("drill_sessions")
        .update({ result_value: resultValue })
        .eq("id", existing.id);
      if (error) throw error;
    }
    return false;
  }

  const { error } = await supabase.from("drill_sessions").insert({
    plan_id: planId,
    user_id: userId,
    drill_id: drillId,
    result_value: resultValue ?? null,
    // completed_at defaults to now() in the DB.
  });

  // 23505 = unique violation from the per-day index (raced double-submit) —
  // treat as already-logged rather than an error.
  if (error && error.code !== "23505") throw error;
  return !error;
}

export interface DrillResult {
  /** ISO timestamp of the session. */
  completedAt: string;
  /** The logged number, e.g. 6 (of 10). */
  resultValue: number;
}

/**
 * A user's scored sessions for one drill, oldest → newest. Sessions logged
 * without a number are omitted, so the caller gets a clean series to render as
 * "3/10 → 6/10". Spans plans (RLS scopes to the caller), so a re-test that
 * issues a new plan doesn't reset the history for a drill that carries over.
 */
export async function getDrillResultHistory(
  supabase: SupabaseClient,
  drillId: string
): Promise<DrillResult[]> {
  const { data, error } = await supabase
    .from("drill_sessions")
    .select("completed_at, result_value")
    .eq("drill_id", drillId)
    .not("result_value", "is", null)
    .order("completed_at", { ascending: true });
  if (error) throw error;

  return (data ?? []).map((row) => ({
    completedAt: row.completed_at as string,
    resultValue: row.result_value as number,
  }));
}

/**
 * Scored sessions for several drills at once, grouped by drill_id, each list
 * oldest → newest. One query (RLS scopes to the caller, so it spans plans).
 * Used to pull a bottleneck skill's practice history for the Progress chart
 * without a query per drill.
 */
export async function getScoredSessionsByDrill(
  supabase: SupabaseClient,
  drillIds: string[]
): Promise<Map<string, DrillResult[]>> {
  const out = new Map<string, DrillResult[]>();
  if (drillIds.length === 0) return out;

  const { data, error } = await supabase
    .from("drill_sessions")
    .select("drill_id, completed_at, result_value")
    .in("drill_id", drillIds)
    .not("result_value", "is", null)
    .order("completed_at", { ascending: true });
  if (error) throw error;

  for (const row of data ?? []) {
    const id = row.drill_id as string;
    const list = out.get(id) ?? [];
    list.push({
      completedAt: row.completed_at as string,
      resultValue: row.result_value as number,
    });
    out.set(id, list);
  }
  return out;
}

export interface WeeklyProgress {
  /** Sessions completed since Monday — see `session-plan.ts` for what counts. */
  completed: number;
  /** Sessions the plan asks for each week. */
  total: number;
}

function toLogged(rows: Record<string, unknown>[] | null): LoggedDrill[] {
  return (rows ?? []).map((row) => ({
    planId: (row.plan_id as string | null) ?? null,
    drillId: row.drill_id as string,
    completedAt: row.completed_at as string,
  }));
}

/**
 * This week's completed sessions for a plan. A session is every drill on the
 * plan logged on the same UTC day, so `drillsPerSession` is the plan's drill
 * count. Drives the "X/2 sessions" indicator on Home, Plan and the guided
 * flow's confirmation — all three read this one function.
 */
export async function getWeeklyProgress(
  supabase: SupabaseClient,
  planId: string,
  drillsPerSession: number
): Promise<WeeklyProgress> {
  const { data, error } = await supabase
    .from("drill_sessions")
    .select("plan_id, drill_id, completed_at")
    .eq("plan_id", planId)
    .gte("completed_at", startOfWeekUTC().toISOString());
  if (error) throw error;

  return {
    completed: countSessions(toLogged(data), drillsPerSession),
    total: SESSIONS_PER_WEEK,
  };
}

/**
 * Every session the caller has ever completed, across plans (RLS scopes the
 * read). The Progress screen's "sessions done" stat — it used to be a raw row
 * count, which is drills, not sessions.
 */
export async function getTotalSessions(
  supabase: SupabaseClient,
  drillsPerSession: number
): Promise<number> {
  const { data, error } = await supabase
    .from("drill_sessions")
    .select("plan_id, drill_id, completed_at");
  if (error) throw error;
  return countSessions(toLogged(data), drillsPerSession);
}

/**
 * Drill ids already logged in the current sitting — what Home, Plan and the
 * guided flow treat as "done today". That is today in UTC, stretched back by
 * `SESSION_WINDOW_MS` so a session that straddles midnight UTC (8pm Eastern)
 * does not reset halfway through. Matches how `countSessions` groups logs.
 */
export async function getCompletedTodayDrillIds(
  supabase: SupabaseClient,
  planId: string
): Promise<Set<string>> {
  const since = new Date(
    Math.min(startOfTodayUTC().getTime(), Date.now() - SESSION_WINDOW_MS)
  );
  const { data, error } = await supabase
    .from("drill_sessions")
    .select("drill_id")
    .eq("plan_id", planId)
    .gte("completed_at", since.toISOString());
  if (error) throw error;

  return new Set((data ?? []).map((row) => row.drill_id as string));
}

/** One drill logged in the current sitting, with the number recorded (if any). */
export interface TodayLogEntry {
  drillId: string;
  result: number | null;
}

/**
 * Today's log with results — what the Plan tab shows on a completed card.
 * Same window as `getCompletedTodayDrillIds`.
 */
export async function getTodayLog(
  supabase: SupabaseClient,
  planId: string
): Promise<TodayLogEntry[]> {
  const since = new Date(
    Math.min(startOfTodayUTC().getTime(), Date.now() - SESSION_WINDOW_MS)
  );
  const { data, error } = await supabase
    .from("drill_sessions")
    .select("drill_id, result_value")
    .eq("plan_id", planId)
    .gte("completed_at", since.toISOString());
  if (error) throw error;
  return (data ?? []).map((row) => ({
    drillId: row.drill_id as string,
    result: (row.result_value as number | null) ?? null,
  }));
}

export interface StreakResult {
  /** Consecutive weeks (up to now) hitting the session target. */
  streakCount: number;
  /** Per-week hit/miss for the last `weeksToShow` weeks, oldest → newest. */
  weeks: boolean[];
}

/**
 * Weekly streak across ALL of the user's drill sessions (RLS scopes to the
 * caller, so no plan filter — this spans the plan history). A week is "hit"
 * when it holds at least `SESSIONS_PER_WEEK` completed sessions, a session
 * being `drillsPerSession` distinct drills logged on one day for one plan.
 * The current (possibly in-progress) week never breaks the streak.
 */
export async function getWeeklyStreak(
  supabase: SupabaseClient,
  drillsPerSession: number,
  weeksToShow = 6
): Promise<StreakResult> {
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  const currentWeekStart = startOfWeekUTC();
  const lookback = new Date(currentWeekStart.getTime() - (weeksToShow - 1) * weekMs);

  const { data, error } = await supabase
    .from("drill_sessions")
    .select("plan_id, drill_id, completed_at")
    .gte("completed_at", lookback.toISOString());
  if (error) throw error;

  const byWeek: LoggedDrill[][] = Array.from({ length: weeksToShow }, () => []);
  for (const row of toLogged(data)) {
    const ws = startOfWeekUTC(new Date(row.completedAt));
    const idx = Math.round((ws.getTime() - lookback.getTime()) / weekMs);
    if (idx >= 0 && idx < weeksToShow) byWeek[idx].push(row);
  }

  const weeks = byWeek.map(
    (rows) => countSessions(rows, drillsPerSession) >= SESSIONS_PER_WEEK
  );

  // Trailing consecutive hits; the current (last) week being a miss doesn't
  // break it (it may just be mid-week).
  let streakCount = 0;
  for (let i = weeks.length - 1; i >= 0; i--) {
    if (weeks[i]) streakCount++;
    else if (i === weeks.length - 1) continue;
    else break;
  }

  return { streakCount, weeks };
}
