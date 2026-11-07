"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { ResendCode } from "@/components/auth/ResendCode";
import { AUTH_ERRORS, authErrorCode } from "@/lib/auth-errors";
import { createClient } from "@/lib/supabase/client";

/** Digits in the emailed code. Mirrors Email OTP length in the Supabase dashboard. */
const CODE_LENGTH = 6;

/**
 * The `verifyOtp` type that confirms a sign-up from its typed code. "signup"
 * works too (both tried on the project, 2026-11-07); "email" is the type the
 * emailed link uses (the live Confirm signup template).
 */
const SIGNUP_CODE_TYPE = "email" as const;

/**
 * The sign-up's second step: the 6-digit code from the confirmation email,
 * typed on the screen the player signed up on. The email also carries a link
 * with the same token (/auth/confirm), so either one finishes the sign-up and
 * using one spends both.
 *
 * The code is checked from the browser, which saves the session to cookies
 * before `verifyOtp` returns; `onVerified` then claims the plan and leaves.
 * It submits by itself at the sixth digit (once per code typed), and
 * "Continue" is there for Enter and for a retry. Pasted codes with spaces or a
 * dash keep their digits only.
 *
 * Opening the link in another tab of this browser signs the player in there.
 * This tab can't see that happen, so it asks whenever it comes back into view
 * and carries on as if the code had been typed, but only for this address:
 * any other account signed in meanwhile (an old address's link, a log-in in
 * another tab) must not take the plan.
 */
export function CodeEntry({
  email,
  onVerified,
  onChangeEmail,
  onBack,
}: {
  email: string;
  /** Signed in now: claim the plan and leave the screen. Runs once. */
  onVerified: () => Promise<void>;
  onChangeEmail: () => void;
  onBack: () => void;
}) {
  const [code, setCode] = useState("");
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // A check in flight, and a sign-in already handed to `onVerified`.
  const inFlight = useRef(false);
  const done = useRef(false);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const finish = useCallback(async () => {
    if (done.current) return;
    done.current = true;
    setChecking(true);
    await onVerified();
  }, [onVerified]);

  useEffect(() => {
    async function check() {
      if (document.visibilityState !== "visible" || inFlight.current || done.current) return;
      try {
        const { data } = await createClient().auth.getUser();
        if (data.user?.email?.toLowerCase() === email.toLowerCase()) await finish();
      } catch {
        // Asked again on the next focus.
      }
    }
    window.addEventListener("focus", check);
    document.addEventListener("visibilitychange", check);
    return () => {
      window.removeEventListener("focus", check);
      document.removeEventListener("visibilitychange", check);
    };
  }, [finish, email]);

  async function submit(value: string) {
    if (value.length !== CODE_LENGTH || inFlight.current || done.current) return;
    inFlight.current = true;
    setChecking(true);
    setError(null);

    let failure: string | null = null;
    try {
      const { error } = await createClient().auth.verifyOtp({
        email,
        token: value,
        type: SIGNUP_CODE_TYPE,
      });
      if (error) {
        // Code and status only: the message can echo the token.
        console.error("verifyOtp failed", error.code, error.status);
        const reason = authErrorCode(error);
        failure =
          AUTH_ERRORS[reason === "code_failed" || reason === "rate_limited" ? reason : "generic"];
      }
    } catch (err) {
      console.error("verifyOtp failed", err);
      failure = AUTH_ERRORS.generic;
    }
    inFlight.current = false;
    // The focus check finished the sign-in meanwhile (the link, in another
    // tab), which spends this code: its error is moot.
    if (done.current) return;

    if (failure) {
      setError(failure);
      setChecking(false);
      // Typing replaces the digits that didn't work.
      inputRef.current?.select();
      return;
    }
    await finish();
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    // The last six: a code pasted over a partly typed one replaces it.
    const digits = e.target.value.replace(/\D/g, "").slice(-CODE_LENGTH);
    if (digits === code) return;
    setCode(digits);
    setError(null);
    if (digits.length === CODE_LENGTH) void submit(digits);
  }

  return (
    <main className="mx-auto flex min-h-app w-full max-w-md flex-col justify-center gap-7 bg-background px-6 py-12 text-ink">
      <div className="flex flex-col gap-2.5">
        <h1 className="text-balance font-display text-[30px] font-extrabold leading-[1.1] tracking-[-0.02em]">
          Enter the code we emailed
        </h1>
        <p className="text-pretty text-[16px] leading-[1.55] text-ink-2">
          {/* The dot stays with the address, so a long one never wraps it to
              the start of a line. */}
          Sent to <span className="break-words font-medium text-ink">{email}</span>
          &nbsp;·{" "}
          <button
            type="button"
            onClick={onChangeEmail}
            disabled={checking}
            className="-my-2 py-2 text-ink-2 disabled:pointer-events-none disabled:opacity-60 underline decoration-line-hover underline-offset-4 transition-colors hover:text-ink"
          >
            Change email
          </button>
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit(code);
        }}
        className="flex flex-col gap-5"
      >
        <div className="flex flex-col gap-3">
          {/* No maxLength: a pasted "123 456" would lose its last digit to the
              space. The change handler keeps the first six digits. Read-only,
              not disabled, while checking, so focus stays for a retry. */}
          <input
            ref={inputRef}
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]*"
            aria-label="6-digit code"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "code-error" : undefined}
            value={code}
            onChange={handleChange}
            readOnly={checking}
            className="h-14 w-full rounded-md border border-line-strong bg-surface px-4 font-mono text-[28px] tabular-nums tracking-[0.3em] text-ink focus:border-line-hover"
          />
          {error && (
            <p
              id="code-error"
              role="alert"
              className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-[16px] leading-[1.5] text-danger"
            >
              {error}
            </p>
          )}
          <ResendCode
            email={email}
            className="self-start"
            disabled={checking}
            onSent={() => {
              setError(null);
              setCode("");
              inputRef.current?.focus();
            }}
          />
        </div>

        <button
          type="submit"
          disabled={checking || code.length !== CODE_LENGTH}
          className="flex h-[52px] w-full items-center justify-center rounded-lg bg-optic text-[15px] font-semibold text-optic-ink transition-colors hover:bg-optic-hover active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60"
        >
          {checking ? "Checking…" : "Continue"}
        </button>
      </form>

      <div className="flex flex-col items-start gap-3">
        {/* The way out when the link was opened on another device: this
            code is spent, and this device can't know. Logging in lands on
            Home, which claims this device's plan. */}
        <p className="text-[16px] leading-[1.5] text-ink-2">
          Already confirmed?{" "}
          <Link
            href="/login"
            className="text-ink-2 underline decoration-line-hover underline-offset-4 transition-colors hover:text-ink"
          >
            Log in
          </Link>
        </p>
        <button
          type="button"
          onClick={onBack}
          disabled={checking}
          className="-my-2 disabled:pointer-events-none disabled:opacity-60 py-2 text-[15px] text-ink-2 underline decoration-line-hover underline-offset-4 transition-colors hover:text-ink"
        >
          Back to my plan
        </button>
      </div>
    </main>
  );
}
