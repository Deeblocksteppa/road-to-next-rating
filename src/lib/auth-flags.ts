/**
 * Whether "Continue with Google" is offered.
 *
 * The OAuth code path is complete — `signInWithOAuth` on the login, signup and
 * Save Gate screens, returning through /auth/callback — but the Google provider
 * is switched off in the Supabase project, so the button sent people to a raw
 * "provider is not enabled" error from Supabase. A button that fails is worse
 * than no button, so it is hidden until the provider is really on.
 *
 * To turn it on:
 *   1. Google Cloud Console → APIs & Services → Credentials → Create OAuth
 *      client ID (Web application). Authorised redirect URI:
 *      https://<project-ref>.supabase.co/auth/v1/callback
 *   2. Supabase Dashboard → Authentication → Providers → Google → enable, paste
 *      the client ID and secret.
 *   3. Supabase → Authentication → URL Configuration: make sure the site's
 *      /auth/callback is in Redirect URLs (localhost and production).
 *   4. Set NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=true (locally and in hosting).
 *
 * NEXT_PUBLIC_ because the Save Gate is a client component and has to make the
 * same decision the server-rendered login page makes.
 */
export const GOOGLE_AUTH_ENABLED = process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === "true";
