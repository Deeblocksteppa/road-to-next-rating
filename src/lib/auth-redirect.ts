/** Where a verified player goes when the link names no destination. */
export const AFTER_AUTH = "/home";
export const AFTER_RECOVERY = "/reset-password";

/**
 * Clamp a `next` value from an auth link to a same-site relative path, or
 * `null` when it is missing or unsafe. The value comes from an emailed URL,
 * so it is attacker-controllable.
 */
export function safeNextPath(next: string | null | undefined): string | null {
  if (!next || !next.startsWith("/")) return null;
  const second = next[1];
  if (second === "/" || second === "\\") return null;
  return next;
}

/**
 * The origin to redirect back to. Behind Vercel's proxy the request URL can
 * carry an internal host, so production prefers `x-forwarded-host`.
 */
export function appOrigin(request: Request): string {
  const { origin } = new URL(request.url);
  if (process.env.NODE_ENV === "development") return origin;
  const forwardedHost = request.headers.get("x-forwarded-host");
  return forwardedHost ? `https://${forwardedHost}` : origin;
}

/**
 * The page a dead email link lands on. `reason` picks the explanation:
 * "browser" for the old PKCE links, which only work in the browser that
 * requested them, and "expired" for a token-hash link that has timed out or
 * been used.
 */
export function linkErrorPath(
  kind: "recovery" | "confirm",
  reason: "browser" | "expired"
): string {
  return `/auth/link-error?kind=${kind}&reason=${reason}`;
}
