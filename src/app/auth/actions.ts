"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";

import { authErrorCode } from "@/lib/auth-errors";
import { AFTER_AUTH, afterClaimPath, safeNextPath } from "@/lib/auth-redirect";
import { claimSignupRecords } from "@/lib/claim-signup";
import { createClient } from "@/lib/supabase/server";

/** Restrict post-login redirects to same-site relative paths. */
function safeNext(next: FormDataEntryValue | null): string {
  return safeNextPath(typeof next === "string" ? next : null) ?? AFTER_AUTH;
}

/**
 * Email + password log-in for returning players.
 *
 * An account still waiting on its sign-up code comes back as
 * `{ unconfirmed: email }` instead of a redirect: the page emails a fresh code
 * from the browser and shows the code screen in place, keeping the address out
 * of the URL. Supabase only answers "email not confirmed" once the password
 * checked out, so this says nothing a wrong password wouldn't. Every other
 * error redirects with its code, as before.
 */
export async function login(formData: FormData): Promise<{ unconfirmed: string } | undefined> {
  const supabase = await createClient();
  const next = safeNext(formData.get("next"));
  const email = String(formData.get("email") ?? "").trim();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: String(formData.get("password")),
  });

  if (error) {
    if (error.code === "email_not_confirmed") return { unconfirmed: email };
    redirect(`/login?error=${authErrorCode(error)}`);
  }

  // A player who confirmed somewhere the claim didn't run (an old-style
  // link) gets their plan attached the first time they sign in, on any
  // device. Home says so once.
  const claim = await claimSignupRecords(supabase, data.user);

  revalidatePath("/", "layout");
  redirect(afterClaimPath(claim, next));
}

/**
 * Claim the rows named in the signed-in player's sign-up metadata, right after
 * the code screen's `verifyOtp` set the session cookies in the browser. The
 * code is checked in the browser, not here, so Supabase's per-IP limit on
 * token checks counts the player's IP rather than one shared by every player.
 * Never throws: with no session, or on any failure, it answers "none".
 */
export async function claimMySignup(): Promise<"none" | "claimed" | "expired"> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return "none";
    const claim = await claimSignupRecords(supabase, user);
    if (claim !== "none") revalidatePath("/", "layout");
    return claim;
  } catch (err) {
    console.error("claimMySignup: unexpected failure", err);
    return "none";
  }
}

/** Google OAuth, from the log-in screen. */
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
