import { type EmailOtpType, type User } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import {
  AFTER_AUTH,
  AFTER_RECOVERY,
  appOrigin,
  linkErrorPath,
  safeNextPath,
} from "@/lib/auth-redirect";
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
      if (!isRecovery) await claimSignupRecords(supabase, data.user);
      return NextResponse.redirect(`${origin}${next}`);
    }
    // Code and status only: the message can echo the token.
    console.error("auth/confirm: verifyOtp failed", error.code, error.status);
  }

  return NextResponse.redirect(
    `${origin}${linkErrorPath(isRecovery ? "recovery" : "confirm", "expired")}`
  );
}

/**
 * Attach the diagnosis and plan the player made before signing up.
 *
 * Those rows are saved unclaimed and their ids kept in the browser that took
 * the assessment, to be claimed on /home after sign-in. Now that this link
 * works on any device, a player who signs up on a laptop and confirms on a
 * phone would land on an empty Home. So the Save Gate also sends the ids in
 * the sign-up metadata, and they are claimed here, as the newly verified
 * user, through the same RPC. It only ever assigns rows that are still
 * unclaimed, so a repeat (or the original browser claiming later) is a no-op.
 */
async function claimSignupRecords(
  supabase: Awaited<ReturnType<typeof createClient>>,
  user: User | null
) {
  const meta = user?.user_metadata ?? {};
  const id = (key: string) => (typeof meta[key] === "string" ? (meta[key] as string) : null);
  const ids = {
    p_assessment_id: id("pending_assessment_id"),
    p_diagnosis_id: id("pending_diagnosis_id"),
    p_plan_id: id("pending_plan_id"),
  };
  if (!ids.p_assessment_id && !ids.p_diagnosis_id && !ids.p_plan_id) return;

  const { error } = await supabase.rpc("claim_anonymous_records", ids);
  // Never block the confirmation on this: /home's own claim is the fallback.
  if (error) console.error("auth/confirm: claim failed", error.code);
}
