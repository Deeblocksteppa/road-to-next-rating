"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";

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
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
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
    redirect(`/signup?error=${encodeURIComponent(error.message)}`);
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
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  // Hand off to Google's consent screen; it returns to /auth/callback.
  if (data.url) {
    redirect(data.url);
  }
}

/** Sign out and return to the sign in screen. */
export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
