import type { SupabaseClient } from "@supabase/supabase-js";

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
  /** Distinct drills from this plan completed since Monday. */
  completed: number;
  /** Total drills prescribed by the plan. */
  total: number;
}

/**
 * Count this week's completed sessions for a plan, as distinct drills done
 * (so logging the same drill twice in a week still reads as one). Drives the
 * "X of N this week" indicator.
 */
export async function getWeeklyProgress(
  supabase: SupabaseClient,
  planId: string,
  totalDrills: number
): Promise<WeeklyProgress> {
  const { data, error } = await supabase
    .from("drill_sessions")
    .select("drill_id")
    .eq("plan_id", planId)
    .gte("completed_at", startOfWeekUTC().toISOString());
  if (error) throw error;

  const distinct = new Set((data ?? []).map((row) => row.drill_id as string));
  return { completed: distinct.size, total: totalDrills };
}

/** Set of drill ids already logged today for the plan (for done-state / disabling). */
export async function getCompletedTodayDrillIds(
  supabase: SupabaseClient,
  planId: string
): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("drill_sessions")
    .select("drill_id")
    .eq("plan_id", planId)
    .gte("completed_at", startOfTodayUTC().toISOString());
  if (error) throw error;

  return new Set((data ?? []).map((row) => row.drill_id as string));
}

/**
 * Set of drill ids logged at least once since Monday (for the Plan screen's
 * per-task checked/strikethrough state — a task reads "done" for the week
 * once it's been logged once, not only on the day it was logged).
 */
export async function getCompletedThisWeekDrillIds(
  supabase: SupabaseClient,
  planId: string
): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("drill_sessions")
    .select("drill_id")
    .eq("plan_id", planId)
    .gte("completed_at", startOfWeekUTC().toISOString());
  if (error) throw error;

  return new Set((data ?? []).map((row) => row.drill_id as string));
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
 * when the number of distinct drills logged that week meets `sessionTarget`.
 * The current (possibly in-progress) week never breaks the streak.
 */
export async function getWeeklyStreak(
  supabase: SupabaseClient,
  sessionTarget: number,
  weeksToShow = 6
): Promise<StreakResult> {
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  const currentWeekStart = startOfWeekUTC();
  const lookback = new Date(currentWeekStart.getTime() - (weeksToShow - 1) * weekMs);

  const { data, error } = await supabase
    .from("drill_sessions")
    .select("drill_id, completed_at")
    .gte("completed_at", lookback.toISOString());
  if (error) throw error;

  const weekSets: Set<string>[] = Array.from({ length: weeksToShow }, () => new Set());
  for (const row of data ?? []) {
    const ws = startOfWeekUTC(new Date(row.completed_at as string));
    const idx = Math.round((ws.getTime() - lookback.getTime()) / weekMs);
    if (idx >= 0 && idx < weeksToShow) weekSets[idx].add(row.drill_id as string);
  }

  const weeks = weekSets.map((s) => sessionTarget > 0 && s.size >= sessionTarget);

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
