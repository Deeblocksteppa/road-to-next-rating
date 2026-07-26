import { createClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client — bypasses RLS. Use ONLY in trusted server
 * contexts that legitimately act across users (the drill-reminder cron reads
 * every user's profile/plan/sessions to decide who to email). Never import this
 * into anything reachable by a browser request path.
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY (server-only, never NEXT_PUBLIC). Throws
 * loudly if it's missing so a misconfigured deploy fails fast rather than
 * silently emailing no one.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "Supabase admin client needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
    );
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    // Supabase selects are GET requests, which Next.js will cache by default —
    // a cron must never act on a stale read (it drove the wrong reminder
    // decision in testing). Force every query through uncached fetch.
    global: {
      fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }),
    },
  });
}
