"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";

import { authErrorCode } from "@/lib/auth-errors";
import { createClient } from "@/lib/supabase/server";

/** Where to send users after a successful login/signup. */
const AFTER_AUTH = "/home";

/** Restrict post-login redirects to same-site relative paths. */
function safeNext(next: FormDataEntryValue | null): string {
  const value = typeof next === "string" ? next : "";
  return value.startsWith("/") && !value.startsWith("//") ? value : AFTER_AUTH;
}

/** Email + password sign in for returning users. */
export async function login(formData: FormData) {
  const supabase = await createClient();
  const next = safeNext(formData.get("next"));

  const { error } = await supabase.auth.signInWithPassword({
    email: String(formData.get("email")),
    password: String(formData.get("password")),
  });

  if (error) {
    redirect(`/login?error=${authErrorCode(error)}`);
  }

  revalidatePath("/", "layout");
  redirect(next);
}

/** Email + password sign up. The DB trigger creates the profiles row. */
export async function signup(formData: FormData) {
  const supabase = await createClient();
  const origin = (await headers()).get("origin");
  const next = safeNext(formData.get("next"));

  const { data, error } = await supabase.auth.signUp({
    email: String(formData.get("email")),
    password: String(formData.get("password")),
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });

  if (error) {
    redirect(`/signup?error=${authErrorCode(error)}`);
  }

  // If email confirmation is disabled, signUp returns a live session and the
  // user is signed in immediately. If it's enabled, there's no session yet —
  // they must click the link in their email first.
  if (data.session) {
    revalidatePath("/", "layout");
    redirect(next);
  }

  redirect("/signup?check_email=1");
}

/** Google OAuth — shared by both the sign in and sign up screens. */
export async function signInWithGoogle(formData: FormData) {
  const supabase = await createClient();
  const origin = (await headers()).get("origin");
  const next = safeNext(formData.get("next"));

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });

  if (error) {
    redirect("/login?error=signin_failed");
  }

  // Hand off to Google's consent screen; it returns to /auth/callback.
  if (data.url) {
    redirect(data.url);
  }
}

/**
 * Password reset, step one: email the link.
 *
 * Always lands on the same "if there is an account…" confirmation. Supabase
 * itself answers success for an unknown address; the only thing surfaced
 * differently is rate limiting, which says nothing about whether the account
 * exists.
 *
 * The emailed link is built by the Supabase "Reset password" template, which
 * points at /auth/confirm with a token hash, so it works in any browser.
 * `redirectTo` is only used by a template still on `{{ .ConfirmationURL }}`;
 * it stays aimed at /auth/callback so that older template keeps working.
 */
export async function requestPasswordReset(formData: FormData) {
  const supabase = await createClient();
  const origin = (await headers()).get("origin");
  const email = String(formData.get("email") ?? "").trim();

  if (!email) {
    redirect("/forgot-password?error=email_required");
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=${encodeURIComponent("/reset-password")}`,
  });

  if (error) {
    console.error("requestPasswordReset failed", error.status, error.message);
    if (error.status === 429) {
      redirect("/forgot-password?error=rate_limited");
    }
  }

  redirect("/forgot-password?sent=1");
}

/**
 * Send a fresh confirmation email, from the page a dead confirmation link
 * lands on. Says the same thing whether or not the address has an account
 * waiting, for the same reason the password reset does.
 */
export async function resendConfirmation(formData: FormData) {
  const supabase = await createClient();
  const origin = (await headers()).get("origin");
  const email = String(formData.get("email") ?? "").trim();

  if (!email) {
    redirect("/auth/link-error?kind=confirm&error=email_required");
  }

  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: { emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(AFTER_AUTH)}` },
  });

  if (error) {
    console.error("resendConfirmation failed", error.status, error.code);
    if (authErrorCode(error) === "rate_limited") {
      redirect("/auth/link-error?kind=confirm&error=rate_limited");
    }
  }

  redirect("/auth/link-error?kind=confirm&sent=1");
}

/** Password reset, step two: set the new password on the recovery session. */
export async function updatePassword(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/forgot-password?error=link_expired");
  }

  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (password.length < 8) {
    redirect("/reset-password?error=password_short");
  }
  if (password !== confirm) {
    redirect("/reset-password?error=password_mismatch");
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    redirect(`/reset-password?error=${authErrorCode(error)}`);
  }

  revalidatePath("/", "layout");
  redirect(AFTER_AUTH);
}

/** Sign out and return to the sign in screen. */
export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
