import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * The Privacy Policy's 30 days: results never saved to an account, and
 * sign-ups never confirmed.
 *
 * The checks and deletes for results live in one transaction, in
 * `public.retention_sweep` (20261101120000_retention_sweep_function.sql): it
 * locks each set, re-checks it and deletes it bottom up, so a claim or a new
 * child row either waits or makes the set ineligible.
 *
 * Auth users can only go through the admin API, so that part stays here. The
 * function returns who is still eligible, and each one is read fresh just
 * before the delete.
 *
 * The real-delete switch is `RETENTION_ENABLED` in the route. A dry run returns
 * the same counts and deletes nothing.
 */

/** A confirmation email newer than this has a live link: leave the sign-up alone. */
const CONFIRMATION_GRACE_MS = 2 * 24 * 60 * 60 * 1000;

export interface RetentionSummary {
  dryRun: boolean;
  cutoff: string;
  /** Rows deleted, or that would be on a dry run. */
  assessments: number;
  diagnoses: number;
  plans: number;
  unconfirmedUsers: number;
  /** Sets kept because a row in them is claimed or has a drill session. */
  skippedPartlyClaimed: number;
  /** Old sets kept because a row below the top one is under 30 days old. */
  skippedRecentRows: number;
  /** Unconfirmed users kept: a sign-in, a recent email, a Stripe customer or a claimed row. */
  skippedUsers: number;
  errors: number;
}

interface SweepResult {
  cutoff: string;
  assessments: number;
  diagnoses: number;
  plans: number;
  skippedPartlyClaimed: number;
  skippedRecentRows: number;
  skippedUsers: number;
  userIds: string[];
}

/** Read fresh: someone can confirm, or ask for a new link, on day 31. */
async function stillEligible(admin: SupabaseClient, userId: string): Promise<boolean> {
  const { data, error } = await admin.auth.admin.getUserById(userId);
  if (error) throw error;
  const user = data.user;
  if (user.email_confirmed_at || user.confirmed_at || user.last_sign_in_at) return false;
  if (
    !user.confirmation_sent_at ||
    Date.now() - new Date(user.confirmation_sent_at).getTime() < CONFIRMATION_GRACE_MS
  ) {
    return false;
  }

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", userId)
    .maybeSingle();
  if (profileError) throw profileError;
  if (profile?.stripe_customer_id) return false;

  for (const table of ["assessments", "diagnoses", "plans", "drill_sessions"]) {
    const { data: owned, error: ownedError } = await admin
      .from(table)
      .select("id")
      .eq("user_id", userId)
      .limit(1);
    if (ownedError) throw ownedError;
    if (owned?.length) return false;
  }

  return true;
}

export async function runRetention(
  admin: SupabaseClient,
  { dryRun }: { dryRun: boolean }
): Promise<RetentionSummary> {
  const { data, error } = await admin.rpc("retention_sweep", { p_dry_run: dryRun });
  if (error) throw error;
  const { userIds, ...swept } = data as SweepResult;

  const summary: RetentionSummary = {
    dryRun,
    ...swept,
    unconfirmedUsers: userIds.length,
    errors: 0,
  };
  if (dryRun) return summary;

  summary.unconfirmedUsers = 0;
  for (const id of userIds) {
    try {
      if (!(await stillEligible(admin, id))) {
        summary.skippedUsers++;
        continue;
      }
      const { error: deleteError } = await admin.auth.admin.deleteUser(id);
      if (deleteError) throw deleteError;
      summary.unconfirmedUsers++;
    } catch (err) {
      console.error(`retention: couldn't delete unconfirmed user ${id}`, err);
      summary.errors++;
    }
  }

  return summary;
}
