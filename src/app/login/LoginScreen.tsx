"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useFormStatus } from "react-dom";

import { claimMySignup, login, signInWithGoogle } from "@/app/auth/actions";
import { CodeEntry } from "@/components/auth/CodeEntry";
import { CredentialFields } from "@/components/auth/CredentialFields";
import { Logo } from "@/components/brand/Logo";
import { AUTH_ERRORS } from "@/lib/auth-errors";
import { GOOGLE_AUTH_ENABLED } from "@/lib/auth-flags";
import { afterClaimPath } from "@/lib/auth-redirect";
import { emailSignupCode } from "@/lib/signup-code";
import { clearSignupPending, signupPendingIs } from "@/lib/signup-pending";

/**
 * The log-in page's form, and the code screen it turns into for an account
 * still waiting on its sign-up code. The `login` action answers that case
 * with the address instead of a redirect; this emails a fresh code from the
 * browser and asks for it in place. The address stays in state, never in the
 * URL, so a refresh is back to the form (and logging in again lands here).
 */
export function LoginScreen({
  next,
  errorMessage,
  deleted,
}: {
  /** Same-site path to go to once signed in. */
  next: string;
  /** Fixed copy for the URL's `?error=` code, if any. */
  errorMessage: string | null;
  /** Arrived from account deletion. */
  deleted: boolean;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [codeEmail, setCodeEmail] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  // An error from this page's own work (the code email), shown over the URL's.
  const [localError, setLocalError] = useState<string | null>(null);

  async function handleLogin(formData: FormData) {
    setLocalError(null);
    const result = await login(formData);
    // Anything else redirected: signed in, or back here with an error code.
    if (!result) return;

    setSending(true);
    let sent: Awaited<ReturnType<typeof emailSignupCode>> = "generic";
    try {
      sent = await emailSignupCode(result.unconfirmed, { keepOther: true });
    } catch (err) {
      console.error("Couldn't email a code", err);
    } finally {
      setSending(false);
    }
    if (sent === "sent") {
      // The form comes back empty of the password, as it did when it was
      // unmounted behind the code screen: "Change email" must not leave one
      // account's password sitting under an empty address.
      setPassword("");
      setCodeEmail(result.unconfirmed);
      // The password matched, so an `?error=` left from an earlier try no
      // longer applies; drop it before the form can show again.
      if (errorMessage) {
        router.replace(next === "/home" ? "/login" : `/login?next=${encodeURIComponent(next)}`);
      }
      window.scrollTo(0, 0);
    } else {
      setLocalError(AUTH_ERRORS[sent]);
    }
  }

  /** Off the code screen: drop this page's pending note, never another address's. */
  function leaveCode(nextEmail: string) {
    if (codeEmail && signupPendingIs(codeEmail)) clearSignupPending();
    setCodeEmail(null);
    setEmail(nextEmail);
  }

  /**
   * The code signed the player in: claim the sign-up's rows, then go on.
   * Takes no `how`: /login never claims the device's result (Home's
   * automatic claim does), so nothing here may pass an explicit choice.
   */
  async function handleVerified() {
    let claim: Awaited<ReturnType<typeof claimMySignup>> = "none";
    try {
      const result = await claimMySignup();
      // Only a real answer counts: a response that didn't come back as one
      // must not put "Plan saved" on Home.
      if (result === "claimed" || result === "expired") claim = result;
    } catch (err) {
      console.error("Failed to claim the sign-up's records:", err);
    }
    // This page's own note only (the code just signed in its address); a
    // sign-up for another address waiting on this device keeps its note, and
    // Home won't claim the device's result for this account.
    if (codeEmail && signupPendingIs(codeEmail)) clearSignupPending();
    window.location.assign(afterClaimPath(claim, next));
  }

  if (codeEmail) {
    return (
      <CodeEntry
        email={codeEmail}
        keepOtherNote
        onVerified={handleVerified}
        onChangeEmail={() => leaveCode("")}
        // Confirmed meanwhile (the link, on another device): the password
        // now logs in.
        onLogIn={() => leaveCode(codeEmail)}
      />
    );
  }

  const shownError = localError ?? errorMessage;

  return (
    <main className="mx-auto flex min-h-app w-full max-w-md flex-col bg-background px-6 py-8 text-ink">
      <header className="pt-4">
        <Logo />
      </header>

      {/* Top-aligned under the logo on a phone, so the fields and button stay
          above the keyboard. Centered in the space left at 768px and wider. */}
      <div className="flex flex-1 flex-col gap-5 pb-10 pt-5 md:justify-center">
        <h1 className="text-[1.875rem] font-extrabold leading-[1.1] tracking-[-0.02em] font-display">
          Welcome back.
        </h1>

        {/* A fixed set of notices, keyed — never free text from the URL. */}
        {deleted && (
          <p className="rounded-md border border-line bg-surface px-3 py-2 text-[16px] text-ink-2">
            Your account and everything saved to it have been deleted.
          </p>
        )}

        <form action={handleLogin} className="flex flex-col gap-4">
          <input type="hidden" name="next" value={next} />

          <div className="flex flex-col gap-1.5">
            {/* The save form's block. Named, because this form posts to the
                `login` action. An error usually arrives server-rendered after
                a redirect, where a screen reader may not read the alert out:
                the fields name it instead. */}
            <CredentialFields
              idPrefix="login"
              names={{ email: "email", password: "password" }}
              email={email}
              onEmailChange={setEmail}
              password={password}
              onPasswordChange={setPassword}
              passwordAutoComplete="current-password"
              describedBy={shownError ? "login-error" : undefined}
            />
            <Link
              href="/forgot-password"
              className="-mb-2.5 flex min-h-11 items-center self-start text-[15px] text-ink-2 underline decoration-line-hover underline-offset-4 transition-colors hover:text-ink"
            >
              Forgot password?
            </Link>
          </div>

          <SubmitButton busy={sending} />
          {shownError && (
            <p id="login-error" role="alert" className="text-[16px] leading-[1.5] text-danger">
              {shownError}
            </p>
          )}
        </form>

        {/* Hidden until the provider is really on — see `auth-flags.ts`. */}
        {GOOGLE_AUTH_ENABLED && (
          <>
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-line" />
              <span className="font-mono text-[10px] text-ink-3">OR</span>
              <div className="h-px flex-1 bg-line" />
            </div>

            <form action={signInWithGoogle}>
              <input type="hidden" name="next" value={next} />
              <button
                type="submit"
                className="flex h-[52px] w-full items-center justify-center gap-2.5 rounded-lg border border-line-strong bg-surface-2 text-[15px] font-semibold text-ink transition-colors hover:border-line-hover"
              >
                <span className="font-display text-[15px] font-extrabold">G</span>
                Continue with Google
              </button>
            </form>
          </>
        )}

        {/* Directly under the form, not at the foot of the page. */}
        <p className="text-[16px] text-ink-2">
          New here?{" "}
          <Link href="/start" className="underline underline-offset-4">
            Take the assessment
          </Link>
        </p>
      </div>
    </main>
  );
}

/** Disabled while the log-in, or the code email after it, is in flight. */
function SubmitButton({ busy }: { busy: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || busy}
      className="flex h-[52px] w-full items-center justify-center rounded-lg bg-optic text-[15px] font-semibold text-optic-ink transition-colors hover:bg-optic-hover active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60"
    >
      Log in
    </button>
  );
}
