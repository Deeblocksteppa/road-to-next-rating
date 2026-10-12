import type { SupabaseClient, User } from "@supabase/supabase-js";

const PENDING_KEYS = {
  p_assessment_id: "pending_assessment_id",
  p_diagnosis_id: "pending_diagnosis_id",
  p_plan_id: "pending_plan_id",
} as const;

/**
 * Attach the diagnosis and plan a player made before signing up.
 *
 * Those rows are saved unclaimed, and the Save Gate sends their ids with the
 * sign-up as user metadata. This claims them for the signed-in user through
 * `claim_anonymous_records`. It runs wherever a session starts (the emailed
 * link at /auth/confirm, the older /auth/callback, and password sign-in),
 * so the plan follows the account onto whichever device signs in first. It
 * used to run only at /auth/confirm, which left one path uncovered: confirm
 * through an old-style link, sign in on a second device, and Home was empty
 * until the original browser was opened again.
 *
 * Safe to run any number of times:
 *   - with no ids in the metadata it returns without touching the database;
 *   - the RPC only assigns rows that are still unclaimed, so a repeat, or a
 *     claim the original browser already made, changes nothing;
 *   - after a successful claim the ids are cleared from the metadata, so
 *     later sign-ins skip the call entirely.
 *
 * Returns true when a claim was made on this call. It never throws: a
 * failure here must not block signing in, and /home's own claim from the
 * browser is still there as the fallback.
 */
export async function claimSignupRecords(
  supabase: SupabaseClient,
  user: User | null | undefined
): Promise<boolean> {
  const meta = user?.user_metadata ?? {};
  const id = (key: string) => (typeof meta[key] === "string" && meta[key] ? (meta[key] as string) : null);
  const ids = {
    p_assessment_id: id(PENDING_KEYS.p_assessment_id),
    p_diagnosis_id: id(PENDING_KEYS.p_diagnosis_id),
    p_plan_id: id(PENDING_KEYS.p_plan_id),
  };
  if (!ids.p_assessment_id && !ids.p_diagnosis_id && !ids.p_plan_id) return false;

  try {
    const { error } = await supabase.rpc("claim_anonymous_records", ids);
    if (error) {
      console.error("claimSignupRecords: claim failed", error.code);
      return false;
    }

    // The ids have done their job. Left in place they are harmless (see
    // above), so a failure to clear them is logged and ignored.
    const { error: clearError } = await supabase.auth.updateUser({
      data: {
        [PENDING_KEYS.p_assessment_id]: null,
        [PENDING_KEYS.p_diagnosis_id]: null,
        [PENDING_KEYS.p_plan_id]: null,
      },
    });
    if (clearError) console.error("claimSignupRecords: could not clear ids", clearError.code);

    return true;
  } catch (err) {
    console.error("claimSignupRecords: unexpected failure", err);
    return false;
  }
}
