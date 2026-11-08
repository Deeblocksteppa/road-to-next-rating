"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { CredentialFields } from "@/components/auth/CredentialFields";
import { AUTH_ERRORS, authErrorCode } from "@/lib/auth-errors";
import { emailSignupCode } from "@/lib/signup-code";
import { createClient } from "@/lib/supabase/client";

/**
 * Log-in inside the save form, for a player whose address already has an
 * account: the result on this device goes to that account, as a signed-in
 * retake's does, so they never leave the screen or retype the address.
 *
 * Checked from the browser (`signInWithPassword`), like the sign-up beside it,
 * so Supabase's per-IP limit counts the player's IP. An account still waiting
 * on its sign-up code gets a fresh one emailed and goes to the code screen
 * (`onUnconfirmed`); Supabase says so only once the password is right.
 */
export function InlineLogIn({
  initialEmail,
  onSignedIn,
  onUnconfirmed,
  onBack,
}: {
  initialEmail: string;
  /** Signed in now: claim the plan and leave the screen. */
  onSignedIn: () => Promise<void>;
  /** A code went to this address (or one did under a minute ago). */
  onUnconfirmed: (email: string) => void;
  onBack: () => void;
}) {
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);

  // The address is usually known already, so the password is what's next.
  useEffect(() => {
    (initialEmail ? passwordRef : emailRef).current?.focus();
  }, [initialEmail]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);

    const address = email.trim();
    let failure: string;
    try {
      const { error } = await createClient().auth.signInWithPassword({ email: address, password });
      if (!error) {
        await onSignedIn();
        return;
      }
      if (error.code === "email_not_confirmed") {
        const sent = await emailSignupCode(address);
        if (sent === "sent") {
          onUnconfirmed(address);
          return;
        }
        failure = AUTH_ERRORS[sent];
      } else {
        const reason = authErrorCode(error);
        failure = AUTH_ERRORS[reason === "credentials" || reason === "rate_limited" ? reason : "generic"];
      }
    } catch (err) {
      console.error("Log-in failed", err);
      failure = AUTH_ERRORS.generic;
    }
    setError(failure);
    setBusy(false);
  }

  return (
    // Top-aligned, so the password and the button stay above the keyboard
    // that the password's autofocus opens.
    <main className="mx-auto flex min-h-app w-full max-w-md flex-col gap-5 bg-background px-6 pb-12 pt-20 text-ink">
      <h1 className="text-balance font-display text-[30px] font-extrabold leading-[1.1] tracking-[-0.02em]">
        Log in
      </h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          {/* The save form's block, so the address carried over sits where it was typed. */}
          <CredentialFields
            idPrefix="login"
            email={email}
            onEmailChange={setEmail}
            password={password}
            onPasswordChange={setPassword}
            passwordAutoComplete="current-password"
            emailRef={emailRef}
            passwordRef={passwordRef}
          />
          {/* Leaves the screen; the result stays on this device, and Home
              claims it once the new password signs the player in, unless
              another address's sign-up is pending here. */}
          <Link
            href="/forgot-password"
            className="-mb-2 self-start py-2 text-[15px] text-ink-2 underline decoration-line-hover underline-offset-4 transition-colors hover:text-ink"
          >
            Forgot password?
          </Link>
        </div>

        <button
          type="submit"
          disabled={busy}
          className="flex h-[52px] w-full items-center justify-center rounded-lg bg-optic text-[15px] font-semibold text-optic-ink transition-colors hover:bg-optic-hover active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60"
        >
          {busy ? "Logging in…" : "Log in"}
        </button>
        {error && (
          <p role="alert" className="text-[16px] leading-[1.5] text-danger">
            {error}
          </p>
        )}
      </form>

      <button
        type="button"
        onClick={onBack}
        disabled={busy}
        className="-my-2 self-start py-2 text-[15px] text-ink-2 underline decoration-line-hover underline-offset-4 transition-colors hover:text-ink disabled:pointer-events-none disabled:opacity-60"
      >
        Back
      </button>
    </main>
  );
}
