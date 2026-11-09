import type { SupabaseClient } from "@supabase/supabase-js";

import { getPlanTimeline } from "@/lib/plan-timeline";

/**
 * The player's current plan, when its re-test is open: the same plan (newest
 * by created_at) and the same day count Home, Plan and Progress use to show
 * it. Returns it (id and created_at), or null when closed. No plan, or a plan
 * with no retest_date, is closed.
 *
 * The /retest page redirects on this and `submitRetest` refuses on it, so an
 * early re-test can't be taken by typing the URL or calling the action. The
 * plan is the re-test's source (`plans.source_plan_id` on the plan it
 * creates).
 */
export async function openRetestPlan(
  supabase: SupabaseClient,
  userId: string
): Promise<{ id: string; created_at: string } | null> {
  const { data: plan, error } = await supabase
    .from("plans")
    .select("id, retest_date, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!plan?.retest_date || !plan.created_at) return null;
  return getPlanTimeline(plan.created_at, plan.retest_date).daysUntilRetest <= 0
    ? { id: plan.id, created_at: plan.created_at }
    : null;
}

/**
 * Whether the player has finished a re-test: they own a plan a re-test made
 * (`source_plan_id` set). `saveRetest` writes that plan last, so a re-test
 * counts once it is complete, never while open or half saved. Counting
 * diagnoses doesn't work: a signed-in retake on /start adds one with no
 * re-test.
 *
 * Decides what Progress and Settings offer: nothing is sold before the first
 * re-test. Server only. Throws on error rather than guessing either way,
 * including on a database without migration 20261029120000 (no
 * `source_plan_id`), which `saveRetest` tolerates but this can't answer.
 */
export async function hasCompletedRetest(supabase: SupabaseClient, userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("plans")
    .select("id")
    .eq("user_id", userId)
    .not("source_plan_id", "is", null)
    .limit(1);
  if (error) throw error;
  return (data?.length ?? 0) > 0;
}

export async function isRetestOpen(supabase: SupabaseClient, userId: string): Promise<boolean> {
  return (await openRetestPlan(supabase, userId)) !== null;
}
