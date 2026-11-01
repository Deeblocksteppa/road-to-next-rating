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
 * cancel and resume. Every path writes the same fields from the same Stripe
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

/**
 * Fetch a subscription from Stripe only if Stripe says it belongs to `userId`.
 *
 * The id comes from the player's own profile row, which they could once
 * rewrite through the REST API. Checkout stamps `supabase_user_id` onto every
 * subscription's metadata, so a mismatch (or no metadata) means the id isn't
 * theirs: refuse and log rather than cancel or resume someone else's billing.
 * Returns null on a mismatch; Stripe errors (e.g. `resource_missing`) throw.
 */
export async function retrieveOwnedSubscription(
  userId: string,
  subscriptionId: string
): Promise<Stripe.Subscription | null> {
  const sub = await getStripe().subscriptions.retrieve(subscriptionId);
  const owner = sub.metadata?.supabase_user_id ?? null;
  if (owner !== userId) {
    console.error("Subscription owner mismatch, refusing", {
      userId,
      subscriptionId,
      metadataUserId: owner,
    });
    return null;
  }
  return sub;
}

/** Stripe's "no such object". Ids left over from the old Stripe account come back this way. */
function isMissing(err: unknown): boolean {
  return (err as { code?: string } | null)?.code === "resource_missing";
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

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * True only when the database and Auth both answered, and neither has this
 * user. A failed read throws, so the webhook returns 500 and Stripe retries: an
 * outage must never look like a deleted account, because the caller refunds on
 * this. An id that isn't a uuid isn't one of ours, so it isn't a deleted account.
 */
export async function accountIsGone(
  userId: string,
  admin: SupabaseClient = createAdminClient()
): Promise<boolean> {
  if (!UUID.test(userId)) return false;

  const { data: profile, error } = await admin
    .from("profiles")
    .select("id")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  if (profile) return false;

  const { data, error: authError } = await admin.auth.admin.getUserById(userId);
  if (authError) {
    if (authError.status === 404) return true;
    throw authError;
  }
  return !data.user;
}

/**
 * Written onto the subscription by the same call that cancels it. It is how a
 * retried event knows the cancel was this backstop's, and so still owes the
 * refund. A subscription cancelled any other way (Settings, or `closeBilling` on
 * a normal account deletion) has no refund owed, even if its first event is
 * delivered late or resent by hand after the account is gone.
 */
const ORPHANED_COMMENT = "Account no longer exists. Cancelled and refunded by the webhook backstop.";

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
