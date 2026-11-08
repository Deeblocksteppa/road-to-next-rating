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
 * Every writer except the checkout grant (and the paywall's first write of
 * `stripe_customer_id`, which only fills an empty column) is compare-and-set on a snapshot
 * (`readBillingSnapshot`): it reads the profile's billing columns before any
 * Stripe read and writes only if all of them are still what it read. A write
 * that lost to a newer one changes nothing, and the caller re-runs from fresh
 * reads or gives up (see each caller).
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

/** The profile columns Stripe state is written to. */
const BILLING_COLUMNS = [
  "subscription_status",
  "plan_type",
  "renews_at",
  "cancel_at_period_end",
  "stripe_subscription_id",
  "stripe_customer_id",
] as const;

export type BillingSnapshot = {
  subscription_status: string;
  plan_type: string | null;
  renews_at: string | null;
  cancel_at_period_end: boolean;
  stripe_subscription_id: string | null;
  stripe_customer_id: string | null;
};

/**
 * The profile's billing columns as they are now. Read before any Stripe read,
 * then passed to the write, which only lands if every column still matches.
 */
export async function readBillingSnapshot(profileId: string): Promise<BillingSnapshot> {
  const { data, error } = await createAdminClient()
    .from("profiles")
    .select(BILLING_COLUMNS.join(", "))
    .eq("id", profileId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error(`No profile ${profileId} to read billing from`);
  return data as unknown as BillingSnapshot;
}

/** Write only if the profile's billing columns all still match this snapshot. */
export type IfUnchanged = { snapshot: BillingSnapshot };

/**
 * The one billing write. With `opts.snapshot`, the update matches every
 * billing column against it (`is` for nulls), so a write based on reads that a
 * newer write has overtaken changes nothing. Returns the row as written, or
 * null when nothing matched.
 */
async function writeBilling(
  profileId: string,
  fields: Partial<BillingSnapshot>,
  opts?: IfUnchanged
): Promise<BillingSnapshot | null> {
  let query = createAdminClient().from("profiles").update(fields).eq("id", profileId);
  if (opts) {
    for (const column of BILLING_COLUMNS) {
      const value = opts.snapshot[column];
      query = value === null ? query.is(column, null) : query.eq(column, value);
    }
  }
  const { data, error } = await query.select(BILLING_COLUMNS.join(", "));
  if (error) throw error;
  return ((data as unknown as BillingSnapshot[] | null) ?? [])[0] ?? null;
}

/**
 * Mirror a live Stripe subscription onto the profile.
 *
 * `cancel_at_period_end` is kept separate from status on purpose: a canceling
 * subscription is still 'active' until the period actually ends, because the
 * user paid for that time.
 *
 * Returns the row as written, or null when `opts.snapshot` no longer matched.
 */
export async function syncSubscription(
  profileId: string,
  sub: Stripe.Subscription,
  opts?: IfUnchanged
): Promise<BillingSnapshot | null> {
  const status = statusFromStripe(sub.status);
  const isActive = status === "active";

  return writeBilling(
    profileId,
    {
      subscription_status: status,
      plan_type: isActive ? planFromSubscription(sub) : null,
      renews_at: isActive ? periodEndISO(sub) : null,
      cancel_at_period_end: isActive ? sub.cancel_at_period_end : false,
      stripe_subscription_id: isActive ? sub.id : null,
      stripe_customer_id: idOf(sub.customer),
    },
    opts
  );
}

/** A compare-and-set write lost to a newer one. Callers throw it so nothing acts on the stale read. */
export class ProfileChangedError extends Error {
  constructor(profileId: string) {
    super(`Profile ${profileId} changed while its subscription was being re-read`);
  }
}

/** Throw `ProfileChangedError` when a compare-and-set write matched nothing. */
async function landed(profileId: string, written: Promise<BillingSnapshot | null>): Promise<BillingSnapshot> {
  const row = await written;
  if (!row) throw new ProfileChangedError(profileId);
  return row;
}

/**
 * The webhook's rule for a lost compare-and-set: run the whole read-Stripe-
 * write cycle once more from fresh reads; a second loss throws, so the webhook
 * answers 500 and Stripe retries later.
 */
async function rerunOnceOnConflict<T>(profileId: string, run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (err) {
    if (!(err instanceof ProfileChangedError)) throw err;
    console.warn("Billing write lost to a newer one; re-running once from fresh reads", { profileId });
    return run();
  }
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
 *
 * `strict` (the deletion webhook): a missing subscription or customer throws
 * instead of counting as "nothing there", because there it means the key
 * belongs to another account or mode, and "nothing there" would drop a payer.
 */
async function findBilling(
  stripe: Stripe,
  userId: string,
  ids: BillingIds,
  opts: { strict?: boolean } = {}
) {
  const lenient = <T>(call: Promise<T>, fallback: T) => (opts.strict ? call : orWhenMissing(call, fallback));
  const subscriptions = new Map<string, Stripe.Subscription>();
  const customerIds = new Set<string>(ids.customerId ? [ids.customerId] : []);

  const keep = (sub: Stripe.Subscription) => {
    subscriptions.set(sub.id, sub);
    const customer = idOf(sub.customer);
    if (customer && ownedBy(userId, sub.metadata)) customerIds.add(customer);
  };

  if (ids.subscriptionId) {
    const sub = await lenient<Stripe.Subscription | null>(
      stripe.subscriptions.retrieve(ids.subscriptionId),
      null
    );
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
    const listed = await lenient<Stripe.Subscription[]>(
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
 * What else of the player's is in Stripe, found the way `closeBilling` finds
 * it: the newest subscription that gives access (active, trialing, past_due,
 * unpaid), and whether anything of theirs that hasn't ended (an `incomplete`
 * first payment, a `paused` one) could still charge.
 */
async function ownedSubscriptions(
  stripe: Stripe,
  userId: string,
  ids: BillingIds,
  opts: { strict?: boolean } = {}
): Promise<{ access: Stripe.Subscription | null; canStillCharge: boolean }> {
  const found = await findBilling(stripe, userId, ids, opts);
  const open = found.subscriptions.filter((sub) => ownedBy(userId, sub.metadata) && !hasEnded(sub));
  const access = open
    .filter((sub) => statusFromStripe(sub.status) === "active")
    .sort((a, b) => b.created - a.created);
  return { access: access[0] ?? null, canStillCharge: open.length > 0 };
}

/**
 * A subscription id this account doesn't know is only "missing" if the account
 * knows the player's customer. If the customer is missing too, the key belongs
 * to a different Stripe account (the old one, or a mis-pasted env var), and
 * every paid player would look ended: throw instead.
 */
async function assertCustomerHere(stripe: Stripe, userId: string, customerId: string | null) {
  if (!customerId) {
    throw new Error(`No Stripe customer on profile ${userId} to check the account against`);
  }
  try {
    await stripe.customers.retrieve(customerId);
  } catch (err) {
    if (isMissing(err)) {
      console.error("STRIPE ACCOUNT MISMATCH: neither the subscription nor the customer is in this Stripe account, nothing changed", {
        userId,
        customer: customerId,
      });
    }
    throw err;
  }
}

export type RefreshResult =
  /**
   * The profile's own subscription, theirs and giving access. Profile synced to
   * it; `profile` is the row as written, the snapshot for a write that follows.
   */
  | { kind: "live"; sub: Stripe.Subscription; profile: BillingSnapshot }
  /**
   * The profile's subscription had ended, isn't in Stripe, or no longer gives
   * access, and another of theirs that does exists. Profile synced to that one.
   */
  | { kind: "replaced"; sub: Stripe.Subscription }
  /** Nothing of theirs gives access or can still charge. Profile now free. */
  | { kind: "ended" }
  /**
   * Nothing gives access, so the profile is now free, but something of theirs
   * hasn't ended (`incomplete`, `paused`) and could still charge. Not "ended":
   * the player can't be told nothing more will be charged.
   */
  | { kind: "inactive" }
  /** The subscription's metadata names someone else. Nothing written. */
  | { kind: "not_owned" };

/**
 * Re-read the profile's subscription from Stripe and mirror what is true now.
 * For Settings' cancel and resume, and for the Settings screens on load, so a
 * missed or out-of-order webhook can't leave a dead subscription with a
 * Cancel or Keep button on it.
 *
 * Every Stripe read happens before any write: if Stripe fails, this throws and
 * the profile is unchanged. The ids come from `snapshot`, which the caller read
 * before calling (so before any Stripe read), and the write is compare-and-set
 * on it: losing to a newer write throws `ProfileChangedError`, nothing written.
 *
 * - Ownership: the id comes from the player's own profile row, which they could
 *   once rewrite through the REST API. Checkout stamps `supabase_user_id` onto
 *   every subscription's metadata, so a mismatch (or no metadata) means the id
 *   isn't theirs: refuse and log, ended or not.
 * - Ended (`canceled`, `incomplete_expired`), missing (`resource_missing`), or
 *   not giving access (`incomplete`, `paused`): before dropping the player to
 *   free, look for another subscription of theirs that gives access (two
 *   checkouts, or a profile that never got the new id). If there is one, the
 *   profile moves to it.
 * - Missing can't be checked for ownership, but the only write is to the
 *   caller's own row. A missing id that exists in the other mode, or whose
 *   customer is missing too (another Stripe account's key), is a key mix-up:
 *   logged and thrown, nothing written.
 */
export async function refreshOwnedSubscription(
  userId: string,
  email: string | null,
  snapshot: BillingSnapshot,
  stripe: Stripe = getStripe()
): Promise<RefreshResult> {
  if (!snapshot.stripe_subscription_id) {
    throw new Error(`Profile ${userId} has no subscription to re-read`);
  }
  const ids = {
    subscriptionId: snapshot.stripe_subscription_id,
    customerId: snapshot.stripe_customer_id,
    email,
  };

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

  const cas = { snapshot };
  const write = (written: Promise<BillingSnapshot | null>) => landed(userId, written);

  if (stored && !hasEnded(stored) && statusFromStripe(stored.status) === "active") {
    const profile = await write(syncSubscription(userId, stored, cas));
    return { kind: "live", sub: stored, profile };
  }

  const customerId = ids.customerId ?? idOf(stored?.customer);
  if (!stored) await assertCustomerHere(stripe, userId, customerId);

  const owned = await ownedSubscriptions(stripe, userId, {
    email: ids.email,
    subscriptionId: null,
    customerId,
  });
  if (owned.access) {
    console.warn("Profile's subscription replaced by another live one of the player's", {
      userId,
      from: ids.subscriptionId,
      to: owned.access.id,
    });
    await write(syncSubscription(userId, owned.access, cas));
    return { kind: "replaced", sub: owned.access };
  }

  if (stored) {
    await write(syncSubscription(userId, stored, cas));
  } else {
    console.error("SUBSCRIPTION MISSING: profile's subscription isn't in Stripe, moved to free", {
      userId,
      subscription: ids.subscriptionId,
    });
    await write(clearSubscription(userId, cas));
  }
  if (owned.canStillCharge) return { kind: "inactive" };
  return { kind: "ended" };
}

export type HealResult = RefreshResult["kind"] | "skipped" | "conflict" | "failed";

/**
 * `refreshOwnedSubscription` for a page load. Runs only for a paid profile
 * (and, with `onlyIfPastRenewal`, only once its renewal date has passed, which
 * is when a missed webhook shows). Never throws: on any failure the page
 * renders what is stored, and nothing was written. A write that loses to a
 * newer one (a cancel landing while this read Stripe) is skipped, not retried:
 * the page then reads the profile fresh, with the newer write in it.
 */
export async function healSubscription(
  userId: string,
  email: string | null,
  opts: { onlyIfPastRenewal: boolean },
  stripe?: Stripe
): Promise<HealResult> {
  try {
    const snapshot = await readBillingSnapshot(userId);
    if (snapshot.subscription_status !== "active" || !snapshot.stripe_subscription_id) {
      return "skipped";
    }
    if (
      opts.onlyIfPastRenewal &&
      (!snapshot.renews_at || new Date(snapshot.renews_at).getTime() > Date.now())
    ) {
      return "skipped";
    }

    const result = await refreshOwnedSubscription(userId, email, snapshot, stripe ?? getStripe());
    return result.kind;
  } catch (err) {
    if (err instanceof ProfileChangedError) {
      console.warn("healSubscription: profile changed meanwhile, write skipped", { userId });
      return "conflict";
    }
    console.error("healSubscription failed, showing the stored state", { userId }, err);
    return "failed";
  }
}

export type CancelOutcome =
  /** Stripe now says what was asked (sent now, or already so). Profile synced. */
  | "done"
  /** Ended in Stripe already. Profile free, nothing sent. */
  | "ended"
  | "not_owned"
  /** Nothing gives access, but something could still charge. Profile free. */
  | "inactive"
  | "no_subscription"
  /** Lost to a newer write twice. The page shows what the profile says now. */
  | "conflict";

/**
 * Settings' cancel and resume. Reads the profile, re-reads the subscription
 * from Stripe (`refreshOwnedSubscription`, because the profile can be stale: a
 * webhook that never arrived, or arrived out of order), sends the change only
 * if Stripe doesn't already have it, and mirrors Stripe's answer onto the row
 * the re-read wrote, compare-and-set. A lost write re-runs the whole cycle once;
 * the second pass re-reads Stripe first, so it never sends the change twice. A
 * second loss, or a second pass that finds the subscription gone from the
 * profile (the deletion webhook cleared it meanwhile), returns `conflict`: the
 * page shows the profile as it is now.
 */
export async function setCancelAtPeriodEnd(
  userId: string,
  email: string | null,
  cancelAtPeriodEnd: boolean,
  stripe: Stripe = getStripe()
): Promise<CancelOutcome> {
  try {
    return await setCancelOnce(userId, email, cancelAtPeriodEnd, stripe, { rerun: false });
  } catch (err) {
    if (!(err instanceof ProfileChangedError)) throw err;
    console.warn("setCancelAtPeriodEnd: billing write lost to a newer one; re-running once from fresh reads", { userId });
  }
  try {
    return await setCancelOnce(userId, email, cancelAtPeriodEnd, stripe, { rerun: true });
  } catch (err) {
    if (!(err instanceof ProfileChangedError)) throw err;
    console.warn("setCancelAtPeriodEnd: profile changed twice, showing its current state", { userId });
    return "conflict";
  }
}

async function setCancelOnce(
  userId: string,
  email: string | null,
  cancelAtPeriodEnd: boolean,
  stripe: Stripe,
  opts: { rerun: boolean }
): Promise<CancelOutcome> {
  const snapshot = await readBillingSnapshot(userId);
  if (!snapshot.stripe_subscription_id) return opts.rerun ? "conflict" : "no_subscription";

  const now = await refreshOwnedSubscription(userId, email, snapshot, stripe);
  // `replaced`: the profile moved to another live subscription of theirs; the
  // page re-renders with its real state and nothing is sent.
  if (now.kind !== "live") return now.kind === "replaced" ? "done" : now.kind;
  if (now.sub.cancel_at_period_end === cancelAtPeriodEnd) return "done";

  let updated: Stripe.Subscription;
  try {
    updated = await stripe.subscriptions.update(now.sub.id, {
      cancel_at_period_end: cancelAtPeriodEnd,
    });
  } catch (err) {
    // One more read tells a subscription that ended in between (cancelled in
    // the dashboard while the screen was open) from a real failure.
    let again: RefreshResult;
    try {
      const fresh = await readBillingSnapshot(userId);
      if (!fresh.stripe_subscription_id) throw err;
      again = await refreshOwnedSubscription(userId, email, fresh, stripe);
    } catch (rereadErr) {
      if (rereadErr instanceof ProfileChangedError) throw rereadErr;
      if (rereadErr !== err) console.error("Re-read after a failed subscription update also failed", rereadErr);
      throw err;
    }
    if (again.kind !== "ended") throw err;
    return "ended";
  }

  // Only what Stripe confirmed in this response, onto the row the re-read wrote.
  await landed(userId, syncSubscription(userId, updated, { snapshot: now.profile }));
  return "done";
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
 * Whether the profile's current subscription is a different one from the
 * event's that hasn't ended in Stripe. An id that exists only in the other mode
 * throws (logged), so Stripe retries and a person looks, rather than a live
 * payer being cleared by a test-mode event. `strict` (deletion): any missing id
 * throws, since a profile id this key can't see is a key or account mix-up.
 */
async function otherLiveSubscription(
  profileId: string,
  current: string | null,
  eventSubscriptionId: string,
  stripe: Stripe,
  opts: { strict: boolean }
): Promise<boolean> {
  if (!current || current === eventSubscriptionId) return false;

  let sub: Stripe.Subscription | null;
  try {
    sub = await stripe.subscriptions.retrieve(current);
  } catch (err) {
    if (!isMissing(err)) throw err;
    if (opts.strict || isOtherMode(err)) {
      console.error("STRIPE KEY MISMATCH: profile's subscription can't be read with this key, event not applied", {
        profileId,
        current,
        event: eventSubscriptionId,
        otherMode: isOtherMode(err),
      });
      throw err;
    }
    sub = null;
  }
  return !!sub && !hasEnded(sub);
}

export type WebhookOutcome =
  | "synced"
  | "synced_other"
  | "cleared"
  | "skipped_no_profile"
  | "skipped_missing"
  | "skipped_other_live";

/**
 * The event's subscription gives no access (ended, or `incomplete`/`paused`).
 * Before the profile goes free, move it to another subscription of the
 * player's that does, the same rule as `refreshOwnedSubscription`: one ending
 * must not drop a player who is paying through another.
 */
async function settleWithoutAccess(
  profileId: string,
  sub: Stripe.Subscription,
  snapshot: BillingSnapshot,
  stripe: Stripe,
  opts: { strict: boolean },
  free: () => Promise<BillingSnapshot | null>
): Promise<WebhookOutcome> {
  const owned = await ownedSubscriptions(
    stripe,
    profileId,
    { email: null, subscriptionId: null, customerId: idOf(sub.customer) },
    opts
  );
  if (owned.access) {
    await landed(profileId, syncSubscription(profileId, owned.access, { snapshot }));
    console.warn(`Subscription ${sub.id} gives no access; profile moved to live ${owned.access.id}.`);
    return "synced_other";
  }
  await landed(profileId, free());
  return "cleared";
}

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
 *
 * The profile is found from the event and its billing columns read before
 * Stripe is; the write is compare-and-set on them. A lost write re-runs the
 * whole cycle once; a second loss throws (500, Stripe retries).
 */
export async function applySubscriptionUpdated(
  event: Stripe.Subscription,
  stripe: Stripe = getStripe()
): Promise<WebhookOutcome> {
  const profileId = await findProfileId({
    metadataUserId: event.metadata?.supabase_user_id,
    subscriptionId: event.id,
    customerId: idOf(event.customer),
  });
  if (!profileId) {
    // Can legitimately arrive before checkout.session.completed on a first
    // subscribe. That event will sync the same subscription moments later.
    console.warn(`No profile matched subscription ${event.id} on update — skipping.`);
    return "skipped_no_profile";
  }

  return rerunOnceOnConflict(profileId, async () => {
    const snapshot = await readBillingSnapshot(profileId);

    const sub = await orWhenMissing(stripe.subscriptions.retrieve(event.id), null);
    if (!sub) {
      console.warn(`Subscription ${event.id} on update isn't in Stripe — skipping.`);
      return "skipped_missing";
    }

    const current = snapshot.stripe_subscription_id;
    if (await otherLiveSubscription(profileId, current, sub.id, stripe, { strict: false })) {
      console.warn(`Subscription ${sub.id} updated, but the profile is on live ${current} — left alone.`);
      return "skipped_other_live";
    }

    if (!hasEnded(sub) && statusFromStripe(sub.status) === "active") {
      await landed(profileId, syncSubscription(profileId, sub, { snapshot }));
      return "synced";
    }
    return settleWithoutAccess(profileId, sub, snapshot, stripe, { strict: false }, () =>
      syncSubscription(profileId, sub, { snapshot })
    );
  });
}

/**
 * `customer.subscription.deleted`: back to the free tier, unless the profile
 * is already on a different subscription that is still live (an old one
 * ending after a new checkout must not drop a paying player), or another of
 * the player's subscriptions still gives access (then the profile moves to it).
 *
 * Never on the event's word: the subscription is retrieved with this
 * deployment's key every time, even when its id is the profile's, and only
 * `canceled` or `incomplete_expired` is acted on. Ended subscriptions stay
 * retrievable (even after their customer is deleted in the dashboard: the
 * subscription and the customer's subscription list still read, checked in the
 * sandbox), so a missing one, or a missing customer, or a profile subscription
 * this key can't see, means the event came from another account or mode:
 * logged, nothing written, and the webhook answers 500.
 *
 * Compare-and-set and re-run as in `applySubscriptionUpdated`.
 */
export async function applySubscriptionDeleted(
  event: Stripe.Subscription,
  stripe: Stripe = getStripe()
): Promise<WebhookOutcome> {
  const profileId = await findProfileId({
    metadataUserId: event.metadata?.supabase_user_id,
    subscriptionId: event.id,
    customerId: idOf(event.customer),
  });
  if (!profileId) {
    console.warn(`No profile matched subscription ${event.id} on delete — skipping.`);
    return "skipped_no_profile";
  }

  return rerunOnceOnConflict(profileId, async () => {
    const snapshot = await readBillingSnapshot(profileId);

    let sub: Stripe.Subscription;
    try {
      sub = await stripe.subscriptions.retrieve(event.id);
    } catch (err) {
      if (isMissing(err)) {
        console.error("STRIPE KEY MISMATCH: deleted subscription isn't in this Stripe account or mode, nothing changed", {
          profileId,
          subscription: event.id,
          otherMode: isOtherMode(err),
        });
      } else {
        console.error("Deleted subscription couldn't be read from Stripe, nothing changed", {
          profileId,
          subscription: event.id,
        });
      }
      throw err;
    }
    if (!hasEnded(sub)) {
      console.error("Deleted event, but Stripe has the subscription live: nothing changed", {
        profileId,
        subscription: sub.id,
        status: sub.status,
      });
      throw new Error(`Subscription ${sub.id} is ${sub.status} in Stripe, not ended`);
    }

    const current = snapshot.stripe_subscription_id;
    if (await otherLiveSubscription(profileId, current, sub.id, stripe, { strict: true })) {
      console.warn(`Subscription ${sub.id} deleted, but the profile is on live ${current} — left alone.`);
      return "skipped_other_live";
    }

    return settleWithoutAccess(profileId, sub, snapshot, stripe, { strict: true }, () =>
      clearSubscription(profileId, { snapshot })
    );
  });
}

/**
 * Subscription ended for good — drop to the free tier. Returns the row as
 * written, or null when `opts.snapshot` no longer matched.
 */
export async function clearSubscription(
  profileId: string,
  opts?: IfUnchanged
): Promise<BillingSnapshot | null> {
  return writeBilling(
    profileId,
    {
      subscription_status: "free",
      plan_type: null,
      renews_at: null,
      cancel_at_period_end: false,
      stripe_subscription_id: null,
      // stripe_customer_id is deliberately kept: the same Customer should be
      // reused if they resubscribe, so their billing history stays in one place.
    },
    opts
  );
}
