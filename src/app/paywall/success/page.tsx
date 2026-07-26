import Link from "next/link";
import { redirect } from "next/navigation";

import { findProfileId, syncSubscription } from "@/lib/billing";
import { safeReturn } from "@/lib/safe-return";
import { getStripe, idOf } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Where Stripe sends the user after a successful payment.
 *
 * The webhook is still the source of truth, but it's asynchronous — and in
 * local dev it may not be running at all. So this page re-reads the checkout
 * session from Stripe and, if it genuinely belongs to the signed-in user and
 * is genuinely paid, applies the same sync the webhook would. Idempotent:
 * whichever path runs second writes identical values.
 *
 * It never grants access from the URL alone — `session_id` is only ever used
 * to look the session up in Stripe.
 */
export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: { session_id?: string; from?: string };
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/paywall");

  const destination = safeReturn(searchParams.from);
  let confirmed = false;

  if (searchParams.session_id) {
    try {
      const stripe = getStripe();
      const session = await stripe.checkout.sessions.retrieve(searchParams.session_id);

      const belongsToUser =
        session.client_reference_id === user.id ||
        session.metadata?.supabase_user_id === user.id;
      const paid =
        session.payment_status === "paid" ||
        session.payment_status === "no_payment_required";
      const subscriptionId = idOf(session.subscription);

      if (belongsToUser && paid && subscriptionId) {
        const profileId = await findProfileId({ metadataUserId: user.id });
        if (profileId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          await syncSubscription(profileId, subscription);
          confirmed = true;
        }
      }
    } catch (err) {
      // Fall through to the "processing" state — the webhook will still land.
      console.error("Checkout success reconciliation failed", err);
    }
  }

  if (!confirmed) {
    // Last check: the webhook may have already done the work.
    const { data: profile } = await supabase
      .from("profiles")
      .select("subscription_status")
      .eq("id", user.id)
      .maybeSingle();
    confirmed = profile?.subscription_status === "active";
  }

  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col justify-center gap-6 bg-background px-6 py-8 text-ink">
      <div className="flex flex-col gap-2.5">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-3">
          {confirmed ? "Payment confirmed" : "Payment received"}
        </p>
        <h1 className="text-balance font-display text-[30px] font-extrabold leading-[1.1] tracking-[-0.02em]">
          {confirmed ? "You're in. Progress is unlocked." : "Finishing up…"}
        </h1>
        <p className="text-pretty text-[14.5px] leading-[1.55] text-ink-2">
          {confirmed
            ? "Every re-test from here is measured against today. Your deltas, chart, and drill history are live."
            : "Stripe has your payment and we're waiting on final confirmation. This usually takes a few seconds — refresh if it doesn't clear."}
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <Link
          href={confirmed ? destination : "/paywall/success"}
          className="flex h-[52px] w-full items-center justify-center rounded-lg bg-optic text-[15px] font-semibold text-optic-ink transition-colors hover:bg-optic-hover active:scale-[0.98]"
        >
          {confirmed ? "See my progress" : "Refresh"}
        </Link>
        {!confirmed && (
          <Link
            href="/home"
            className="flex h-[48px] w-full items-center justify-center text-center text-[14px] text-ink-2 underline underline-offset-4"
          >
            Back to home
          </Link>
        )}
      </div>
    </main>
  );
}
