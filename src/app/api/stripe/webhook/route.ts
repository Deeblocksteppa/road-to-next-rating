import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import type Stripe from "stripe";

import { clearSubscription, findProfileId, syncSubscription } from "@/lib/billing";
import { getStripe, idOf } from "@/lib/stripe";

// Signature verification needs the raw body, and this reads server-only env —
// Node runtime, never cached or prerendered.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Events we act on. Anything else is acknowledged and ignored. */
const HANDLED = new Set<Stripe.Event["type"]>([
  "checkout.session.completed",
  "customer.subscription.updated",
  "customer.subscription.deleted",
]);

/**
 * Stripe webhook receiver — the authority on subscription state.
 *
 * Every event is signature-verified against STRIPE_WEBHOOK_SECRET before it's
 * looked at. An unverified request never reaches the handlers: without that
 * check, anyone who knows this URL could POST a fake
 * `checkout.session.completed` and grant themselves a subscription.
 */
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error("STRIPE_WEBHOOK_SECRET is not set — refusing to process events.");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  // Must be the exact raw bytes Stripe signed — do not use request.json().
  const payload = await request.text();

  let event: Stripe.Event;
  try {
    event = await getStripe().webhooks.constructEventAsync(payload, signature, secret);
  } catch (err) {
    // Bad signature, wrong secret, or a replayed/tampered body.
    console.error("Stripe webhook signature verification failed", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (!HANDLED.has(event.type)) {
    return NextResponse.json({ received: true, ignored: event.type });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await onCheckoutCompleted(event.data.object);
        break;
      case "customer.subscription.updated":
        await onSubscriptionUpdated(event.data.object);
        break;
      case "customer.subscription.deleted":
        await onSubscriptionDeleted(event.data.object);
        break;
    }
  } catch (err) {
    // 500 tells Stripe to retry with backoff. The handlers are idempotent —
    // they write absolute state read from Stripe, not increments — so a
    // redelivery of an event we partly processed is safe.
    console.error(`Stripe webhook handler failed for ${event.type}`, err);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  // Subscription state gates these screens; drop their cached renders.
  for (const path of ["/home", "/plan", "/progress", "/settings", "/settings/manage"]) {
    revalidatePath(path);
  }

  return NextResponse.json({ received: true, type: event.type });
}

/** Payment succeeded — grant access using the real subscription from Stripe. */
async function onCheckoutCompleted(session: Stripe.Checkout.Session) {
  if (session.mode !== "subscription") return;

  // `paid` for immediate charges; `no_payment_required` covers 100% coupons
  // and trials. Anything else (e.g. `unpaid`) grants nothing.
  if (session.payment_status !== "paid" && session.payment_status !== "no_payment_required") {
    console.warn(
      `checkout.session.completed with payment_status=${session.payment_status} — not granting access.`
    );
    return;
  }

  const subscriptionId = idOf(session.subscription);
  if (!subscriptionId) {
    console.warn("checkout.session.completed with no subscription id — skipping.");
    return;
  }

  const profileId = await findProfileId({
    metadataUserId: session.client_reference_id ?? session.metadata?.supabase_user_id,
    customerId: idOf(session.customer),
  });
  if (!profileId) {
    console.error(`No profile matched checkout session ${session.id} — cannot grant access.`);
    return;
  }

  // Re-read the subscription rather than trusting the session payload: this is
  // where the authoritative plan and period end live.
  const subscription = await getStripe().subscriptions.retrieve(subscriptionId);
  await syncSubscription(profileId, subscription);
}

/** Renewal, plan change, or a cancellation scheduled for period end. */
async function onSubscriptionUpdated(sub: Stripe.Subscription) {
  const profileId = await findProfileId({
    metadataUserId: sub.metadata?.supabase_user_id,
    subscriptionId: sub.id,
    customerId: idOf(sub.customer),
  });
  if (!profileId) {
    // Can legitimately arrive before checkout.session.completed on a first
    // subscribe. That event will sync the same subscription moments later.
    console.warn(`No profile matched subscription ${sub.id} on update — skipping.`);
    return;
  }

  await syncSubscription(profileId, sub);
}

/** Subscription is over — back to the free tier. */
async function onSubscriptionDeleted(sub: Stripe.Subscription) {
  const profileId = await findProfileId({
    metadataUserId: sub.metadata?.supabase_user_id,
    subscriptionId: sub.id,
    customerId: idOf(sub.customer),
  });
  if (!profileId) {
    console.warn(`No profile matched subscription ${sub.id} on delete — skipping.`);
    return;
  }

  await clearSubscription(profileId);
}
