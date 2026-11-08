"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useFormStatus } from "react-dom";

import { claimMySignup, login, signInWithGoogle } from "@/app/auth/actions";
import { CodeEntry } from "@/components/auth/CodeEntry";
import { Logo } from "@/components/brand/Logo";
import { AUTH_ERRORS } from "@/lib/auth-errors";
import { GOOGLE_AUTH_ENABLED } from "@/lib/auth-flags";
import { afterClaimPath } from "@/lib/auth-redirect";
import { emailSignupCode } from "@/lib/signup-code";
import { clearSignupPending, loadSignupPending } from "@/lib/signup-pending";

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
    if (loadSignupPending()?.email === codeEmail) clearSignupPending();
    setCodeEmail(null);
    setEmail(nextEmail);
  }

  /** The code signed the player in: claim the sign-up's rows, then go on. */
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
    clearSignupPending();
    window.location.assign(afterClaimPath(claim, next));
  }

  if (codeEmail) {
    return (
      <CodeEntry
        email={codeEmail}
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

      {/* Top-aligned under the logo, so the fields and button stay above the keyboard. */}
      <div className="flex flex-1 flex-col gap-5 pb-10 pt-5">
        <h1 className="text-[1.875rem] font-extrabold leading-[1.1] tracking-[-0.02em] font-display">
          Welcome back.
        </h1>

        {/* A fixed set of notices, keyed — never free text from the URL. */}
        {deleted && (
          <p className="rounded-md border border-line bg-surface px-3 py-2 text-[16px] text-ink-2">
            Your account and everything saved to it have been deleted.
          </p>
        )}

        <form action={handleLogin} className="flex flex-col gap-3">
          <input type="hidden" name="next" value={next} />

          <label htmlFor="email" className="sr-only">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            // Usually arrives server-rendered after a redirect, where a screen
            // reader may not read the alert out: the fields name it instead.
            aria-invalid={shownError ? true : undefined}
            aria-describedby={shownError ? "login-error" : undefined}
            className="h-12 w-full rounded-md border border-line-strong bg-surface px-4 text-[16px] text-ink placeholder-ink-3 focus:border-line-hover"
          />

          {/* Password row with the inline FORGOT? link to the reset flow. */}
          {/* The ring goes on the row, not the bare input inside it, so it
              wraps the whole field the way every other input's does. */}
          <div className="flex h-12 w-full items-center rounded-md border border-line-strong bg-surface pl-4 pr-4 has-[input:focus-visible]:border-line-hover has-[input:focus-visible]:outline has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-optic">
            <label htmlFor="password" className="sr-only">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="Password"
              required
              aria-invalid={shownError ? true : undefined}
              aria-describedby={shownError ? "login-error" : undefined}
              className="flex-1 bg-transparent text-[16px] text-ink placeholder-ink-3 focus-visible:outline-none"
            />
            {/* `-my-4 py-4` buys a 47px tap target without growing the row. */}
            <Link
              href="/forgot-password"
              className="-my-4 shrink-0 py-4 pl-3 font-mono text-[10px] tracking-[0.08em] text-ink-2 underline decoration-line-hover underline-offset-4 transition-colors hover:text-ink"
            >
              FORGOT?
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
      </div>

      <p className="pb-2 text-[16px] text-ink-2">
        New here?{" "}
        <Link href="/start" className="underline underline-offset-4">
          Take the assessment
        </Link>
      </p>
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
