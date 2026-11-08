"use client";

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
  onLogIn,
  onBack,
  keepOtherNote = false,
}: {
  email: string;
  /** /login: a resend here never replaces another address's pending note. */
  keepOtherNote?: boolean;
  /**
   * Signed in now: claim the plan and leave the screen. Runs once.
   * `code`: the player typed it (an explicit choice of this account).
   * `elsewhere`: the focus check found this address signed in by the link in
   * another tab (automatic).
   */
  onVerified: (how: "code" | "elsewhere") => Promise<void>;
  onChangeEmail: () => void;
  /** "Already confirmed? Log in": the log-in form, with this address filled in. */
  onLogIn: () => void;
  /** "Back to my plan", where there is one to go back to (the save form). */
  onBack?: () => void;
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

  const finish = useCallback(async (how: "code" | "elsewhere") => {
    if (done.current) return;
    done.current = true;
    setChecking(true);
    await onVerified(how);
  }, [onVerified]);

  useEffect(() => {
    async function check() {
      if (document.visibilityState !== "visible" || inFlight.current || done.current) return;
      try {
        const { data } = await createClient().auth.getUser();
        // A typed code went out meanwhile: it is the one to finish, as "code".
        if (inFlight.current || done.current) return;
        if (data.user?.email?.toLowerCase() === email.toLowerCase()) await finish("elsewhere");
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
    await finish("code");
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    // The last six: a code pasted over a partly typed one replaces it.
    const digits = e.target.value.replace(/\D/g, "").slice(-CODE_LENGTH);
    if (digits === code) return;
    setCode(digits);
    setError(null);
    if (digits.length === CODE_LENGTH) void submit(digits);
  }

  // The digits left in the field after a wrong code are the ones that just
  // failed: sending them again isn't the way on, so no accent until they change.
  const ready = code.length === CODE_LENGTH && !checking && error !== AUTH_ERRORS.code_failed;

  return (
    // Top-aligned, so the field and "Continue" stay above the keyboard the
    // field's autofocus opens.
    <main className="mx-auto flex min-h-app w-full max-w-md flex-col gap-7 bg-background px-6 pb-12 pt-20 text-ink">
      <div className="flex flex-col gap-2.5">
        <h1 className="text-balance font-display text-[30px] font-extrabold leading-[1.1] tracking-[-0.02em]">
          Enter the code we emailed
        </h1>
        <div className="flex flex-col items-start">
          {/* The address is one unit: it moves to the next line whole when
              it fits there, and breaks inside only when it is wider than the
              screen. */}
          <p className="text-[16px] leading-[1.55] text-ink-2">
            Sent to{" "}
            <span className="inline-block max-w-full font-medium text-ink [overflow-wrap:anywhere]">
              {email}
            </span>
          </p>
          <button
            type="button"
            onClick={onChangeEmail}
            disabled={checking}
            className="-mb-2.5 flex min-h-11 items-center text-[15px] text-ink-2 underline decoration-line-hover underline-offset-4 transition-colors hover:text-ink disabled:pointer-events-none disabled:opacity-60"
          >
            Change email
          </button>
        </div>
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
            // The digits selected after a failed code are there to be typed
            // over, not a highlight: a muted selection, not the accent.
            className="h-14 w-full rounded-md border border-line-strong bg-surface px-4 font-mono text-[28px] tabular-nums tracking-[0.3em] text-ink selection:bg-white/20 selection:text-ink focus:border-line-hover"
          />
          {error && (
            <p id="code-error" role="alert" className="text-[16px] leading-[1.5] text-danger">
              {error}
            </p>
          )}
          <ResendCode
            email={email}
            keepOther={keepOtherNote}
            className="self-start"
            disabled={checking}
            onSent={() => {
              setError(null);
              setCode("");
              inputRef.current?.focus();
            }}
          />
        </div>

        {/* The accent only once there is a whole code to send. Short of
            that, and while checking, the disabled style. */}
        <button
          type="submit"
          disabled={!ready}
          className={[
            "flex h-[52px] w-full items-center justify-center rounded-lg text-[15px] font-semibold transition-colors",
            ready
              ? "bg-optic text-optic-ink hover:bg-optic-hover active:scale-[0.98]"
              : "pointer-events-none border border-line bg-surface text-ink-3",
          ].join(" ")}
        >
          {checking ? "Checking…" : "Continue"}
        </button>
      </form>

      <div className="flex flex-col items-start gap-3">
        {/* The way out when the link was opened on another device: this
            code is spent, and this device can't know. Logging in here
            claims this device's plan, as the code would have. */}
        <p className="text-[16px] leading-[1.5] text-ink-2">
          Already confirmed?{" "}
          <button
            type="button"
            onClick={onLogIn}
            disabled={checking}
            className="-my-2 py-2 text-ink-2 underline decoration-line-hover underline-offset-4 transition-colors hover:text-ink disabled:pointer-events-none disabled:opacity-60"
          >
            Log in
          </button>
        </p>
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            disabled={checking}
            className="-my-2 disabled:pointer-events-none disabled:opacity-60 py-2 text-[15px] text-ink-2 underline decoration-line-hover underline-offset-4 transition-colors hover:text-ink"
          >
            Back to my plan
          </button>
        )}
      </div>
    </main>
  );
}
