/**
 * Every message an auth screen can show, keyed by a short code.
 *
 * Server actions put only a code in the URL (`/login?error=credentials`) and
 * the page renders the message for it. The pages used to render `?error=`
 * verbatim, so anyone could put their own sentence on the sign-in page with
 * a link, and players saw Supabase's raw wording ("Invalid login
 * credentials"). An unknown or tampered code shows the generic message,
 * never the text from the URL.
 */
export const AUTH_ERRORS = {
  credentials: "That email and password don't match an account. Check both and try again.",
  unconfirmed: "Confirm your email first. The link is in your inbox.",
  rate_limited: "Too many attempts. Wait a few minutes and try again.",
  // Kept for old `?error=` URLs: the save form shows its existing-account
  // note instead, and the /signup page that sent this is gone.
  email_taken: "There's already an account with that email. Sign in instead.",
  weak_password: "That password is too easy to guess. Try a longer one.",
  same_password: "That's your current password. Choose a new one.",
  password_short: "Use at least 8 characters.",
  password_mismatch: "Those two passwords don't match.",
  email_required: "Enter your email address.",
  link_expired: "That link is invalid or has expired. Request a new one.",
  // Supabase answers a wrong code and an expired one with the same error, so
  // one message covers both. The Resend control sits right under it.
  code_failed: "That code didn't work or has expired.",
  signin_failed: "Sign in couldn't be completed. Try again.",
  generic: "Something went wrong. Try again.",
} as const;

export type AuthErrorCode = keyof typeof AUTH_ERRORS;

/**
 * Seconds before a sign-up code can be sent again. Mirrors the Supabase
 * dashboard's minimum interval between emails (Authentication > Rate Limits):
 * a resend inside it is refused.
 */
export const RESEND_COOLDOWN_SECONDS = 60;

/** The message for a `?error=` value, or null when there is none. */
export function authErrorMessage(code: string | null | undefined): string | null {
  if (!code) return null;
  return code in AUTH_ERRORS ? AUTH_ERRORS[code as AuthErrorCode] : AUTH_ERRORS.generic;
}

/**
 * Supabase refused to email an address again inside its minimum interval
 * ("you can only request this after N seconds"): an email went to that
 * address moments ago. The project-wide hourly cap shares the error code but
 * not the wording, and means no email went out, so it isn't matched.
 */
export function isEmailIntervalLimit(error: { code?: string; message?: string } | null | undefined): boolean {
  return (
    error?.code === "over_email_send_rate_limit" && /after \d+ seconds?/i.test(error.message ?? "")
  );
}

/** Map a Supabase auth error to one of the codes above. */
export function authErrorCode(error: { code?: string; status?: number } | null | undefined): AuthErrorCode {
  switch (error?.code) {
    case "invalid_credentials":
      return "credentials";
    case "email_not_confirmed":
      return "unconfirmed";
    case "over_request_rate_limit":
    case "over_email_send_rate_limit":
      return "rate_limited";
    case "user_already_exists":
    case "email_exists":
      return "email_taken";
    case "weak_password":
      return "weak_password";
    case "same_password":
      return "same_password";
    case "otp_expired":
      return "code_failed";
  }
  if (error?.status === 429) return "rate_limited";
  return "generic";
}
