import type { SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";

import { createAdminClient } from "@/lib/supabase/admin";
import {
  getStripe,
  idOf,
  periodEndISO,
  planFromSubscription,
  statusFromStripe,
} from "@/lib/stripe";

/**
 * The one place Stripe subscription state gets written into `profiles`.
 *
 * Called from the webhook (the source of truth), from the post-checkout
 * success page (a verified read-back, so a slow or not-yet-running webhook
 * doesn't leave a paying user staring at a locked screen), and from Settings'
 * cancel, resume and page loads (`refreshOwnedSubscription`). Every path writes the same fields from the same Stripe
 * object, so running more than one is harmless.
 *
 * Uses the service-role client: webhook requests carry no user session, and
 * players may only update their two reminder columns
 * (20261029180000_profiles_column_grants.sql).
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

/** Stripe's "no such object". Ids left over from the old Stripe account come back this way. */
function isMissing(err: unknown): boolean {
  return (err as { code?: string } | null)?.code === "resource_missing";
}

/**
 * A `resource_missing` that is really a key mix-up: the object exists in the
 * other mode (a live id read with a test key, or the reverse). Stripe says so in
 * the message. Nothing about the player's billing is known from it.
 */
function isOtherMode(err: unknown): boolean {
  const message = (err as { message?: string } | null)?.message ?? "";
  return /similar object exists in (live|test) mode/i.test(message);
}

async function orWhenMissing<T>(call: Promise<T>, fallback: T): Promise<T> {
  try {
    return await call;
  } catch (err) {
    if (isMissing(err)) return fallback;
    throw err;
  }
}

/**
 * Every status except these can still charge: `incomplete` if its payment
 * completes, `paused` if it resumes.
 */
function hasEnded(sub: Stripe.Subscription): boolean {
  return sub.status === "canceled" || sub.status === "incomplete_expired";
}

function ownedBy(userId: string, metadata: Stripe.Metadata | null | undefined): boolean {
  return metadata?.supabase_user_id === userId;
}

export type BillingIds = {
  email: string | null;
  subscriptionId: string | null;
  customerId: string | null;
};

/**
 * A player's subscriptions and customers, however Stripe knows them. The id on
 * the profile can be empty or out of date (a checkout whose profile write
 * failed, two tabs making two subscriptions). Search is eventually consistent,
 * so a subscription minutes old may only show through its customer, which the
 * email lookup finds when the profile never got the customer id either.
 */
async function findBilling(stripe: Stripe, userId: string, ids: BillingIds) {
  const subscriptions = new Map<string, Stripe.Subscription>();
  const customerIds = new Set<string>(ids.customerId ? [ids.customerId] : []);

  const keep = (sub: Stripe.Subscription) => {
    subscriptions.set(sub.id, sub);
    const customer = idOf(sub.customer);
    if (customer && ownedBy(userId, sub.metadata)) customerIds.add(customer);
  };

  if (ids.subscriptionId) {
    const sub = await orWhenMissing(stripe.subscriptions.retrieve(ids.subscriptionId), null);
    if (sub) keep(sub);
  }

  const searched = await stripe.subscriptions
    .search({ query: `metadata['supabase_user_id']:'${userId}'`, limit: 100 })
    .autoPagingToArray({ limit: 1000 });
  searched.forEach(keep);

  if (ids.email) {
    const customers = await stripe.customers
      .list({ email: ids.email, limit: 100 })
      .autoPagingToArray({ limit: 1000 });
    for (const customer of customers) {
      if (ownedBy(userId, customer.metadata)) customerIds.add(customer.id);
    }
  }

  for (const customer of Array.from(customerIds)) {
    const listed = await orWhenMissing(
      stripe.subscriptions
        .list({ customer, status: "all", limit: 100 })
        .autoPagingToArray({ limit: 1000 }),
      []
    );
    listed.forEach(keep);
  }

  return {
    subscriptions: Array.from(subscriptions.values()),
    customerIds: Array.from(customerIds),
  };
}

/**
 * Expire this player's open Checkout Sessions, so a tab left open can't start a
 * subscription after the account is gone. A session that finished or expired
 * meanwhile can't be expired, and that's fine: the second look in `closeBilling`
 * picks up anything it created.
 */
async function expireOpenCheckouts(stripe: Stripe, userId: string, customerIds: string[]) {
  for (const customer of customerIds) {
    const sessions = await orWhenMissing(
      stripe.checkout.sessions
        .list({ customer, status: "open", limit: 100 })
        .autoPagingToArray({ limit: 1000 }),
      []
    );
    for (const session of sessions) {
      if (!ownedBy(userId, session.metadata)) continue;
      try {
        await stripe.checkout.sessions.expire(session.id);
      } catch (err) {
        const now = await stripe.checkout.sessions.retrieve(session.id);
        if (now.status === "open") throw err;
      }
    }
  }
}

export type CloseBillingResult =
  /** Nothing can charge this player now. `cancelled` is how many this call ended. */
  | { outcome: "closed"; cancelled: number }
  /** A live subscription isn't theirs. Nothing was cancelled. */
  | { outcome: "not_owned" }
  /** Stripe failed before anything was cancelled. */
  | { outcome: "unreachable" }
  /** At least one subscription was cancelled, then another failed. */
  | { outcome: "partial" };

/**
 * Ends everything that could charge a player, before their account goes. All
 * the finding and checking comes first, so a refusal changes nothing. Nothing
 * here is refunded, and the Stripe Customer and its invoices stay.
 */
export async function closeBilling(
  userId: string,
  ids: BillingIds,
  stripe: Stripe = getStripe()
): Promise<CloseBillingResult> {
  const notOwned = (subs: Stripe.Subscription[]) =>
    subs.filter((sub) => !hasEnded(sub) && !ownedBy(userId, sub.metadata));

  let live: Stripe.Subscription[];
  try {
    const found = await findBilling(stripe, userId, ids);
    // Not theirs: a deletion here could leave a deleted user being charged
    // under an id we can't see, and cancelling could hit someone else's billing.
    if (notOwned(found.subscriptions).length) {
      console.error("closeBilling: subscription owner mismatch, refusing", {
        userId,
        subscriptions: notOwned(found.subscriptions).map((sub) => sub.id),
      });
      return { outcome: "not_owned" };
    }

    await expireOpenCheckouts(stripe, userId, found.customerIds);

    // A checkout that finished before it could be expired is on the customer now.
    const again = await findBilling(stripe, userId, ids);
    if (notOwned(again.subscriptions).length) return { outcome: "not_owned" };
    live = again.subscriptions.filter((sub) => !hasEnded(sub));
  } catch (err) {
    console.error("closeBilling: couldn't read billing", err);
    return { outcome: "unreachable" };
  }

  let cancelled = 0;
  for (const sub of live) {
    try {
      await stripe.subscriptions.cancel(sub.id);
      cancelled += 1;
    } catch (err) {
      // Already gone in Stripe is fine; anything else stops the deletion.
      if (isMissing(err)) continue;
      console.error("closeBilling: cancel failed", { userId, subscription: sub.id, cancelled }, err);
      return { outcome: cancelled ? "partial" : "unreachable" };
    }
  }

  return { outcome: "closed", cancelled };
}

/**
 * The player's newest subscription that gives access (active, trialing,
 * past_due, unpaid), found the way `closeBilling` finds them. Null when there
 * is none.
 */
async function findLiveOwned(
  stripe: Stripe,
  userId: string,
  ids: BillingIds
): Promise<Stripe.Subscription | null> {
  const found = await findBilling(stripe, userId, ids);
  const live = found.subscriptions
    .filter(
      (sub) =>
        ownedBy(userId, sub.metadata) &&
        !hasEnded(sub) &&
        statusFromStripe(sub.status) === "active"
    )
    .sort((a, b) => b.created - a.created);
  return live[0] ?? null;
}

export type RefreshResult =
  /** The profile's own subscription, theirs and not ended. Profile synced to it. */
  | { kind: "live"; sub: Stripe.Subscription }
  /**
   * The profile's subscription had ended or isn't in Stripe, and another live
   * one of theirs exists. Profile synced to that one.
   */
  | { kind: "replaced"; sub: Stripe.Subscription }
  /**
   * Nothing of theirs gives access. Profile now free. `endedAt` is when the
   * profile's subscription ended, when Stripe has it (not for a missing one).
   */
  | { kind: "ended"; endedAt: string | null }
  /** The subscription's metadata names someone else. Nothing written. */
  | { kind: "not_owned" };

/**
 * Re-read the profile's subscription from Stripe and mirror what is true now.
 * For Settings' cancel and resume, and for the Settings screens on load, so a
 * missed or out-of-order webhook can't leave a dead subscription with a
 * Cancel or Keep button on it.
 *
 * Every Stripe read happens before any write: if Stripe fails, this throws and
 * the profile is unchanged.
 *
 * - Ownership: the id comes from the player's own profile row, which they could
 *   once rewrite through the REST API. Checkout stamps `supabase_user_id` onto
 *   every subscription's metadata, so a mismatch (or no metadata) means the id
 *   isn't theirs: refuse and log, ended or not.
 * - Ended (`canceled`, `incomplete_expired`) or missing (`resource_missing`):
 *   before dropping the player to free, look for another live subscription of
 *   theirs (two checkouts, or a profile that never got the new id). If there is
 *   one, the profile moves to it.
 * - Missing can't be checked for ownership, but the only write is to the
 *   caller's own row. A missing id that exists in the other mode is a key
 *   mix-up, not a missing subscription: logged and thrown, nothing written.
 */
export async function refreshOwnedSubscription(
  userId: string,
  ids: BillingIds & { subscriptionId: string },
  stripe: Stripe = getStripe()
): Promise<RefreshResult> {
  let stored: Stripe.Subscription | null;
  try {
    stored = await stripe.subscriptions.retrieve(ids.subscriptionId);
  } catch (err) {
    if (isMissing(err) && isOtherMode(err)) {
      console.error("STRIPE MODE MISMATCH: subscription exists in the other mode, nothing changed", {
        userId,
        subscription: ids.subscriptionId,
      });
    }
    if (!isMissing(err) || isOtherMode(err)) throw err;
    stored = null;
  }

  if (stored && !ownedBy(userId, stored.metadata)) {
    console.error("Subscription owner mismatch, refusing", {
      userId,
      subscriptionId: stored.id,
      metadataUserId: stored.metadata?.supabase_user_id ?? null,
    });
    return { kind: "not_owned" };
  }

  if (stored && !hasEnded(stored)) {
    await syncSubscription(userId, stored);
    return { kind: "live", sub: stored };
  }

  const replacement = await findLiveOwned(stripe, userId, {
    email: ids.email,
    subscriptionId: null,
    customerId: ids.customerId ?? idOf(stored?.customer),
  });
  if (replacement) {
    await syncSubscription(userId, replacement);
    return { kind: "replaced", sub: replacement };
  }

  if (stored) {
    await syncSubscription(userId, stored);
  } else {
    console.error("SUBSCRIPTION MISSING: profile's subscription isn't in Stripe, moved to free", {
      userId,
      subscription: ids.subscriptionId,
    });
    await clearSubscription(userId);
  }
  return {
    kind: "ended",
    endedAt: stored?.ended_at ? new Date(stored.ended_at * 1000).toISOString() : null,
  };
}

export type HealResult = RefreshResult["kind"] | "skipped" | "failed";

/**
 * `refreshOwnedSubscription` for a page load. Runs only for a paid profile
 * (and, with `onlyIfPastRenewal`, only once its renewal date has passed, which
 * is when a missed webhook shows). Never throws: on any failure the page
 * renders what is stored, and nothing was written.
 */
export async function healSubscription(
  userId: string,
  email: string | null,
  opts: { onlyIfPastRenewal: boolean }
): Promise<HealResult> {
  try {
    const { data: profile, error } = await createAdminClient()
      .from("profiles")
      .select("subscription_status, renews_at, stripe_subscription_id, stripe_customer_id")
      .eq("id", userId)
      .maybeSingle();
    if (error) throw error;
    if (profile?.subscription_status !== "active" || !profile.stripe_subscription_id) {
      return "skipped";
    }
    if (
      opts.onlyIfPastRenewal &&
      (!profile.renews_at || new Date(profile.renews_at).getTime() > Date.now())
    ) {
      return "skipped";
    }

    const result = await refreshOwnedSubscription(userId, {
      subscriptionId: profile.stripe_subscription_id,
      customerId: profile.stripe_customer_id ?? null,
      email,
    });
    return result.kind;
  } catch (err) {
    console.error("healSubscription failed, showing the stored state", { userId }, err);
    return "failed";
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUserId(value: string): boolean {
  return UUID.test(value);
}

/**
 * True only when the database and Auth both answered, and neither has this
 * user. Anything less definite throws, so the webhook returns 500 and Stripe
 * retries: an outage must never look like a deleted account, because the caller
 * refunds on this. An id that isn't a uuid isn't one of ours, so it isn't a
 * deleted account.
 */
export async function accountIsGone(
  userId: string,
  admin: SupabaseClient = createAdminClient()
): Promise<boolean> {
  if (!isUserId(userId)) return false;

  const { data: profile, error } = await admin
    .from("profiles")
    .select("id")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  if (profile) return false;

  const { data, error: authError } = await admin.auth.admin.getUserById(userId);
  if (authError) {
    if (authError.status === 404 && authError.code === "user_not_found") return true;
    throw authError;
  }
  if (!data.user) throw new Error("Auth returned neither a user nor an error");
  return false;
}

/**
 * Written onto the subscription by the same call that cancels it. It is how a
 * retried event knows the cancel was this backstop's, and so still owes the
 * refund. A subscription cancelled any other way (Settings, or `closeBilling` on
 * a normal account deletion) has no refund owed, even if its first event is
 * delivered late or resent by hand after the account is gone.
 */
export const ORPHANED_COMMENT = "Account no longer exists. Cancelled and refunded automatically.";

/**
 * The backstop for a checkout that finishes after its account was deleted, which
 * `closeBilling` can't see coming: cancel the subscription now and refund what it
 * took in full. Runs on two events that can arrive in either order, and on
 * retries. The first may come before the payment, so it cancels and finds nothing
 * to refund, and the other refunds. Stripe's idempotency key and
 * `charge_already_refunded` mean a repeat can't refund twice. Any failure throws,
 * so Stripe retries the event.
 */
export async function closeOrphanedSubscription(
  subscriptionId: string,
  userId: string,
  stripe: Stripe = getStripe()
): Promise<void> {
  let sub = await stripe.subscriptions.retrieve(subscriptionId);

  if (!hasEnded(sub)) {
    try {
      sub = await stripe.subscriptions.cancel(subscriptionId, {
        cancellation_details: { comment: ORPHANED_COMMENT },
      });
      console.error("ORPHANED CHECKOUT: subscription cancelled, account no longer exists", {
        userId,
        subscription: subscriptionId,
        customer: idOf(sub.customer),
      });
    } catch (err) {
      // The other event may have just cancelled it. If it's still live, retry.
      sub = await stripe.subscriptions.retrieve(subscriptionId);
      if (!hasEnded(sub)) throw err;
    }
  }

  if (sub.cancellation_details?.comment !== ORPHANED_COMMENT) {
    console.warn("Orphaned checkout: subscription ended some other way, no refund owed", {
      userId,
      subscription: subscriptionId,
      status: sub.status,
    });
    return;
  }

  const invoice = idOf(sub.latest_invoice);
  if (!invoice) return;

  const payments = await stripe.invoicePayments
    .list({ invoice, limit: 100 })
    .autoPagingToArray({ limit: 1000 });
  for (const { id, status, payment } of payments) {
    if (status !== "paid") continue;

    const paymentIntent = idOf(payment.payment_intent);
    const charge = idOf(payment.charge);
    const target = paymentIntent ?? charge;
    if (!target) throw new Error(`Invoice payment ${id} has nothing that can be refunded`);

    try {
      const refund = await stripe.refunds.create(
        paymentIntent ? { payment_intent: paymentIntent } : { charge: charge as string },
        { idempotencyKey: `orphaned-checkout-refund-${target}` }
      );
      console.error("ORPHANED CHECKOUT: payment refunded in full, account no longer exists", {
        userId,
        subscription: subscriptionId,
        invoice,
        payment: target,
        refund: refund.id,
        amount: refund.amount,
        currency: refund.currency,
      });
    } catch (err) {
      if ((err as { code?: string } | null)?.code !== "charge_already_refunded") throw err;
    }
  }
}

/**
 * The profile's current subscription when it is a different one from
 * `subscriptionId` and hasn't ended in Stripe. Null when the profile names none,
 * names this one, or names one that ended or isn't in Stripe.
 */
async function otherLiveSubscription(
  profileId: string,
  subscriptionId: string,
  stripe: Stripe
): Promise<string | null> {
  const { data, error } = await createAdminClient()
    .from("profiles")
    .select("stripe_subscription_id")
    .eq("id", profileId)
    .maybeSingle();
  if (error) throw error;

  const current = data?.stripe_subscription_id ?? null;
  if (!current || current === subscriptionId) return null;

  const sub = await orWhenMissing(stripe.subscriptions.retrieve(current), null);
  return sub && !hasEnded(sub) ? current : null;
}

export type WebhookOutcome =
  | "synced"
  | "cleared"
  | "skipped_no_profile"
  | "skipped_missing"
  | "skipped_other_live";

/**
 * `customer.subscription.updated`: renewal, plan change, or a cancellation
 * scheduled for period end.
 *
 * Writes the subscription as Stripe has it now, never the event's snapshot:
 * Stripe doesn't promise order, and a late or retried `updated` would
 * otherwise put a deleted subscription back to "active, cancels …".
 *
 * Only for the profile's current subscription: when the profile already names
 * a different one that is still live (a newer checkout), an event about the
 * old one changes nothing. A profile with no subscription, or one that ended,
 * takes this one. `checkout.session.completed` has no such check: a finished
 * checkout always sets its subscription.
 */
export async function applySubscriptionUpdated(
  event: Stripe.Subscription,
  stripe: Stripe = getStripe()
): Promise<WebhookOutcome> {
  const sub = await orWhenMissing(stripe.subscriptions.retrieve(event.id), null);
  if (!sub) {
    console.warn(`Subscription ${event.id} on update isn't in Stripe — skipping.`);
    return "skipped_missing";
  }

  const profileId = await findProfileId({
    metadataUserId: sub.metadata?.supabase_user_id,
    subscriptionId: sub.id,
    customerId: idOf(sub.customer),
  });
  if (!profileId) {
    // Can legitimately arrive before checkout.session.completed on a first
    // subscribe. That event will sync the same subscription moments later.
    console.warn(`No profile matched subscription ${sub.id} on update — skipping.`);
    return "skipped_no_profile";
  }

  const other = await otherLiveSubscription(profileId, sub.id, stripe);
  if (other) {
    console.warn(`Subscription ${sub.id} updated, but the profile is on live ${other} — left alone.`);
    return "skipped_other_live";
  }

  await syncSubscription(profileId, sub);
  return "synced";
}

/**
 * `customer.subscription.deleted`: back to the free tier, unless the profile
 * is already on a different subscription that is still live (an old one
 * ending after a new checkout must not drop a paying player).
 */
export async function applySubscriptionDeleted(
  sub: Stripe.Subscription,
  stripe: Stripe = getStripe()
): Promise<WebhookOutcome> {
  const profileId = await findProfileId({
    metadataUserId: sub.metadata?.supabase_user_id,
    subscriptionId: sub.id,
    customerId: idOf(sub.customer),
  });
  if (!profileId) {
    console.warn(`No profile matched subscription ${sub.id} on delete — skipping.`);
    return "skipped_no_profile";
  }

  const other = await otherLiveSubscription(profileId, sub.id, stripe);
  if (other) {
    console.warn(`Subscription ${sub.id} deleted, but the profile is on live ${other} — left alone.`);
    return "skipped_other_live";
  }

  await clearSubscription(profileId);
  return "cleared";
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
