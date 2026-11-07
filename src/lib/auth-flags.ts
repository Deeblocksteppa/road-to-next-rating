/**
 * Whether "Continue with Google" is offered.
 *
 * The OAuth code path is complete on the log-in page (`signInWithGoogle`,
 * returning through /auth/callback), but the Google provider
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
 * NEXT_PUBLIC_ because the log-in form (`LoginScreen`) is a client component.
 * The save form no longer offers Google (signup-otp, Phase 3); turning this on
 * adds the button to /login only.
 */
export const GOOGLE_AUTH_ENABLED = process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === "true";
