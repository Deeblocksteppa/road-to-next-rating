import { createBrowserClient } from "@supabase/ssr";

/**
 * Supabase client for use in Client Components (browser).
 * Reads the public URL + anon key from NEXT_PUBLIC_* env vars.
 *
 * Memoized so repeated calls reuse one GoTrueClient (avoids the
 * "Multiple GoTrueClient instances" warning and duplicate auth listeners).
 */
let browserClient: ReturnType<typeof createBrowserClient> | undefined;

export function createClient() {
  if (browserClient) return browserClient;
  browserClient = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  return browserClient;
}
