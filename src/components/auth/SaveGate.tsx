"use client";

import Link from "next/link";
import { useState } from "react";

import { ResendConfirmation } from "@/components/auth/ResendConfirmation";
import { AUTH_ERRORS, authErrorCode } from "@/lib/auth-errors";
import { GOOGLE_AUTH_ENABLED } from "@/lib/auth-flags";
import { claimPendingRecords, getPendingIds } from "@/lib/persistence";
import { clearSignupPending, saveSignupPending } from "@/lib/signup-pending";
import { createClient } from "@/lib/supabase/client";

/** Shown under the password field and enforced by it. Matches the reset flow. */
const MIN_PASSWORD_LENGTH = 8;

/**
 * Post-roadmap Save Gate. Creates an account, then claims the anonymous
 * assessment/diagnosis/plan rows into it.
 *
 * Two screens, never mixed:
 *
 *   - the form, which says what an account adds and what skipping keeps;
 *   - "Check your inbox", shown once a sign-up is waiting on its
 *     confirmation email. It replaces the form outright. It used to be the
 *     same screen with the fields swapped for a grey note, still headed
 *     "Keep what you just found" above a "Saving" card, so a player who had
 *     just signed up was looking at the sign-up pitch and could reasonably
 *     think nothing had happened.
 *
 * - Confirmation OFF → a session is live immediately: claim here, go to Home.
 * - Confirmation ON → no session yet. The plan stays on this device (nothing
 *   is cleared), the device remembers the pending sign-up, and the rows are
 *   claimed when the emailed link is opened, on any device (/auth/confirm).
 */
