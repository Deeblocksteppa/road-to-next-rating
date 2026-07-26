import { NextResponse } from "next/server";

import { runDrillReminders } from "@/lib/reminders";

// Reads server env + sends email → Node runtime, never cached/prerendered.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Daily drill-reminder cron. Scheduled in vercel.json (18:00 UTC).
 *
 * Auth: when CRON_SECRET is set, Vercel Cron sends it as `Authorization:
 * Bearer <CRON_SECRET>` automatically, and we require a match so the route
 * can't be triggered by anyone. With no CRON_SECRET (e.g. local dev) it runs
 * unauthenticated — always set CRON_SECRET in production.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const summary = await runDrillReminders();
    return NextResponse.json({ ok: true, ...summary });
  } catch (err) {
    console.error("drill-reminders cron failed", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "unknown" },
      { status: 500 }
    );
  }
}
