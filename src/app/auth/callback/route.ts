import { NextResponse } from "next/server";

import { GOOGLE_AUTH_ENABLED } from "@/lib/auth-flags";
import { AFTER_AUTH, AFTER_RECOVERY, appOrigin, linkErrorPath, safeNextPath } from "@/lib/auth-redirect";
import { createClient } from "@/lib/supabase/server";

/**
 * Google OAuth return point: Supabase redirects here with a `code`, which is
 * exchanged for a session cookie.
 *
 * Emailed links no longer come through here (see /auth/confirm), but emails
 * sent before that change still do, and their PKCE code can only be
 * exchanged in the browser that requested the email. When that fails, the
 * player gets the page that says so and offers a new link, not the sign-in
 * screen with a vague error.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const origin = appOrigin(request);
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next")) ?? AFTER_AUTH;

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
    console.error("auth/callback: code exchange failed", error.code, error.status);
  }

  // An old password-reset email, opened somewhere other than where it was
  // requested (or expired).
  if (next === AFTER_RECOVERY) {
    return NextResponse.redirect(`${origin}${linkErrorPath("recovery", "browser")}`);
  }
  // With Google sign-in off, the only other way here is an old confirmation
  // email. With it on, this is an OAuth failure and belongs on sign-in.
  if (!GOOGLE_AUTH_ENABLED) {
    return NextResponse.redirect(`${origin}${linkErrorPath("confirm", "browser")}`);
  }
  return NextResponse.redirect(`${origin}/login?error=signin_failed`);
}
