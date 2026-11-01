import { NextResponse } from "next/server";

import { runRetention } from "@/lib/retention";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Daily retention sweep. Scheduled in vercel.json.
 *
 * Deletes for real only with RETENTION_ENABLED=true and no `?dry=1`. Otherwise
 * it counts and deletes nothing, so a merge can't start deleting before the
 * counts have been read.
 *
 * Auth: always requires CRON_SECRET. Unlike the reminder route, a missing
 * secret is a refusal, not open access, because this route can delete.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dryRun =
    new URL(request.url).searchParams.get("dry") === "1" ||
    process.env.RETENTION_ENABLED !== "true";

  const started = Date.now();
  try {
    const summary = await runRetention(createAdminClient(), { dryRun });
    return NextResponse.json({ ok: true, ...summary, ms: Date.now() - started });
  } catch (err) {
    console.error("retention cron failed", err);
    return NextResponse.json(
      { ok: false, dryRun, error: err instanceof Error ? err.message : "unknown" },
      { status: 500 }
    );
  }
}
