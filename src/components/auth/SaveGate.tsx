"use client";

import { useEffect, useRef, useState } from "react";

import { claimMySignup } from "@/app/auth/actions";
import { CodeEntry } from "@/components/auth/CodeEntry";
import { InlineLogIn } from "@/components/auth/InlineLogIn";
import { ConsentLine } from "@/components/legal/ConsentLine";
import { AUTH_ERRORS, authErrorCode, isEmailIntervalLimit } from "@/lib/auth-errors";
import { consentMetadata } from "@/lib/legal";
import { loadLocalResult } from "@/lib/local-result";
import { claimAnonymousResult, type SavedIds } from "@/lib/persistence";
import { clearSignupPending, saveSignupPending } from "@/lib/signup-pending";
import { createClient } from "@/lib/supabase/client";

/** Named in the password field's placeholder and enforced by it. Matches the reset flow. */
const MIN_PASSWORD_LENGTH = 8;

/**
 * Post-roadmap Save Gate. Creates an account, then claims the anonymous
 * assessment/diagnosis/plan rows into it.
 *
 * Three screens, never mixed:
 *
 *   - the form: a title, one line on what the account keeps, email and
 *     password in one block, "Create account", and "Not now" back to the plan;
 *   - the code screen (`CodeEntry`), shown once a sign-up is waiting on the
 *     6-digit code it emailed. It replaces the form outright;
 *   - the log-in (`InlineLogIn`), for an address that already has an account
 *     ("Log in" at the form's top right or on its existing-account note, or
 *     "Already confirmed? Log in" on the code screen or the plan's pending
 *     line). Logging in claims the plan the same way.
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
  pendingEmail,
  onPendingChange,
  reason = "save",
  initialView = "form",
}: {
  /** The anonymous result's save (`saveAnonymousResult`): the complete set of ids, or a rejection. */
  saveResult: () => Promise<SavedIds>;
  /** Back to the result page. */
  onSkip: () => void;
  /** The address a sign-up on this device is waiting on, if any. */
  pendingEmail: string | null;
  onPendingChange: (email: string | null) => void;
  /** Where the player goes once signed in: `session` from "Start session", the plan otherwise. */
  reason?: "save" | "session";
  /** `login`: opened from the plan's "Already confirmed? Log in", straight to the log-in. */
  initialView?: "form" | "login";
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // The address typed already has a confirmed account: the form says so and
  // offers the log-in in place of the sign-up. Editing the address clears it.
  const [existing, setExisting] = useState(false);
  const [view, setView] = useState<"form" | "login">(initialView);
  // The address the log-in opens with.
  const [loginEmail, setLoginEmail] = useState(initialView === "login" ? pendingEmail ?? "" : "");
  // Where the log-in's Back goes: the plan when the gate opened on it, else
  // back into the gate (the code screen while a sign-up waits, or the form).
  const [loginFrom, setLoginFrom] = useState<"plan" | "gate">(initialView === "login" ? "plan" : "gate");
  const logInRef = useRef<HTMLButtonElement>(null);

  // The note's "Log in" is the way on now; left on the sign-up button, Enter
  // would only ask again and get the same note.
  useEffect(() => {
    if (existing) logInRef.current?.focus();
  }, [existing]);

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
      const reason = authErrorCode(error);
      if (reason === "email_taken") {
        showExisting();
        return;
      }
      // Friendly fixed copy, not Supabase's raw wording (lib/auth-errors.ts).
      setError(AUTH_ERRORS[reason]);
      setLoading(false);
      return;
    }

    // An address that already has a confirmed account comes back as a user
    // with no identities and no email is sent. Asking for a code there would
    // leave the player waiting for an email that never arrives. Saying the
    // account exists confirms the address is registered; the owner chose to
    // say it (audit/signup-otp-plan.md, 5a).
    if (data.user && data.user.identities?.length === 0) {
      showExisting();
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

  function showExisting() {
    setExisting(true);
    setLoading(false);
  }

  function openLogIn(address: string) {
    setLoginEmail(address);
    setLoginFrom("gate");
    setError(null);
    setView("login");
    window.scrollTo(0, 0);
  }

  /**
   * Signed in by the code, by the link in another tab, or by logging in.
   * Claims the rows named in the sign-up's metadata (none, for an account
   * that confirmed long ago), then this device's own set, then goes where the
   * player was heading. If the device claim fails, the player is still signed
   * in and the device keeps its result: Home's claim tries again and says
   * "Plan saved" once it lands.
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

  /* ── The log-in ───────────────────────────────────────────── */
  if (view === "login") {
    return (
      <InlineLogIn
        initialEmail={loginEmail}
        onSignedIn={handleVerified}
        onUnconfirmed={(address) => {
          onPendingChange(address);
          setView("form");
          window.scrollTo(0, 0);
        }}
        // Back to where it opened from: the plan when it opened straight
        // here, else the code screen while a sign-up is waiting, else the form.
        onBack={() => {
          if (loginFrom === "plan") {
            onSkip();
            return;
          }
          setView("form");
          window.scrollTo(0, 0);
        }}
      />
    );
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
          setExisting(false);
          setError(null);
        }}
        onLogIn={() => openLogIn(pendingEmail)}
        onBack={onSkip}
      />
    );
  }

  /* ── The form ───────────────────────────────────────────────── */
  return (
    <main className="mx-auto flex min-h-app w-full max-w-md flex-col bg-background px-6 py-8 text-ink">
      {/* An account already: the log-in, with whatever address is typed. */}
      <div className="flex justify-end pt-1">
        <button
          type="button"
          onClick={() => openLogIn(email.trim())}
          disabled={loading}
          className="-my-2.5 py-2.5 text-[15px] text-ink-2 underline decoration-line-hover underline-offset-4 transition-colors hover:text-ink disabled:pointer-events-none disabled:opacity-60"
        >
          Log in
        </button>
      </div>

      <div className="flex flex-1 flex-col justify-center gap-6 py-10">
        <div className="flex flex-col gap-2.5">
          <h1 className="text-balance font-display text-[30px] font-extrabold leading-[1.1] tracking-[-0.02em]">
            Save your plan
          </h1>
          <p className="text-pretty text-[16px] leading-[1.55] text-ink-2">
            Free account. Your plan and session numbers stay with you.
          </p>
        </div>

        {error && (
          <p
            role="alert"
            className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-[16px] text-danger"
          >
            {error}
          </p>
        )}

        <form onSubmit={handleEmailSignup} className="flex flex-col gap-4">
          {/* One block, two rows. Each row keeps its label inside it, so the
              label is still there once the field is filled: a placeholder-only
              label disappears exactly when the player goes back to check what
              they typed. The focus ring sits inside the row it belongs to. */}
          <div className="flex flex-col rounded-md border border-line-strong bg-surface">
            <div className="flex flex-col gap-0.5 rounded-t-md px-4 pb-1.5 pt-2.5 has-[input:focus-visible]:outline has-[input:focus-visible]:outline-2 has-[input:focus-visible]:-outline-offset-2 has-[input:focus-visible]:outline-optic">
              <label
                htmlFor="email"
                className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setExisting(false);
                }}
                required
                className="h-8 w-full bg-transparent text-[16px] text-ink placeholder-ink-3 focus-visible:outline-none"
              />
            </div>
            <div className="h-px bg-line" />
            <div className="flex items-end gap-2 rounded-b-md pb-1.5 pl-4 pr-1 pt-2.5 has-[input:focus-visible]:outline has-[input:focus-visible]:outline-2 has-[input:focus-visible]:-outline-offset-2 has-[input:focus-visible]:outline-optic">
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <label
                  htmlFor="password"
                  className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3"
                >
                  Password
                </label>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  minLength={MIN_PASSWORD_LENGTH}
                  placeholder={`${MIN_PASSWORD_LENGTH}+ characters`}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-8 w-full bg-transparent text-[16px] text-ink placeholder-ink-3 focus-visible:outline-none"
                />
              </div>
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
          </div>

          {/* The address has an account already. The log-in takes the
              screen's one accent while this shows; the sign-up goes
              secondary. A neutral note, not an error: nothing went wrong. */}
          {existing && (
            <div role="status" className="flex flex-col gap-3 border-t border-line pt-4">
              <p className="text-[16px] leading-[1.5] text-ink">
                You already have an account with this email.
              </p>
              <button
                ref={logInRef}
                type="button"
                onClick={() => openLogIn(email.trim())}
                className="flex h-[52px] w-full items-center justify-center rounded-lg bg-optic text-[15px] font-semibold text-optic-ink transition-colors hover:bg-optic-hover active:scale-[0.98]"
              >
                Log in
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={[
              "flex h-[52px] w-full items-center justify-center rounded-lg text-[15px] font-semibold transition-colors active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60",
              existing
                ? "border border-line-strong bg-surface-2 text-ink hover:border-line-hover"
                : "bg-optic text-optic-ink hover:bg-optic-hover",
            ].join(" ")}
          >
            {loading ? "Creating account…" : "Create account"}
          </button>
          <ConsentLine />
        </form>

        <button
          type="button"
          onClick={onSkip}
          className="-my-2 self-start py-2 text-[15px] text-ink-2 underline decoration-line-hover underline-offset-4 transition-colors hover:text-ink"
        >
          Not now
        </button>
      </div>
    </main>
  );
}
