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

export async function isRetestOpen(supabase: SupabaseClient, userId: string): Promise<boolean> {
  return (await openRetestPlan(supabase, userId)) !== null;
}
