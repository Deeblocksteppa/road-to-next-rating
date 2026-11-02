import type { SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";

import { accountIsGone, isUserId, ORPHANED_COMMENT } from "@/lib/billing";
import { idOf } from "@/lib/stripe";

/**
 * The daily check that nothing is billing an account that no longer exists.
 *
 * A subscription can come into being while its account is being deleted, after
 * `closeBilling` looked and with no webhook to catch it in time. So this goes the
 * other way round: every subscription Stripe can still charge, checked against
 * our users.
 *
 * It only acts when Auth definitely says not found and no profile row exists.
 * Any error or ambiguity skips that subscription and logs it. Nothing without a
 * `supabase_user_id` is touched: it may have been made by hand.
 *
 * The real switch is `BILLING_RECONCILE_ENABLED` in the route. A dry run makes the
 * same reads, so its counts include what would be skipped, and changes nothing.
 */

/** Every status that can still charge, or become something that can. */
const LIVE_STATUSES = ["active", "trialing", "past_due", "unpaid", "incomplete", "paused"] as const;

export interface ReconcileSummary {
  dryRun: boolean;
  /** Subscriptions looked at. */
  checked: number;
  /** Named accounts that are gone, with a refund that is clear. On a real run, the ones tried. */
  would_cancel: number;
  /** Actually done, on a real run. */
  cancelled: number;
  refunded: number;
  /** A failed read or an ambiguous answer: nothing done, logged, tried again tomorrow. */
  skipped_errors: number;
  /** No `supabase_user_id`: logged only. */
  no_metadata: number;
}

interface RefundTarget {
  invoice: string;
  params: Stripe.RefundCreateParams;
}

/**
 * The one payment to refund: on the newest invoice that took money. Read before
 * anything changes. More than one payment on it is not a case we can decide for
 * ourselves, so that throws. No such invoice (a trial, a 100% coupon, an unpaid
 * first invoice) means nothing to refund.
 */
async function findRefund(stripe: Stripe, subscriptionId: string): Promise<RefundTarget | null> {
  const invoices = await stripe.invoices
    .list({ subscription: subscriptionId, status: "paid", limit: 100 })
    .autoPagingToArray({ limit: 1000 });
  const invoice = invoices.find((i) => i.amount_paid > 0);
  if (!invoice?.id) return null;

  const payments = await stripe.invoicePayments
    .list({ invoice: invoice.id, limit: 100 })
    .autoPagingToArray({ limit: 1000 });
  const paid = payments.filter((p) => p.status === "paid");
  if (paid.length !== 1) {
    throw new Error(`Invoice ${invoice.id} has ${paid.length} paid payments`);
  }

  const paymentIntent = idOf(paid[0].payment.payment_intent);
  const charge = idOf(paid[0].payment.charge);
  if (paymentIntent) return { invoice: invoice.id, params: { payment_intent: paymentIntent } };
  if (charge) return { invoice: invoice.id, params: { charge } };
  throw new Error(`Invoice payment ${paid[0].id} has nothing that can be refunded`);
}

/**
 * Refund first, then cancel. A cancelled subscription drops out of tomorrow's
 * list, so cancelling first would leave a failed refund with nothing to retry it.
 * This order retries either step tomorrow, and a repeat can't refund twice. The
 * cancel carries the backstop's comment, so a late webhook sees why it ended.
 */
async function refundAndCancel(
  stripe: Stripe,
  sub: Stripe.Subscription,
  userId: string,
  target: RefundTarget | null
): Promise<boolean> {
  let refunded = false;
  if (target) {
    try {
      const refund = await stripe.refunds.create(target.params, {
        idempotencyKey: `billing-reconcile-refund-${sub.id}`,
      });
      refunded = true;
      console.error("BILLING RECONCILE: payment refunded in full, account no longer exists", {
        userId,
        subscription: sub.id,
        invoice: target.invoice,
        refund: refund.id,
        amount: refund.amount,
        currency: refund.currency,
      });
    } catch (err) {
      if ((err as { code?: string } | null)?.code !== "charge_already_refunded") throw err;
    }
  }

  await stripe.subscriptions.cancel(sub.id, {
    cancellation_details: { comment: ORPHANED_COMMENT },
  });
  console.error("BILLING RECONCILE: subscription cancelled, account no longer exists", {
    userId,
    subscription: sub.id,
    customer: idOf(sub.customer),
  });
  return refunded;
}

export async function reconcileBilling(
  stripe: Stripe,
  admin: SupabaseClient,
  { dryRun }: { dryRun: boolean }
): Promise<ReconcileSummary> {
  const summary: ReconcileSummary = {
    dryRun,
    checked: 0,
    would_cancel: 0,
    cancelled: 0,
    refunded: 0,
    skipped_errors: 0,
    no_metadata: 0,
  };

  for (const status of LIVE_STATUSES) {
    let subs: Stripe.Subscription[];
    try {
      subs = await stripe.subscriptions.list({ status, limit: 100 }).autoPagingToArray({ limit: 10000 });
    } catch (err) {
      console.error(`billing reconcile: couldn't list ${status} subscriptions`, err);
      summary.skipped_errors++;
      continue;
    }

    for (const sub of subs) {
      summary.checked++;

      const userId = sub.metadata?.supabase_user_id;
      if (!userId) {
        console.warn("billing reconcile: no supabase_user_id, left alone", {
          subscription: sub.id,
          status: sub.status,
        });
        summary.no_metadata++;
        continue;
      }

      try {
        if (!isUserId(userId)) throw new Error("supabase_user_id is not a uuid");
        if (!(await accountIsGone(userId, admin))) continue;

        const target = await findRefund(stripe, sub.id);
        summary.would_cancel++;
        if (dryRun) continue;

        if (await refundAndCancel(stripe, sub, userId, target)) summary.refunded++;
        summary.cancelled++;
      } catch (err) {
        console.error("billing reconcile: skipped", { subscription: sub.id, userId }, err);
        summary.skipped_errors++;
      }
    }
  }

  return summary;
}
