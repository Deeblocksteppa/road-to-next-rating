import { NextResponse } from "next/server";

import { runDrillReminders } from "@/lib/reminders";
import { runRetestReminders, type RetestReminderSummary } from "@/lib/retest-reminders";

// Reads server env + sends email → Node runtime, never cached/prerendered.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Daily reminder cron: the re-test email, then the drill email. Scheduled in
 * vercel.json (18:00 UTC). `?dry=1` counts who would get each and sends nothing.
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

  const dryRun = new URL(request.url).searchParams.get("dry") === "1";

  // A failed re-test pass doesn't stop the drill pass.
  let retest: RetestReminderSummary | { error: string };
  try {
    retest = await runRetestReminders({ dryRun });
  } catch (err) {
    console.error("retest reminders failed", err);
    retest = { error: err instanceof Error ? err.message : "unknown" };
  }

  try {
    const summary = await runDrillReminders({ dryRun });
    return NextResponse.json({ ok: !("error" in retest), dryRun, retest, ...summary });
  } catch (err) {
    console.error("drill-reminders cron failed", err);
    return NextResponse.json(
      { ok: false, dryRun, retest, error: err instanceof Error ? err.message : "unknown" },
      { status: 500 }
    );
  }
}
