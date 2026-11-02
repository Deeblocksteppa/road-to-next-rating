import { NextResponse } from "next/server";

import { reconcileBilling } from "@/lib/billing-reconcile";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Daily billing reconciliation. Scheduled in vercel.json.
 *
 * Cancels and refunds for real only with BILLING_RECONCILE_ENABLED=true and no
 * `?dry=1`. Otherwise it counts and changes nothing. Independent of
 * RETENTION_ENABLED: this one moves money, that one deletes rows.
 *
 * Auth: always requires CRON_SECRET. A missing secret is a refusal, as on the
 * retention route, because this route can refund.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dryRun =
    new URL(request.url).searchParams.get("dry") === "1" ||
    process.env.BILLING_RECONCILE_ENABLED !== "true";

  const started = Date.now();
  try {
    const summary = await reconcileBilling(getStripe(), createAdminClient(), { dryRun });
    return NextResponse.json({ ok: true, ...summary, ms: Date.now() - started });
  } catch (err) {
    console.error("billing reconcile cron failed", err);
    return NextResponse.json(
      { ok: false, dryRun, error: err instanceof Error ? err.message : "unknown" },
      { status: 500 }
    );
  }
}
