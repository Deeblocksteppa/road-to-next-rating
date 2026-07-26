import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * TEMPORARY — diagnoses the "ByteString" Headers error by checking each
 * suspect env var for non-Latin1 characters without ever exposing the
 * actual secret value. Remove this route once the bad var is identified.
 */
const SUSPECTS: Record<string, string> = {
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "eyJ",
  SUPABASE_SERVICE_ROLE_KEY: "eyJ",
  STRIPE_SECRET_KEY: "sk_",
  RESEND_API_KEY: "re_",
};

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: Record<string, unknown> = {};
  for (const [name, expectedPrefix] of Object.entries(SUSPECTS)) {
    const val = process.env[name];
    if (val === undefined) {
      results[name] = { missing: true };
      continue;
    }
    let firstBadIndex = -1;
    let firstBadCode: number | null = null;
    for (let i = 0; i < val.length; i++) {
      const code = val.codePointAt(i)!;
      if (code > 255) {
        firstBadIndex = i;
        firstBadCode = code;
        break;
      }
    }
    results[name] = {
      length: val.length,
      startsWithExpectedPrefix: val.startsWith(expectedPrefix),
      hasNonLatin1: firstBadIndex !== -1,
      firstBadIndex,
      firstBadCode,
    };
  }

  return NextResponse.json({ results });
}
