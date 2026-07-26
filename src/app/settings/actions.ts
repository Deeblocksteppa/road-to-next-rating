"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getStripe, periodEndISO } from "@/lib/stripe";
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
 * This deliberately does NOT write `subscription_status` itself. The only
 * local write is the `cancel_at_period_end` flag Stripe just returned to us,
 * so the UI can say "cancels Apr 2027" without claiming the subscription is
 * already gone. Everything else waits for Stripe to confirm.
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

    const subscription = await getStripe().subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });

    // Reflect only what Stripe confirmed in this response.
    await supabase
      .from("profiles")
      .update({
        cancel_at_period_end: subscription.cancel_at_period_end,
        renews_at: periodEndISO(subscription),
      })
      .eq("id", user.id);
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

    const subscription = await getStripe().subscriptions.update(subscriptionId, {
      cancel_at_period_end: false,
    });

    await supabase
      .from("profiles")
      .update({
        cancel_at_period_end: subscription.cancel_at_period_end,
        renews_at: periodEndISO(subscription),
      })
      .eq("id", user.id);
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
