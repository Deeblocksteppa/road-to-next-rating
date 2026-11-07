"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

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
  const [showPassword, setShowPassword] = useState(false);
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
    <main className="mx-auto flex min-h-app w-full max-w-md flex-col justify-center gap-5 bg-background px-6 py-12 text-ink">
      <h1 className="text-balance font-display text-[30px] font-extrabold leading-[1.1] tracking-[-0.02em]">
        Log in
      </h1>

      {error && (
        <p
          role="alert"
          className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-[16px] text-danger"
        >
          {error}
        </p>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="login-email" className="text-[15px] font-medium text-ink-2">
            Email
          </label>
          <input
            ref={emailRef}
            id="login-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="h-12 w-full rounded-md border border-line-strong bg-surface px-4 text-[16px] text-ink placeholder-ink-3 focus:border-line-hover"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="login-password" className="text-[15px] font-medium text-ink-2">
            Password
          </label>
          {/* The ring goes on the row so it wraps the field and its toggle. */}
          <div className="flex h-12 w-full items-center rounded-md border border-line-strong bg-surface pl-4 pr-1 has-[input:focus-visible]:border-line-hover has-[input:focus-visible]:outline has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-optic">
            <input
              ref={passwordRef}
              id="login-password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="h-full min-w-0 flex-1 bg-transparent text-[16px] text-ink placeholder-ink-3 focus-visible:outline-none"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-pressed={showPassword}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="flex h-10 shrink-0 items-center rounded-sm px-3 font-mono text-[11px] uppercase tracking-[0.1em] text-ink-2 transition-colors hover:text-ink"
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
          {/* Leaves the screen; the result stays on this device, and Home
              claims it once the new password signs the player in. */}
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
