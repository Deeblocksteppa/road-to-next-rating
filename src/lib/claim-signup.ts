import type { SupabaseClient, User } from "@supabase/supabase-js";

import { resultRowsStatus } from "@/lib/result-exists";

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
 *   - once every named row is the caller's, the ids are cleared from the
 *     metadata, so later sign-ins skip the call entirely.
 *
 * Rows that were deleted (30 days unclaimed) come back from the check as
 * "expired", with the ids cleared. If the check can't answer, or the RPC says
 * the caller holds fewer rows than were named, the ids stay for the next
 * sign-in: only the full set counts as claimed.
 *
 * It never throws: a failure here must not block signing in, and /home's own
 * claim from the browser is still there as the fallback.
 */
export async function claimSignupRecords(
  supabase: SupabaseClient,
  user: User | null | undefined
): Promise<"none" | "claimed" | "expired"> {
  const meta = user?.user_metadata ?? {};
  const id = (key: string) => (typeof meta[key] === "string" && meta[key] ? (meta[key] as string) : null);
  const ids = {
    p_assessment_id: id(PENDING_KEYS.p_assessment_id),
    p_diagnosis_id: id(PENDING_KEYS.p_diagnosis_id),
    p_plan_id: id(PENDING_KEYS.p_plan_id),
  };
  if (!ids.p_assessment_id && !ids.p_diagnosis_id && !ids.p_plan_id) return "none";

  // The ids have done their job. Left in place they are harmless (see above),
  // so a failure to clear them is logged and ignored.
  const clearIds = async () => {
    const { error: clearError } = await supabase.auth.updateUser({
      data: {
        [PENDING_KEYS.p_assessment_id]: null,
        [PENDING_KEYS.p_diagnosis_id]: null,
        [PENDING_KEYS.p_plan_id]: null,
      },
    });
    if (clearError) console.error("claimSignupRecords: could not clear ids", clearError.code);
  };

  try {
    const status = await resultRowsStatus({
      assessment: ids.p_assessment_id,
      diagnosis: ids.p_diagnosis_id,
      plan: ids.p_plan_id,
    });
    if (status === "unknown") return "none";
    if (status === "expired") {
      await clearIds();
      return "expired";
    }

    const { data: held, error } = await supabase.rpc("claim_anonymous_records", ids);
    if (error) {
      console.error("claimSignupRecords: claim failed", error.code);
      return "none";
    }
    if (held !== Object.values(ids).filter(Boolean).length) {
      console.error("claimSignupRecords: claim incomplete", held);
      return "none";
    }

    await clearIds();
    return "claimed";
  } catch (err) {
    console.error("claimSignupRecords: unexpected failure", err);
    return "none";
  }
}
