"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { retrieveOwnedSubscription, syncSubscription } from "@/lib/billing";
import { getStripe } from "@/lib/stripe";
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

export type CancelResult = { ok: true } | { error: string };

/**
 * Cancels the real Stripe subscription at period end — the user keeps the
 * access they've already paid for until `renews_at`, then Stripe sends
 * `customer.subscription.deleted` and the webhook drops them to free.
 *
 * This never decides `subscription_status` itself. The local write mirrors the
 * subscription Stripe just returned (still active, now with
 * `cancel_at_period_end`), so the UI can say "cancels Apr 2027" without
 * claiming the subscription is already gone. The id is checked against the
 * subscription's own metadata first, so a rewritten profile row can't point
 * this at someone else's billing.
 */
export async function cancelSubscription(): Promise<CancelResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/settings");

  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_subscription_id")
      .eq("id", user.id)
      .maybeSingle();

    const subscriptionId = profile?.stripe_subscription_id;
    if (!subscriptionId) {
      return {
        error:
          "We couldn't find a Stripe subscription on your account. Contact support and we'll sort it out.",
      };
    }

    if (!(await retrieveOwnedSubscription(user.id, subscriptionId))) {
      return {
        error:
          "We couldn't match that subscription to your account, so nothing was changed. Email support@roadtonextrating.com and we'll sort it out.",
      };
    }

    const subscription = await getStripe().subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });

    // Reflect only what Stripe confirmed in this response (service role:
    // players can't write billing columns).
    await syncSubscription(user.id, subscription);
  } catch (err) {
    console.error("cancelSubscription failed", err);
    return {
      error:
        err instanceof Error
          ? err.message
          : "Couldn't cancel right now. Please try again.",
    };
  }

  revalidatePath("/settings");
  revalidatePath("/settings/manage");

  return { ok: true };
}

/**
 * Undo a scheduled cancellation while the period is still running. Stripe is
 * the one that flips the flag back; we mirror its response.
 */
export async function resumeSubscription(): Promise<CancelResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/settings");

  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_subscription_id")
      .eq("id", user.id)
      .maybeSingle();

    const subscriptionId = profile?.stripe_subscription_id;
    if (!subscriptionId) {
      return { error: "No Stripe subscription found on your account." };
    }

    if (!(await retrieveOwnedSubscription(user.id, subscriptionId))) {
      return {
        error:
          "We couldn't match that subscription to your account, so nothing was changed. Email support@roadtonextrating.com and we'll sort it out.",
      };
    }

    const subscription = await getStripe().subscriptions.update(subscriptionId, {
      cancel_at_period_end: false,
    });

    await syncSubscription(user.id, subscription);
  } catch (err) {
    console.error("resumeSubscription failed", err);
    return {
      error:
        err instanceof Error ? err.message : "Couldn't resume. Please try again.",
    };
  }

  revalidatePath("/settings");
  revalidatePath("/settings/manage");

  return { ok: true };
}

export type DeleteAccountResult = { error: string } | undefined;

/**
 * Permanently deletes the caller's account.
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
 * billing records have to outlive the account. A live subscription is
 * cancelled outright FIRST, and the deletion is aborted if that fails: a
 * deleted user still being billed is the one outcome worse than a failed
 * delete.
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
    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_subscription_id, subscription_status")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.stripe_subscription_id) {
      try {
        const owned = await retrieveOwnedSubscription(
          user.id,
          profile.stripe_subscription_id
        );
        // Not theirs: cancel nothing and delete nothing. Their own billing may
        // still be live under another id, so a deletion here could leave a
        // deleted user being charged.
        if (!owned) {
          return {
            error:
              "We couldn't match the subscription on your account, so nothing was changed. Email support@roadtonextrating.com and we'll sort it out.",
          };
        }
        if (owned.status !== "canceled") {
          await getStripe().subscriptions.cancel(owned.id);
          subscriptionCancelled = true;
        }
      } catch (err) {
        // Already gone in Stripe is fine; anything else stops the deletion.
        const code = (err as { code?: string } | null)?.code;
        if (code !== "resource_missing") throw err;
      }
    }

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
  redirect("/login?notice=deleted");
}
