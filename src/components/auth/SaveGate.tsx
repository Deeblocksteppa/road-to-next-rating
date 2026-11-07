"use client";

import Link from "next/link";
import { useState } from "react";

import { claimMySignup } from "@/app/auth/actions";
import { CodeEntry } from "@/components/auth/CodeEntry";
import { ConsentLine } from "@/components/legal/ConsentLine";
import { AUTH_ERRORS, authErrorCode, isEmailIntervalLimit } from "@/lib/auth-errors";
import { GOOGLE_AUTH_ENABLED } from "@/lib/auth-flags";
import { consentMetadata } from "@/lib/legal";
import { loadLocalResult } from "@/lib/local-result";
import { claimAnonymousResult, type SavedIds } from "@/lib/persistence";
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
 *   - the code screen (`CodeEntry`), shown once a sign-up is waiting on the
 *     6-digit code it emailed. It replaces the form outright.
 *
 * Nothing is sent until the result's save (`saveResult`) has finished with
 * all three rows: the sign-up carries their ids, and a partial set is never
 * claimed. If the save still fails, the form shows an error and stays put.
 *
 * - Confirmation OFF → a session is live immediately: claim here, go to Home.
 * - Confirmation ON → no session yet. The plan stays on this device (nothing
 *   is cleared) and the device remembers the pending sign-up. The code typed
 *   here signs the player in on this screen, which claims the plan and goes
 *   on to the session or the plan (`handleVerified`). The emailed link does
 *   the same from any device, landing on Home (/auth/confirm).
 */
export function SaveGate({
  saveResult,
  onSkip,
  bottleneckTitle,
  weeksTarget,
  pendingEmail,
  onPendingChange,
  reason = "save",
}: {
  /** The anonymous result's save (`saveAnonymousResult`): the complete set of ids, or a rejection. */
  saveResult: () => Promise<SavedIds>;
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

  async function handleEmailSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // The ids of the result just made, sent with the sign-up so /auth/confirm
    // can attach them wherever the confirmation link is opened. They
    // otherwise live only in this browser's storage. Already saved when the
    // form opened, so this normally resolves at once.
    let ids: SavedIds;
    try {
      ids = await saveResult();
    } catch (err) {
      console.error("Failed to save the result:", err);
      setError(AUTH_ERRORS.generic);
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const address = email.trim();
    const { data, error } = await supabase.auth.signUp({
      email: address,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/home`,
        data: {
          pending_assessment_id: ids.assessment,
          pending_diagnosis_id: ids.diagnosis,
          pending_plan_id: ids.plan,
          ...consentMetadata(),
        },
      },
    });

    if (error) {
      // An email went to this address under a minute ago, so it has a
      // sign-up waiting with a code that still works: show the code screen.
      if (isEmailIntervalLimit(error)) {
        awaitCode(address);
        return;
      }
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
      // Signed in immediately — claim the anonymous rows, then go. On a
      // failure the device keeps its result and Home's claim tries again.
      try {
        await claimAnonymousResult(ids);
      } catch (err) {
        console.error("Failed to claim records:", err);
      }
      clearSignupPending();
      window.location.href = "/home?saved=1";
      return;
    }

    // Confirmation is on. Nothing on this device is cleared: the plan stays
    // here until the code is entered or the link is opened.
    awaitCode(address);
  }

  function awaitCode(address: string) {
    saveSignupPending(address);
    onPendingChange(address);
    setPassword("");
    setLoading(false);
    window.scrollTo(0, 0);
  }

  /**
   * Signed in by the code (or by the link in another tab). Claims the rows
   * named in the sign-up's metadata, then this device's own set, then goes
   * where the player was heading. If the device claim fails, the player is
   * still signed in and the device keeps its result: Home's claim tries
   * again and says "Plan saved" once it lands.
   */
  async function handleVerified() {
    // Another tab may have finished already (the link opened there lands on
    // Home, which claims and clears the device). Saving now would write the
    // result a second time.
    const deviceHasResult = loadLocalResult() !== null;

    let claim: Awaited<ReturnType<typeof claimMySignup>> = "none";
    try {
      claim = await claimMySignup();
    } catch (err) {
      console.error("Failed to claim the sign-up's records:", err);
    }
    // The metadata's rows were deleted (30 days unclaimed). With a result
    // still on this device, that result is the one to keep: the metadata can
    // name an older sign-up on this address (Supabase keeps the first
    // attempt's metadata), and /start already cleared a device whose own
    // rows were gone.
    if (claim === "expired" && !deviceHasResult) {
      clearSignupPending();
      window.location.assign("/home?expired=1");
      return;
    }

    if (deviceHasResult) {
      try {
        await claimAnonymousResult(await saveResult());
      } catch (err) {
        console.error("Failed to claim records:", err);
        clearSignupPending();
        window.location.assign("/home");
        return;
      }
    }
    clearSignupPending();
    window.location.assign(reason === "session" ? "/session" : "/plan");
  }

  async function handleGoogle() {
    setLoading(true);
    setError(null);

    // The rows must all be saved before leaving: Home claims them by the ids
    // on this device when Google sends the player back.
    try {
      await saveResult();
    } catch (err) {
      console.error("Failed to save the result:", err);
      setError(AUTH_ERRORS.generic);
      setLoading(false);
      return;
    }

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

  /* ── The code ─────────────────────────────────────────────── */
  if (pendingEmail) {
    return (
      <CodeEntry
        email={pendingEmail}
        onVerified={handleVerified}
        onChangeEmail={() => {
          clearSignupPending();
          onPendingChange(null);
          setEmail("");
          setError(null);
        }}
        onBack={onSkip}
      />
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
          <ConsentLine />
        </form>
      </div>

      <button
        type="button"
        onClick={onSkip}
        className="-my-2 py-2 text-center text-[15px] text-ink-2 underline decoration-line-hover underline-offset-4 hover:text-ink"
      >
        Not now
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
