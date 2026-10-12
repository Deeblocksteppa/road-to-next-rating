import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import {
  AFTER_AUTH,
  AFTER_RECOVERY,
  appOrigin,
  linkErrorPath,
  safeNextPath,
} from "@/lib/auth-redirect";
import { claimSignupRecords } from "@/lib/claim-signup";
import { createClient } from "@/lib/supabase/server";

const EMAIL_OTP_TYPES: readonly EmailOtpType[] = [
  "email",
  "signup",
  "recovery",
  "invite",
  "magiclink",
  "email_change",
];

/**
 * Where every emailed auth link lands: password reset and email confirmation.
 *
 * The Supabase email templates point here with a token hash
 * (`{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=…`), and
 * `verifyOtp` turns that hash into a session. Nothing about it depends on the
 * browser that asked for the email, so the link works in a mail app's
 * browser, on another device, anywhere.
 *
 * The previous flow sent `{{ .ConfirmationURL }}`, which comes back to
 * /auth/callback with a PKCE `code`. Exchanging that code needs a verifier
 * cookie that only exists in the browser that made the request, so a reset
 * link opened from a phone's mail app failed with "Sign in couldn't be
 * completed". /auth/callback stays for Google OAuth and for any old emails
 * still sitting in inboxes.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const origin = appOrigin(request);

  const token_hash = searchParams.get("token_hash");
  const rawType = searchParams.get("type");
  const type = EMAIL_OTP_TYPES.find((t) => t === rawType) ?? null;
  const isRecovery = type === "recovery";
  const next =
    safeNextPath(searchParams.get("next")) ?? (isRecovery ? AFTER_RECOVERY : AFTER_AUTH);

  if (token_hash && type) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) {
      // Every link that starts a session claims the sign-up's rows (a no-op
      // when there are none, or they were claimed already).
      await claimSignupRecords(supabase, data.user);
      // A confirmed sign-up lands on Home with a brief "Plan saved".
      const landing = !isRecovery && next === AFTER_AUTH ? `${next}?saved=1` : next;
      return NextResponse.redirect(`${origin}${landing}`);
    }
    // Code and status only: the message can echo the token.
    console.error("auth/confirm: verifyOtp failed", error.code, error.status);
  }

  return NextResponse.redirect(
    `${origin}${linkErrorPath(isRecovery ? "recovery" : "confirm", "expired")}`
  );
}
