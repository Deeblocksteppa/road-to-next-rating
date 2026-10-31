import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { REMINDER_COLUMN, verifyUnsubscribeToken } from "@/lib/unsubscribe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Turns one reminder type off, for the user the signed token names.
 *
 * POST from a mail provider (RFC 8058): the token is in the query string, the
 * body is `List-Unsubscribe=One-Click`, and it gets a plain status back. POST
 * from the /unsubscribe page's button: the token is in the form, and it gets a
 * 303 to the done screen. GET changes nothing, because mail scanners follow
 * links: it goes to the page, where the button is.
 *
 * A deleted user's token updates 0 rows and still reads as done.
 */
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token");
  const page = new URL("/unsubscribe", request.url);
  if (token) page.searchParams.set("token", token);
  return NextResponse.redirect(page, 303);
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const form = await request.formData().catch(() => null);
  const oneClick = form?.get("List-Unsubscribe") === "One-Click";
  const fromForm = form?.get("token");
  const token = url.searchParams.get("token") ?? (typeof fromForm === "string" ? fromForm : null);

  const done = () =>
    oneClick
      ? new NextResponse(null, { status: 200 })
      : NextResponse.redirect(new URL("/unsubscribe?done=1", request.url), 303);
  // The page with no token is the invalid-link screen.
  const failed = (status: number) =>
    oneClick
      ? new NextResponse(null, { status })
      : NextResponse.redirect(new URL("/unsubscribe", request.url), 303);

  const verified = verifyUnsubscribeToken(token);
  if (!verified) return failed(400);

  const { error } = await createAdminClient()
    .from("profiles")
    .update({ [REMINDER_COLUMN[verified.type]]: false })
    .eq("id", verified.userId);
  if (error) {
    console.error("unsubscribe failed", verified.userId, error);
    return failed(500);
  }

  return done();
}
