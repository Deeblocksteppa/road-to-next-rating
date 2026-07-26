import Stripe from "stripe";

/**
 * Server-only Stripe client and the small amount of plan/price mapping the
 * app needs. Never import this from a Client Component — it reads
 * STRIPE_SECRET_KEY.
 *
 * The SDK pins its own API version (currently 2026-06-24.dahlia), so we
 * deliberately don't pass `apiVersion` — that keeps the runtime version and
 * the bundled TypeScript types in agreement.
 */

export type Plan = "annual" | "monthly";

let cached: Stripe | undefined;

/** Throws loudly rather than failing halfway through a checkout. */
export function getStripe(): Stripe {
  if (cached) return cached;

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not set — add it to .env.local.");
  }

  cached = new Stripe(key, {
    // Surfaces this app in Stripe's request logs, which makes debugging
    // webhook/checkout traffic in the dashboard much easier.
    appInfo: { name: "road-to-next-rating" },
  });
  return cached;
}

/** The configured price id for a plan. Throws if that env var is missing. */
export function priceIdFor(plan: Plan): string {
  const id =
    plan === "annual"
      ? process.env.STRIPE_PRICE_ANNUAL
      : process.env.STRIPE_PRICE_MONTHLY;

  if (!id) {
    throw new Error(
      `Missing ${plan === "annual" ? "STRIPE_PRICE_ANNUAL" : "STRIPE_PRICE_MONTHLY"} — add it to .env.local.`
    );
  }
  return id;
}

/**
 * Which plan a subscription is on, read back from Stripe rather than trusted
 * from the click that started checkout — a plan change made in Stripe (or via
 * the Billing Portal) has to win.
 *
 * Matches the configured price ids first, then falls back to the billing
 * interval so a price swapped in the dashboard still resolves sensibly.
 */
export function planFromSubscription(sub: Stripe.Subscription): Plan | null {
  const item = sub.items.data[0];
  if (!item) return null;

  const priceId = item.price?.id;
  if (priceId && priceId === process.env.STRIPE_PRICE_ANNUAL) return "annual";
  if (priceId && priceId === process.env.STRIPE_PRICE_MONTHLY) return "monthly";

  const interval = item.price?.recurring?.interval;
  if (interval === "year") return "annual";
  if (interval === "month") return "monthly";
  return null;
}

/**
 * End of the current billing period, as an ISO string.
 *
 * As of API version 2025-03-31.basil, `current_period_end` moved off the
 * Subscription object and onto its items. We read the item field and keep a
 * fallback to the legacy top-level field so this survives an API version pin
 * in either direction.
 */
export function periodEndISO(sub: Stripe.Subscription): string | null {
  const fromItem = sub.items.data[0]?.current_period_end;
  const legacy = (sub as unknown as { current_period_end?: number })
    .current_period_end;

  const seconds = fromItem ?? legacy;
  return typeof seconds === "number" ? new Date(seconds * 1000).toISOString() : null;
}

/**
 * Stripe subscription status → the app's `profiles.subscription_status`.
 *
 * `past_due`/`unpaid` stay 'active': Stripe is still retrying the card, and
 * pulling access on the first failed retry would punish a user whose card
 * simply expired. Access ends when Stripe gives up and sends
 * `customer.subscription.deleted`.
 */
export function statusFromStripe(
  status: Stripe.Subscription.Status
): "active" | "free" {
  switch (status) {
    case "active":
    case "trialing":
    case "past_due":
    case "unpaid":
      return "active";
    default:
      // incomplete, incomplete_expired, canceled, paused
      return "free";
  }
}

/** Narrow a Stripe expandable field down to its id. */
export function idOf(
  value: string | { id: string } | null | undefined
): string | null {
  if (!value) return null;
  return typeof value === "string" ? value : value.id;
}
