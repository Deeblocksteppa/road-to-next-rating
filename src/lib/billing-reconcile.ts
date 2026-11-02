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
 * It only acts when Auth definitely says not found and no profile row exists,
 * and a fresh read after that says the subscription is still live and still
 * names that user. The list can be minutes old, and a normal deletion cancels
 * first and deletes the user second, so its subscription can be on the list with
 * the user already gone. That one is owed no refund. Any error or ambiguity skips
 * the subscription and logs it. Nothing without a `supabase_user_id` is touched:
 * it may have been made by hand.
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
  /** A failed read, an ambiguous answer or a failed cancel: no refund, logged. */
  skipped_errors: number;
  /** Cancelled, then the refund failed. Nothing retries it: refund these by hand. */
  refund_failed: number;
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
 * The cancel decides whether a refund is owed. It only succeeds on a subscription
 * still live at that moment, so one that a normal deletion just ended throws here
 * and never reaches the refund. The comment is what tells a late webhook the
 * cancel was automatic. Stripe's cancel call takes no metadata.
 */
async function cancelOrphan(stripe: Stripe, sub: Stripe.Subscription, userId: string) {
  const cancelled = await stripe.subscriptions.cancel(sub.id, {
    cancellation_details: { comment: ORPHANED_COMMENT },
  });
  if (cancelled.cancellation_details?.comment !== ORPHANED_COMMENT) {
    throw new Error(`Cancel of ${sub.id} didn't record the automatic cancellation`);
  }
  console.error("BILLING RECONCILE: subscription cancelled, account no longer exists", {
    userId,
    subscription: sub.id,
    customer: idOf(sub.customer),
  });
}

/** True if this call refunded. Already refunded is fine; a repeat can't refund twice. */
async function refundOrphan(
  stripe: Stripe,
  sub: Stripe.Subscription,
  userId: string,
  target: RefundTarget
): Promise<boolean> {
  try {
    const refund = await stripe.refunds.create(target.params, {
      idempotencyKey: `billing-reconcile-refund-${sub.id}`,
    });
    console.error("BILLING RECONCILE: payment refunded in full, account no longer exists", {
      userId,
      subscription: sub.id,
      invoice: target.invoice,
      refund: refund.id,
      amount: refund.amount,
      currency: refund.currency,
    });
    return true;
  } catch (err) {
    if ((err as { code?: string } | null)?.code === "charge_already_refunded") return false;
    throw err;
  }
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
    refund_failed: 0,
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

        const current = await stripe.subscriptions.retrieve(sub.id);
        if (!LIVE_STATUSES.some((live) => live === current.status)) {
          console.warn("billing reconcile: no longer live, no refund owed", {
            subscription: sub.id,
            status: current.status,
          });
          continue;
        }
        if (current.metadata?.supabase_user_id !== userId) {
          throw new Error("supabase_user_id changed since the list");
        }

        const target = await findRefund(stripe, sub.id);
        summary.would_cancel++;
        if (dryRun) continue;

        await cancelOrphan(stripe, current, userId);
        summary.cancelled++;
        if (!target) continue;

        try {
          if (await refundOrphan(stripe, current, userId, target)) summary.refunded++;
        } catch (err) {
          // Cancelled now, so it won't be on tomorrow's list.
          console.error(
            "BILLING RECONCILE: REFUND FAILED after cancelling, refund by hand",
            { subscription: sub.id, userId, invoice: target.invoice },
            err
          );
          summary.refund_failed++;
        }
      } catch (err) {
        console.error("billing reconcile: skipped", { subscription: sub.id, userId }, err);
        summary.skipped_errors++;
      }
    }
  }

  return summary;
}
