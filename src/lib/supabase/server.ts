import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Supabase client for use in Server Components, Route Handlers, and
 * Server Actions (App Router). Wires Supabase auth into Next's cookie store.
 *
 * Note: `cookies()` is dynamic; calling this opts the caller out of static
 * rendering. In a plain Server Component the cookie `set` calls are no-ops
 * (cookies can only be written in a Route Handler or Server Action) — the
 * try/catch swallows that case, which is safe when middleware refreshes the
 * session.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component — safe to ignore when the
            // session is refreshed by middleware.
          }
        },
      },
    }
  );
}
