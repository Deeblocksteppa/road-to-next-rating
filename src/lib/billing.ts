import type Stripe from "stripe";

import { createAdminClient } from "@/lib/supabase/admin";
import {
  idOf,
  periodEndISO,
  planFromSubscription,
  statusFromStripe,
} from "@/lib/stripe";

/**
 * The one place Stripe subscription state gets written into `profiles`.
 *
 * Called from the webhook (the source of truth) and from the post-checkout
 * success page (a verified read-back, so a slow or not-yet-running webhook
 * doesn't leave a paying user staring at a locked screen). Both paths write
 * the same fields from the same Stripe object, so running both is harmless.
 *
 * Uses the service-role client: webhook requests carry no user session, and
 * the `profiles: update own` RLS policy would reject the write.
 */

/** Resolve an incoming Stripe object back to a `profiles.id`. */
export async function findProfileId(opts: {
  metadataUserId?: string | null;
  subscriptionId?: string | null;
  customerId?: string | null;
}): Promise<string | null> {
  const supabase = createAdminClient();

  // Preferred: the id we attached ourselves at checkout. Still verified
  // against the table — never trust an id straight into an update filter.
  if (opts.metadataUserId) {
    const { data } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", opts.metadataUserId)
      .maybeSingle();
    if (data?.id) return data.id;
  }

  if (opts.subscriptionId) {
    const { data } = await supabase
      .from("profiles")
      .select("id")
      .eq("stripe_subscription_id", opts.subscriptionId)
      .maybeSingle();
    if (data?.id) return data.id;
  }

  if (opts.customerId) {
    const { data } = await supabase
      .from("profiles")
      .select("id")
      .eq("stripe_customer_id", opts.customerId)
      .maybeSingle();
    if (data?.id) return data.id;
  }

  return null;
}

/**
 * Mirror a live Stripe subscription onto the profile.
 *
 * `cancel_at_period_end` is kept separate from status on purpose: a canceling
 * subscription is still 'active' until the period actually ends, because the
 * user paid for that time.
 */
export async function syncSubscription(
  profileId: string,
  sub: Stripe.Subscription
): Promise<void> {
  const supabase = createAdminClient();

  const status = statusFromStripe(sub.status);
  const isActive = status === "active";

  const { error } = await supabase
    .from("profiles")
    .update({
      subscription_status: status,
      plan_type: isActive ? planFromSubscription(sub) : null,
      renews_at: isActive ? periodEndISO(sub) : null,
      cancel_at_period_end: isActive ? sub.cancel_at_period_end : false,
      stripe_subscription_id: isActive ? sub.id : null,
      stripe_customer_id: idOf(sub.customer),
    })
    .eq("id", profileId);

  if (error) throw error;
}

/** Subscription ended for good — drop to the free tier. */
export async function clearSubscription(profileId: string): Promise<void> {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("profiles")
    .update({
      subscription_status: "free",
      plan_type: null,
      renews_at: null,
      cancel_at_period_end: false,
      stripe_subscription_id: null,
      // stripe_customer_id is deliberately kept: the same Customer should be
      // reused if they resubscribe, so their billing history stays in one place.
    })
    .eq("id", profileId);

  if (error) throw error;
}
