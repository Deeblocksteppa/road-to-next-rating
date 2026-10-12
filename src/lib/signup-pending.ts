"use client";

/**
 * "This device has submitted a sign-up and is waiting on the confirmation
 * email." Set when the Save Gate's sign-up goes through without a session,
 * cleared once the player is signed in (or starts over, or changes address).
 *
 * The result page reads it so that a player who has just signed up is told
 * to check their inbox, not shown the "create an account" prompt again as
 * if the sign-up had not happened.
 */

const KEY = "rtnr:signup_pending";

export interface SignupPending {
  email: string;
  /** ISO timestamp of the sign-up. */
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

export function clearSignupPending(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
