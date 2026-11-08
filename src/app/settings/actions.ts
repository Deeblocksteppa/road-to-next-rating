"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { type CancelOutcome, closeBilling, setCancelAtPeriodEnd } from "@/lib/billing";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/** Persists the re-test email reminder toggle. */
export async function setRetestReminder(enabled: boolean) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/settings");

  const { error } = await supabase
    .from("profiles")
    .update({ retest_reminder_enabled: enabled })
    .eq("id", user.id);
  if (error) throw error;

  revalidatePath("/settings");
}

/** Persists the daily drill reminder toggle (independent of re-test reminders). */
export async function setDrillReminder(enabled: boolean) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/settings");

  const { error } = await supabase
    .from("profiles")
    .update({ drill_reminder_enabled: enabled })
    .eq("id", user.id);
  if (error) throw error;

  revalidatePath("/settings");
}

export type CancelResult =
  /**
   * Stripe now says what was asked, or already did. `ended` when the
   * subscription had already ended in Stripe: the profile is free now and
   * nothing was sent to Stripe.
   */
  | { ok: true; ended?: true }
  | { error: string };

/**
 * Cancels the real Stripe subscription at period end — the user keeps the
 * access they've already paid for until `renews_at`, then Stripe sends
 * `customer.subscription.deleted` and the webhook drops them to free.
 *
 * This never decides `subscription_status` itself. The local write mirrors the
 * subscription Stripe just returned (still active, now with
 * `cancel_at_period_end`), so the UI can say "cancels Apr 2027" without
 * claiming the subscription is already gone.
 */
export async function cancelSubscription(): Promise<CancelResult> {
  return setCancel(true);
}

/**
 * Undo a scheduled cancellation while the period is still running. Stripe is
 * the one that flips the flag back; we mirror its response. A subscription
 * that has fully ended can't be resumed in Stripe: that comes back as `ended`.
 */
export async function resumeSubscription(): Promise<CancelResult> {
  return setCancel(false);
}

/**
 * Cancel and resume share one path, `setCancelAtPeriodEnd` in `billing.ts`: it
 * reads the profile, re-reads the subscription from Stripe (the profile can be
 * stale: a webhook that never arrived, or arrived out of order), sends the
 * change only if Stripe doesn't have it yet, and writes compare-and-set. The id
 * is checked against the subscription's own metadata, so a rewritten profile
 * row can't point this at someone else's billing. A write that loses to a
 * newer one twice shows the profile as it is now (`ok`, the page re-renders).
 */
async function setCancel(cancelAtPeriodEnd: boolean): Promise<CancelResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/settings");

  let outcome: CancelOutcome;
  try {
    outcome = await setCancelAtPeriodEnd(user.id, user.email ?? null, cancelAtPeriodEnd);
  } catch (err) {
    console.error(cancelAtPeriodEnd ? "cancelSubscription failed" : "resumeSubscription failed", err);
    // Never the error's own text: it can be raw Stripe or database output.
    return {
      error: cancelAtPeriodEnd
        ? "Couldn't cancel right now. Please try again."
        : "Couldn't resume. Please try again.",
    };
  }

  if (outcome === "no_subscription") {
    return {
      error: cancelAtPeriodEnd
        ? "We couldn't find a Stripe subscription on your account. Contact support and we'll sort it out."
        : "No Stripe subscription found on your account.",
    };
  }
  if (outcome === "not_owned") {
    return {
      error:
        "We couldn't match that subscription to your account, so nothing was changed. Email support@roadtonextrating.com and we'll sort it out.",
    };
  }
  if (outcome === "inactive") {
    // Nothing gives access, but a subscription of theirs could still charge
    // (incomplete or paused): not something to settle with a button.
    return {
      error:
        "Your subscription isn't active in Stripe right now. Email support@roadtonextrating.com and we'll sort it out.",
    };
  }

  revalidatePath("/settings");
  revalidatePath("/settings/manage");

  return outcome === "ended" ? { ok: true, ended: true } : { ok: true };
}

export type DeleteAccountResult = { ok: true } | { error: string };

/**
 * Permanently deletes the caller's account. On success the client clears this
 * device's stored result and goes to /login, because a server action can't
 * reach browser storage.
 *
 * What goes, and why nothing is orphaned: deleting the `auth.users` row
 * cascades to `profiles` (its primary key references auth.users ON DELETE
 * CASCADE), and every app table hangs off `profiles` the same way —
 * `assessments`, `diagnoses`, `plans` and `drill_sessions` all carry
 * `user_id … references profiles (id) on delete cascade`. The child links
 * cascade too (diagnoses → assessments, plans → diagnoses, drill_sessions →
 * plans), so there is no ordering problem. Those five are every table in the
 * schema. Anonymous funnel rows that were never claimed have a null `user_id`
 * and were never this user's, so they are untouched.
 *
 * What does not go: the Stripe Customer and its invoices stay in Stripe —
 * billing records have to outlive the account. Everything that could charge
 * the player is ended FIRST (`closeBilling`), and the deletion is aborted if
 * that fails: a deleted user still being billed is the one outcome worse than
 * a failed delete.
 *
 * The id deleted is always the verified session's own. Nothing from the
 * client chooses it; `confirmation` only re-checks the typed word.
 */
export async function deleteAccount(confirmation: string): Promise<DeleteAccountResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/settings/delete");

  if (confirmation.trim().toUpperCase() !== "DELETE") {
    return { error: "Type DELETE to confirm." };
  }

  let subscriptionCancelled = false;

  try {
    // Read failures stop here: an empty read would skip the ids on the profile.
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("email, stripe_subscription_id, stripe_customer_id")
      .eq("id", user.id)
      .maybeSingle();
    if (profileError) throw profileError;

    const billing = await closeBilling(user.id, {
      email: user.email ?? profile?.email ?? null,
      subscriptionId: profile?.stripe_subscription_id ?? null,
      customerId: profile?.stripe_customer_id ?? null,
    });

    if (billing.outcome === "not_owned") {
      return {
        error:
          "We couldn't match the subscription on your account, so nothing was changed. Email support@roadtonextrating.com and we'll sort it out.",
      };
    }
    if (billing.outcome === "unreachable") {
      return {
        error:
          "We couldn't reach billing, so nothing was changed. Try again, or email support@roadtonextrating.com.",
      };
    }
    if (billing.outcome === "partial") {
      return {
        error:
          "We couldn't finish cancelling your billing, so your account wasn't deleted. Email support@roadtonextrating.com and we'll sort it out.",
      };
    }
    subscriptionCancelled = billing.cancelled > 0;

    const { error } = await createAdminClient().auth.admin.deleteUser(user.id);
    if (error) throw error;
  } catch (err) {
    console.error("deleteAccount failed", err);
    // Say only what is true: the data is still here either way, but if Stripe
    // had already confirmed the cancellation, that part did happen.
    return {
      error: subscriptionCancelled
        ? "We couldn't finish deleting your account. Your data is still here, but your subscription has been cancelled. Please try again in a minute."
        : "We couldn't delete your account just now, and nothing was changed. Please try again in a minute.",
    };
  }

  // The user no longer exists, so this can only clear the local cookie; a
  // failure here changes nothing that matters.
  try {
    await supabase.auth.signOut();
  } catch {
    /* ignore */
  }

  revalidatePath("/", "layout");
  return { ok: true };
}
