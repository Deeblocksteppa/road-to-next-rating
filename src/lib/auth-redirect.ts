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
  // URL parsing drops tabs and newlines anywhere and reads "\\" as "/", so
  // "/%09/evil.com" or "/\\evil.com" would land on another site. No real
  // path here has either.
  if (/[\u0000-\u001f\u007f\\]/.test(next)) return null;
  if (next[1] === "/") return null;
  // And it must still be this site once a browser resolves it.
  try {
    if (new URL(next, "http://same.invalid").origin !== "http://same.invalid") return null;
  } catch {
    return null;
  }
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

/**
 * Where a log-in goes once its sign-up rows are claimed. Home says "Plan
 * saved" (or that the plan expired) once, so the flag rides along only when
 * Home is where the player is going.
 */
export function afterClaimPath(claim: "none" | "claimed" | "expired", next: string): string {
  return claim !== "none" && next === AFTER_AUTH
    ? `${next}?${claim === "expired" ? "expired" : "saved"}=1`
    : next;
}
