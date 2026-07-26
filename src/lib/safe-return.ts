/** Where to send the user when `from` is missing or isn't a safe path. */
export const DEFAULT_RETURN = "/home";

/**
 * Clamp a `from`/`returnTo` value to a same-site relative path.
 *
 * This value arrives from the query string, so it's attacker-controllable. It
 * feeds both the paywall's back link and the post-checkout redirect — without
 * this, `/paywall?from=https://evil.com` would turn either into an open
 * redirect, which is a credible phishing vector on a page that has just sent
 * the user through a payment flow.
 *
 * Rejects anything not starting with `/`, plus the protocol-relative forms
 * `//host` and `/\host` (browsers normalise the backslash to a slash).
 */
export function safeReturn(returnTo: string | null | undefined): string {
  if (!returnTo || !returnTo.startsWith("/")) return DEFAULT_RETURN;

  const second = returnTo[1];
  if (second === "/" || second === "\\") return DEFAULT_RETURN;

  return returnTo;
}
