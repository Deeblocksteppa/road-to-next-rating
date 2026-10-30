import type { SupabaseClient } from "@supabase/supabase-js";

import { getPlanTimeline } from "@/lib/plan-timeline";

/**
 * Whether the player's current plan has an open re-test: the same plan
 * (newest by created_at) and the same day count Home, Plan and Progress use to
 * show it. No plan, or a plan with no retest_date, is closed.
 *
 * The /retest page redirects on this and `submitRetest` refuses on it, so an
 * early re-test can't be taken by typing the URL or calling the action.
 */
export async function isRetestOpen(supabase: SupabaseClient, userId: string): Promise<boolean> {
  const { data: plan, error } = await supabase
    .from("plans")
    .select("retest_date, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!plan?.retest_date || !plan.created_at) return false;
  return getPlanTimeline(plan.created_at, plan.retest_date).daysUntilRetest <= 0;
}