export function SaveGate({
  onSkip,
  bottleneckTitle,
  weeksTarget,
  pendingEmail,
  onPendingChange,
  reason = "save",
}: {
  /** Back to the result page. */
  onSkip: () => void;
  /** Title-case skill name ("The reset"). */
  bottleneckTitle: string;
  weeksTarget: number;
  /** The address a sign-up on this device is waiting on, if any. */
  pendingEmail: string | null;
  onPendingChange: (email: string | null) => void;
  /** `session`: opened from "Start session", so it says why an account is needed. */
  reason?: "save" | "session";
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const planLine = `${bottleneckTitle} · ${weeksTarget}-week plan`;

  async function handleEmailSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    // The ids of the diagnosis and plan just made, sent with the sign-up so
    // /auth/confirm can attach them wherever the confirmation link is
    // opened. They otherwise live only in this browser's storage.
    const pending = getPendingIds();
    const address = email.trim();
    const { data, error } = await supabase.auth.signUp({
      email: address,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/home`,
        data: {
          pending_assessment_id: pending.assessment ?? null,
          pending_diagnosis_id: pending.diagnosis ?? null,
          pending_plan_id: pending.plan ?? null,
        },
      },
    });

    if (error) {
      // Friendly fixed copy, not Supabase's raw wording (lib/auth-errors.ts).
      setError(AUTH_ERRORS[authErrorCode(error)]);
      setLoading(false);
      return;
    }

    // An address that already has a confirmed account comes back as a user
    // with no identities and no email is sent. Saying "check your inbox"
    // there would leave the player waiting for a link that never arrives.
    if (data.user && data.user.identities?.length === 0) {
      setError(AUTH_ERRORS.email_taken);
      setLoading(false);
      return;
    }

    if (data.session) {
      // Signed in immediately — claim the anonymous rows, then go.
      try {
        await claimPendingRecords();
      } catch (err) {
        console.error("Failed to claim records:", err);
      }
      clearSignupPending();
      window.location.href = "/home?saved=1";
      return;
    }

    // Confirmation is on. Nothing on this device is cleared: the plan stays
    // here until the link is opened.
    saveSignupPending(address);
    onPendingChange(address);
    setPassword("");
    setLoading(false);
    window.scrollTo(0, 0);
  }

  async function handleGoogle() {
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/home`,
      },
    });

    if (error) {
      setError(AUTH_ERRORS.signin_failed);
      setLoading(false);
    }
    // On success the browser is redirected to Google.
  }

  /* ── Check your inbox ───────────────────────────────────────── */
  if (pendingEmail) {
    return (
      <main className="mx-auto flex min-h-app w-full max-w-md flex-col justify-center gap-7 bg-background px-6 py-12 text-ink">
        <div className="flex flex-col gap-2.5">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-3">
            Confirm your email
          </p>
          <h1 className="font-display text-[30px] font-extrabold leading-[1.1] tracking-[-0.02em]">
            Check your inbox
          </h1>
          <p className="text-pretty text-[16px] leading-[1.55] text-ink-2">
            We sent a confirmation link to{" "}
            <span className="break-words font-medium text-ink">{pendingEmail}</span>. Open it to
            finish setting up your account.
          </p>
        </div>

        {/* One line naming what is being saved. Ruled, not boxed. */}
        <p className="border-y border-line py-3.5 text-[16px] font-semibold text-ink">
          {planLine}
        </p>

        <div className="flex flex-col gap-4">
          <button
            type="button"
            onClick={onSkip}
            className="flex h-[52px] w-full items-center justify-center rounded-lg bg-optic text-[15px] font-semibold text-optic-ink transition-colors hover:bg-optic-hover active:scale-[0.98]"
          >
            Back to my plan
          </button>

          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1">
            <ResendConfirmation email={pendingEmail} />
            <button
              type="button"
              onClick={() => {
                clearSignupPending();
                onPendingChange(null);
                setEmail("");
                setError(null);
              }}
              className="-my-2 py-2 text-[15px] text-ink-2 underline decoration-line-hover underline-offset-4 transition-colors hover:text-ink"
            >
              Use a different email
            </button>
          </div>
        </div>

        <p className="text-center text-[16px] leading-[1.5] text-ink-3">
          Your plan stays on this device while you confirm.
        </p>
      </main>
    );
  }

  /* ── The form ───────────────────────────────────────────────── */
  return (
    <main className="mx-auto flex min-h-app w-full max-w-md flex-col justify-center gap-5 bg-background px-6 py-12 text-ink">
      <div className="flex flex-col gap-2.5">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-3">
          Save your plan
        </p>
        <h1 className="text-balance font-display text-[30px] font-extrabold leading-[1.1] tracking-[-0.02em]">
          Keep what you just found.
        </h1>
        {/* What each choice gets, plainly: the account is what runs sessions
            and keeps the counts. Skipping keeps the plan on this device and
            nothing more; it used to read as though sessions came with it. */}
        {/* The first words answer the button that opened the form: "Save my
            plan" hears that saving makes an account, "Start session" that
            sessions need one. Each says it once. */}
        <p className="text-pretty text-[16px] leading-[1.55] text-ink-2">
          {reason === "session" ? (
            <>
              Sessions need a free account. It keeps what you log, on any device. Skip it and
              your plan stays on this device. No card, nothing to pay.
            </>
          ) : (
            <>
              Saving creates a free account. It runs your guided sessions and keeps what you log,
              on any device. Skip it and your plan stays on this device, but sessions and logging
              need the account. No card, nothing to pay.
            </>
          )}
        </p>
      </div>

      {/* The real bottleneck and plan being saved. */}
      <div className="flex flex-col gap-2 rounded-xl border border-line bg-surface px-[18px] py-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">Your plan</p>
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
          <span className="h-2 w-2 shrink-0 rounded-full bg-ink-2" />
          <span className="text-[16px] font-semibold">{bottleneckTitle}</span>
          <span className="text-[15px] text-ink-3">· {weeksTarget}-week plan</span>
        </div>
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-[16px] text-danger"
        >
          {error}
        </p>
      )}

      <div className="flex flex-col gap-3">
        {/* Hidden until the provider is really on — see `auth-flags.ts`. */}
        {GOOGLE_AUTH_ENABLED && (
          <>
            <button
              type="button"
              disabled={loading}
              onClick={handleGoogle}
              className="flex h-[52px] w-full items-center justify-center gap-2.5 rounded-lg border border-line-strong bg-surface-2 text-[15px] font-semibold text-ink transition-colors hover:border-line-hover disabled:pointer-events-none disabled:opacity-60"
            >
              <span className="font-display text-[15px] font-extrabold">G</span>
              Continue with Google
            </button>

            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-line" />
              <span className="font-mono text-[10px] text-ink-3">OR</span>
              <div className="h-px flex-1 bg-line" />
            </div>
          </>
        )}

        <form onSubmit={handleEmailSignup} className="flex flex-col gap-4">
          {/* Labels sit above the fields and stay there once they're filled:
              a placeholder-only label disappears exactly when the player
              goes back to check what they typed. */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-[15px] font-medium text-ink-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-12 w-full rounded-md border border-line-strong bg-surface px-4 text-[16px] text-ink placeholder-ink-3 focus:border-line-hover"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-[15px] font-medium text-ink-2">
              Password
            </label>
            {/* The ring goes on the row so it wraps the field and its toggle. */}
            <div className="flex h-12 w-full items-center rounded-md border border-line-strong bg-surface pl-4 pr-1 has-[input:focus-visible]:border-line-hover has-[input:focus-visible]:outline has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-optic">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                minLength={MIN_PASSWORD_LENGTH}
                aria-describedby="password-hint"
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
            <p id="password-hint" className="text-[16px] leading-[1.5] text-ink-3">
              At least {MIN_PASSWORD_LENGTH} characters.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex h-[52px] w-full items-center justify-center rounded-lg bg-optic text-[15px] font-semibold text-optic-ink transition-colors hover:bg-optic-hover active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60"
          >
            {loading ? "Creating your account…" : "Create account & save plan"}
          </button>
        </form>
      </div>

      <button
        type="button"
        onClick={onSkip}
        className="-my-2 py-2 text-center text-[15px] text-ink-2 underline decoration-line-hover underline-offset-4 hover:text-ink"
      >
        Not now, keep it on this device
      </button>

      <p className="text-center text-[16px] text-ink-2">
        Already have an account?{" "}
        <Link href="/login" className="underline underline-offset-4">
          Sign in
        </Link>
      </p>
    </main>
  );
}
