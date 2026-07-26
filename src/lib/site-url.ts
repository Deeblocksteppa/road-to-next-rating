import { headers } from "next/headers";

/**
 * Absolute origin for URLs Stripe has to redirect back to.
 *
 * Prefers NEXT_PUBLIC_SITE_URL (set this in production — it's stable across
 * preview deploys and proxies), otherwise reconstructs the origin from the
 * incoming request so local dev works with no configuration.
 */
export async function siteOrigin(): Promise<string> {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) return configured.replace(/\/+$/, "");

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!host) return "http://localhost:3000";

  const proto =
    h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
