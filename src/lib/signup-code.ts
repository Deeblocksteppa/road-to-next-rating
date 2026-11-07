"use client";

import { authErrorCode, isEmailIntervalLimit } from "@/lib/auth-errors";
import { loadSignupPending, saveSignupPending, signupSentAt } from "@/lib/signup-pending";
import { createClient } from "@/lib/supabase/client";

/**
 * Email a fresh sign-up code to an address whose account is still waiting on
 * one, for a log-in that came back "email not confirmed". Supabase only says
 * that after the password checked out, so this reveals nothing new.
 *
 * "sent" also covers the minimum interval: an email went to this address
 * under a minute ago and its code still works, so the code screen is the right
 * next step either way. Sent from the browser, like every other resend, so
 * Supabase's limits count the player's IP. A new code makes the previous
 * email's code and link stop working.
 *
 * The device's pending note (`signup-pending.ts`) is what /start reads as
 * "this device's sign-up is waiting". `keepOther` leaves a note for another
 * address alone: /login uses it, so logging in there never replaces the
 * sign-up a plan on this device is waiting on.
 */
export async function emailSignupCode(
  email: string,
  { keepOther = false }: { keepOther?: boolean } = {}
): Promise<"sent" | "rate_limited" | "generic"> {
  const mayNote = () => {
    const pending = loadSignupPending();
    return !keepOther || !pending || pending.email === email;
  };
  const { error } = await createClient().auth.resend({
    type: "signup",
    email,
    options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/home` },
  });
  if (!error) {
    if (mayNote()) saveSignupPending(email);
    return "sent";
  }
  if (isEmailIntervalLimit(error)) {
    // Keep the stored time of that email, if this device has it, so the
    // resend countdown runs from when it really went out.
    if (signupSentAt(email) === null && mayNote()) saveSignupPending(email);
    return "sent";
  }
  console.error("resend failed", error.code, error.status);
  return authErrorCode(error) === "rate_limited" ? "rate_limited" : "generic";
}
