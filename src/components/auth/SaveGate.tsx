"use client";

import { useEffect, useRef, useState } from "react";

import { claimMySignup } from "@/app/auth/actions";
import { CodeEntry } from "@/components/auth/CodeEntry";
import { CredentialFields } from "@/components/auth/CredentialFields";
import { InlineLogIn } from "@/components/auth/InlineLogIn";
import { ConsentLine } from "@/components/legal/ConsentLine";
import { AUTH_ERRORS, authErrorCode, isEmailIntervalLimit } from "@/lib/auth-errors";
import { consentMetadata } from "@/lib/legal";
import { loadLocalResult } from "@/lib/local-result";
import {
  claimAnonymousResult,
  clearOwnSignupPending,
  PendingOtherAccountError,
  type SavedIds,
} from "@/lib/persistence";
import { clearSignupPending, saveSignupPending } from "@/lib/signup-pending";
import { createClient } from "@/lib/supabase/client";

/** Named in the password field's placeholder and enforced by it. Matches the reset flow. */
const MIN_PASSWORD_LENGTH = 8;

/**
 * Post-roadmap Save Gate. Creates an account, then claims the anonymous
 * assessment/diagnosis/plan rows into it.
 *
 * Three screens, never mixed, each top-aligned on a phone so the field and
 * its button stay above the keyboard the autofocus opens (centered at 768px
 * and wider):
 *
 *   - the form: a title, one line on what the account keeps, email and
 *     password in one block, "Create account", and "Back to my plan";
 *   - the code screen (`CodeEntry`), shown once a sign-up is waiting on the
 *     6-digit code it emailed. It replaces the form outright;
 *   - the log-in (`InlineLogIn`), for an address that already has an account
 *     ("Already have an account? Log in" at the form's top right, "Log in" on
 *     its existing-account note, or
 *     "Already confirmed? Log in" on the code screen). Logging in claims the
 *     plan the same way.
 *
 * Nothing is sent until the result's save (`saveResult`) has finished with
 * all three rows: the sign-up carries their ids, and a partial set is never
 * claimed. If the save still fails, the form shows an error and stays put.
 *
 * - Confirmation OFF → a session is live immediately: claim here, go to Home.
 * - Confirmation ON → no session yet. The plan stays on this device (nothing
 *   is cleared) and the device remembers the pending sign-up. The code typed
 *   here signs the player in on this screen, which claims the plan and goes
 *   to Home (`handleVerified`), where "Plan saved" confirms it. The emailed
 *   link does the same from any device, landing on Home too (/auth/confirm).
 *
 * Every way through this form ends on Home: the plan's "Save my plan" is the
 * only way in, and sessions start from Home or the Plan tab.
 */
