"use server";

import { redirect } from "next/navigation";

import { safeReturn } from "@/lib/safe-return";
import { getStripe, priceIdFor, type Plan } from "@/lib/stripe";
import { siteOrigin } from "@/lib/site-url";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type CheckoutResult = { url: string } | { error: string };

/**
 * Creates a real Stripe Checkout Session (hosted) for the selected plan and
 * hands the URL back to the client to navigate to.
 *
 * Nothing about the user's subscription changes here — `profiles` is only
 * written once Stripe confirms payment, via the webhook at
 * /api/stripe/webhook (and the verified read-back on the success page).
 *
 * Returns the URL rather than calling `redirect()` so the paywall can show a
 * real error inline if Stripe is misconfigured, instead of throwing the user
 * into an error boundary.
 */
export async function startCheckout(
  plan: Plan,
  returnTo: string
): Promise<CheckoutResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/paywall");

  const destination = safeReturn(returnTo);

  try {
    const stripe = getStripe();
    const origin = await siteOrigin();

    const { data: profile } = await supabase
      .from("profiles")
      .select("email, stripe_customer_id, subscription_status")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.subscription_status === "active") {
      // Already paid — don't let a stale paywall tab create a second
      // subscription on the same account.
      return { url: destination };
    }

    // Reuse the Stripe Customer across checkouts so billing history, cards,
    // and cancellations all live on one object.
    let customerId = profile?.stripe_customer_id ?? null;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: profile?.email ?? user.email ?? undefined,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;

      // Service role: this runs before the user is a subscriber, and we want
      // the id persisted even if the RLS-scoped write path changes later.
      await createAdminClient()
        .from("profiles")
        .update({ stripe_customer_id: customerId })
        .eq("id", user.id);
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceIdFor(plan), quantity: 1 }],
      // Both of these tie the webhook event back to this user. metadata is
      // copied onto the Subscription too, so later subscription.* events
      // (which carry no checkout session) can still be resolved.
      client_reference_id: user.id,
      metadata: { supabase_user_id: user.id, plan },
      subscription_data: {
        metadata: { supabase_user_id: user.id, plan },
      },
      success_url: `${origin}/paywall/success?session_id={CHECKOUT_SESSION_ID}&from=${encodeURIComponent(destination)}`,
      cancel_url: `${origin}/paywall?from=${encodeURIComponent(destination)}`,
      allow_promotion_codes: true,
    });

    if (!session.url) return { error: "Stripe didn't return a checkout URL." };
    return { url: session.url };
  } catch (err) {
    console.error("startCheckout failed", err);
    return {
      error:
        err instanceof Error
          ? err.message
          : "Couldn't start checkout. Please try again.",
    };
  }
}
