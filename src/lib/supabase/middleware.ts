import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Routes that require an authenticated user. Anything under these prefixes
 * redirects to /login when there's no session. Everything else (the landing
 * page, the anonymous assessment flow, /login, /signup, /auth/*) stays public.
 */
const PROTECTED_PREFIXES = [
  "/home",
  "/plan",
  "/progress",
  "/settings",
  "/paywall",
  "/retest",
  "/session",
];

/**
 * Refreshes the Supabase auth session on each request, rewrites the updated
 * auth cookies onto the response, and enforces basic route protection.
 * Called from the root `middleware.ts`.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: do not run code between createServerClient and getUser().
  // Touching the user here forces the session to refresh if needed.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  // Not logged in and trying to reach a protected area → send to sign in,
  // remembering where they were headed.
  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // Already logged in and visiting an auth screen → send to the app.
  if (user && (pathname === "/login" || pathname === "/signup")) {
    const url = request.nextUrl.clone();
    url.pathname = "/home";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