export function SaveGate({
  saveResult,
  onSkip,
  pendingEmail,
  onPendingChange,
}: {
  /** The anonymous result's save (`saveAnonymousResult`): the complete set of ids, or a rejection. */
  saveResult: () => Promise<SavedIds>;
  /** Back to the result page. */
  onSkip: () => void;
  /** The address a sign-up on this device is waiting on, if any. */
  pendingEmail: string | null;
  onPendingChange: (email: string | null) => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // The address typed already has a confirmed account: the form says so and
  // offers the log-in in place of the sign-up. Editing the address clears it.
  const [existing, setExisting] = useState(false);
  const [view, setView] = useState<"form" | "login">("form");
  // The address the log-in opens with.
  const [loginEmail, setLoginEmail] = useState("");
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
      // Signed in immediately — claim the anonymous rows, then go. A sign-up
      // here is the player's choice of account. On a failure the device keeps
      // its result and Home's claim tries again.
      // The player chose this account: no other sign-up's note survives, so
      // if this claim fails, Home's automatic retry claims for this account.
      clearSignupPending();
      try {
        await claimAnonymousResult(ids, { explicitChoice: true });
      } catch (err) {
        console.error("Failed to claim records:", err);
      }
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
    setError(null);
    setView("login");
    window.scrollTo(0, 0);
  }

  /**
   * Signed in by the code, by the link in another tab, or by logging in.
   * Claims the rows named in the sign-up's metadata (none, for an account
   * that confirmed long ago), then this device's own set, then goes to Home,
   * which says "Plan saved" (`?saved=1`) when a claim went through. If the
   * device claim fails, the player is still signed in and the device keeps
   * its result: Home's claim tries again and says "Plan saved" once it lands.
   *
   * A typed code or a log-in here is the player choosing this account
   * (owner, 2026-11-07), confirmed or not: the result goes to it even when
   * the pending note names another address, and the note goes. The code
   * screen's focus check (`elsewhere`) is automatic and keeps the note check.
   */
  async function handleVerified(how: "code" | "login" | "elsewhere") {
    const explicitChoice = how !== "elsewhere";
    // Done with any pending sign-up: the chosen account's, or every one.
    const dropNote = () => (explicitChoice ? clearSignupPending() : clearOwnSignupPending());
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
      await dropNote();
      window.location.assign("/home?expired=1");
      return;
    }

    // Chosen: the note goes now, not only after a successful claim, so a
    // failed claim leaves Home's automatic retry claiming for this account
    // (and a ClaimIncompleteError reaches /start's own-assessment path).
    if (explicitChoice) clearSignupPending();

    if (deviceHasResult) {
      try {
        // Clears the pending note once claimed. An automatic claim refuses
        // (clearing nothing) when the account signed in isn't the one the
        // note names.
        await claimAnonymousResult(await saveResult(), { explicitChoice });
      } catch (err) {
        if (!(err instanceof PendingOtherAccountError)) {
          console.error("Failed to claim records:", err);
        }
        // Not saved. Home's claim retries a failure, and checks the note again.
        window.location.assign("/home");
        return;
      }
    } else {
      await dropNote();
    }
    // Home, with "Plan saved" when rows were claimed here: this device's set
    // just now, or the sign-up's own set above. With nothing claimed (an
    // account that had its plan already), Home with no flag.
    const saved = deviceHasResult || claim === "claimed";
    window.location.assign(saved ? "/home?saved=1" : "/home");
  }

  /* ── The log-in ───────────────────────────────────────────── */
  if (view === "login") {
    return (
      <InlineLogIn
        initialEmail={loginEmail}
        onSignedIn={() => handleVerified("login")}
        onUnconfirmed={(address) => {
          onPendingChange(address);
          setView("form");
          window.scrollTo(0, 0);
        }}
        // Back to the code screen while a sign-up is waiting, else the form:
        // the label only names the form when that is where it goes.
        backLabel={pendingEmail ? "Back" : "Back to save your plan"}
        onBack={() => {
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
    <main className="mx-auto flex min-h-app w-full max-w-md flex-col bg-background px-6 pb-12 pt-8 text-ink">
      {/* An account already: the log-in, with whatever address is typed. */}
      <p className="flex justify-end pt-1 text-[16px] leading-[1.5] text-ink-2">
        <span>
          Already have an account?{" "}
          <button
            type="button"
            onClick={() => openLogIn(email.trim())}
            disabled={loading}
            className="-my-2.5 py-2.5 text-ink-2 underline decoration-line-hover underline-offset-4 transition-colors hover:text-ink disabled:pointer-events-none disabled:opacity-60"
          >
            Log in
          </button>
        </span>
      </p>

      {/* The form centers in the space under the top row at 768px and wider;
          the log-in line above stays at the top of the screen. */}
      <div className="flex flex-1 flex-col gap-6 pt-6 md:justify-center">
        <div className="flex flex-col gap-2.5">
          <h1 className="text-balance font-display text-[30px] font-extrabold leading-[1.1] tracking-[-0.02em]">
            Save your plan
          </h1>
          <p className="text-pretty text-[16px] leading-[1.55] text-ink-2">
            Free account. Your plan and session numbers stay with you.
          </p>
        </div>

        <form onSubmit={handleEmailSignup} className="flex flex-col gap-4">
          <CredentialFields
            idPrefix="signup"
            email={email}
            onEmailChange={(value) => {
              setEmail(value);
              setExisting(false);
            }}
            password={password}
            onPasswordChange={setPassword}
            passwordAutoComplete="new-password"
            passwordPlaceholder={`${MIN_PASSWORD_LENGTH}+ characters`}
            minLength={MIN_PASSWORD_LENGTH}
          />

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
          {error && (
            <p role="alert" className="text-[16px] leading-[1.5] text-danger">
              {error}
            </p>
          )}
          <ConsentLine />
        </form>

        <button
          type="button"
          onClick={onSkip}
          className="-my-2 self-start py-2 text-[15px] text-ink-2 underline decoration-line-hover underline-offset-4 transition-colors hover:text-ink"
        >
          Back to my plan
        </button>
      </div>
    </main>
  );
}
