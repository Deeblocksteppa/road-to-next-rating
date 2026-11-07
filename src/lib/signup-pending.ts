"use client";

/**
 * "This device has submitted a sign-up and is waiting on the code it
 * emailed." Set when the Save Gate's sign-up goes through without a session,
 * cleared once the player is signed in (or starts over, or changes address).
 *
 * The result page reads it so that a player who has just signed up is told
 * to check their inbox, not shown the "create an account" prompt again as
 * if the sign-up had not happened. `at` is when the last email went out:
 * saved again on every resend, it is what the resend countdown runs from,
 * so a refresh doesn't reset it.
 */

const KEY = "rtnr:signup_pending";

export interface SignupPending {
  email: string;
  /** ISO timestamp of the last email sent: the sign-up, or the latest resend. */
  at: string;
}

export function saveSignupPending(email: string): void {
  try {
    const value: SignupPending = { email, at: new Date().toISOString() };
    localStorage.setItem(KEY, JSON.stringify(value));
  } catch {
    // Storage disabled: the check-your-inbox screen still shows for this
    // visit; the result page just won't remember it afterwards.
  }
}

export function loadSignupPending(): SignupPending | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SignupPending>;
    if (!parsed || typeof parsed.email !== "string" || !parsed.email) return null;
    return { email: parsed.email, at: String(parsed.at ?? "") };
  } catch {
    return null;
  }
}

/** When the last code went to `email`, in ms, or null if this device doesn't know. */
export function signupSentAt(email: string): number | null {
  const pending = loadSignupPending();
  if (!pending || pending.email !== email) return null;
  const at = Date.parse(pending.at);
  return Number.isNaN(at) ? null : at;
}

export function clearSignupPending(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
