"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import {
  getWeeklyProgress,
  recordDrillSession,
  type WeeklyProgress,
} from "@/lib/drill-sessions";

/*
 * There is deliberately no bare "mark done" action here any more. The Plan
 * tab used to log a drill on one tap, writing the same drill_sessions row the
 * guided session writes after a timed drill and a scored result — so a casual
 * tap produced a performance record indistinguishable from a real one. The
 * guided session is the only logging path.
 */

/**
 * Log a guided session: one drill_sessions row for the drill, plus
 * the number the user recorded (e.g. 6 of 10 drops landed). Shares the
 * ownership check and per-day dedup; if the drill was already logged today
 * without a number, the score is written onto that existing row.
 *
 * `resultValue` is clamped to 0–10 — the caller is a 0–10 tap grid, but this
 * is a server action and the input is untrusted.
 *
 * Returns the week's session count *after* the write so the guided flow's
 * confirmation screen can show a real "1 of 2 this week" without a round trip
 * back to the server. A session only counts once every drill on the plan is
 * logged for the day, so this number moves on the last drill, not on each one.
 * Returns null when the caller isn't entitled to log.
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

  // Drills per session = the plan's prescribed drill count.
  const { data: plan } = await supabase
    .from("plans")
    .select("drill_ids")
    .eq("id", planId)
    .maybeSingle();
  const drillsPerSession = ((plan?.drill_ids as string[] | null) ?? []).length;

  return getWeeklyProgress(supabase, planId, drillsPerSession);
}
