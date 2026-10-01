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
  email_taken: "There's already an account with that email. Sign in instead.",
  weak_password: "That password is too easy to guess. Try a longer one.",
  same_password: "That's your current password. Choose a new one.",
  password_short: "Use at least 8 characters.",
  password_mismatch: "Those two passwords don't match.",
  email_required: "Enter your email address.",
  link_expired: "That link is invalid or has expired. Request a new one.",
  signin_failed: "Sign in couldn't be completed. Try again.",
  generic: "Something went wrong. Try again.",
} as const;

export type AuthErrorCode = keyof typeof AUTH_ERRORS;

/** The message for a `?error=` value, or null when there is none. */
export function authErrorMessage(code: string | null | undefined): string | null {
  if (!code) return null;
  return code in AUTH_ERRORS ? AUTH_ERRORS[code as AuthErrorCode] : AUTH_ERRORS.generic;
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
  }
  if (error?.status === 429) return "rate_limited";
  return "generic";
}
