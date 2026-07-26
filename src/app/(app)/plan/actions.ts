"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import {
  getWeeklyProgress,
  recordDrillSession,
  type WeeklyProgress,
} from "@/lib/drill-sessions";

/**
 * Log a drill as done today for a claimed plan. Requires a logged-in user who
 * owns the plan. Idempotent per (plan, drill, UTC day) — see
 * `recordDrillSession` for the ownership and dedup rules.
 */
export async function logDrillSession(planId: string, drillId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await recordDrillSession(supabase, user.id, planId, drillId);

  revalidatePath("/plan");
  revalidatePath("/home");
}

/**
 * Log a guided session: the same drill-session row as `logDrillSession`, plus
 * the number the user recorded (e.g. 6 of 10 drops landed). Shares the
 * ownership check and per-day dedup; if the drill was already logged today
 * without a number, the score is written onto that existing row.
 *
 * `resultValue` is clamped to 0–10 — the caller is a 0–10 tap grid, but this
 * is a server action and the input is untrusted.
 *
 * Returns the week's session count *after* the write so the guided flow's
 * confirmation screen can show a real "3 of 6 this week" without a round trip
 * back to the server. Returns null when the caller isn't entitled to log.
 */
export async function logGuidedSession(
  planId: string,
  drillId: string,
  resultValue: number
): Promise<WeeklyProgress | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  if (!Number.isFinite(resultValue)) return null;
  const score = Math.min(10, Math.max(0, Math.round(resultValue)));

  await recordDrillSession(supabase, user.id, planId, drillId, score);

  revalidatePath("/plan");
  revalidatePath("/home");

  // Total = the plan's prescribed drill count, matching Home's "sessions this
  // week" denominator.
  const { data: plan } = await supabase
    .from("plans")
    .select("drill_ids")
    .eq("id", planId)
    .maybeSingle();
  const total = ((plan?.drill_ids as string[] | null) ?? []).length;

  return getWeeklyProgress(supabase, planId, total);
}
