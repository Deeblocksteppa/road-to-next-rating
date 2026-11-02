import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * The Privacy Policy's 30 days for results never saved to an account, including
 * the results saved with a sign-up that was never confirmed.
 *
 * The checks and deletes live in one transaction, in `public.retention_sweep`
 * (20261101120000_retention_sweep_function.sql): it locks each set, re-checks it
 * and deletes it bottom up, so a claim or a new child row either waits or makes
 * the set ineligible.
 *
 * Auth users are never deleted here. An unconfirmed email address stays in the
 * sign-in system until someone asks us to delete it, because a delete could race
 * someone confirming, with no way to make the two atomic.
 *
 * The real-delete switch is `RETENTION_ENABLED` in the route. A dry run returns
 * the same counts and deletes nothing.
 */

export interface RetentionSummary {
  dryRun: boolean;
  cutoff: string;
  /** Rows deleted, or that would be on a dry run. */
  assessments: number;
  diagnoses: number;
  plans: number;
  /** Sets kept because a row in them is claimed or has a drill session. */
  skippedPartlyClaimed: number;
  /** Old sets kept because a row below the top one is under 30 days old. */
  skippedRecentRows: number;
}

export async function runRetention(
  admin: SupabaseClient,
  { dryRun }: { dryRun: boolean }
): Promise<RetentionSummary> {
  const { data, error } = await admin.rpc("retention_sweep", { p_dry_run: dryRun });
  if (error) throw error;
  return { dryRun, ...(data as Omit<RetentionSummary, "dryRun">) };
}
