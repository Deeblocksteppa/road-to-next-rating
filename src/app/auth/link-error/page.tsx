import Link from "next/link";

import { resendConfirmation } from "@/app/auth/actions";
import { Logo } from "@/components/brand/Logo";
import { authErrorMessage } from "@/lib/auth-errors";

/**
 * Where a dead email link lands: an expired or already-used link, or an old
 * one opened in a different browser from the one that requested it.
 *
 * It used to drop the player on the log-in page with "Sign in couldn't be
 * completed", which named neither the cause nor the way out. This says what
 * happened and puts the fix one tap away: a new reset link, or a new
 * confirmation email (its code and link).
 *
 * All copy is fixed and chosen by two keyed params; nothing from the URL is
 * rendered.
 */
export default function LinkErrorPage({
  searchParams,
}: {
  searchParams: { kind?: string; reason?: string; sent?: string; error?: string };
}) {
  const isRecovery = searchParams.kind === "recovery";
  const sent = !isRecovery && searchParams.sent === "1";
  const errorMessage = authErrorMessage(searchParams.error);

  // "browser": a link from before the token-hash switch, which only worked in
  // the browser that asked for it. Otherwise it has expired or been used.
  const explanation =
    searchParams.reason === "browser"
      ? "This link expired or was opened in a different browser. Request a new one."
      : "This link has expired or was already used. Request a new one.";

  return (
    <main className="mx-auto flex min-h-app w-full max-w-md flex-col bg-background px-6 py-8 text-ink">
      <header className="pt-4">
        <Logo />
      </header>

      {/* Top-aligned under the logo on a phone, so the field and button stay above the keyboard; centered at 1024px and wider. */}
      <div className="flex flex-1 flex-col gap-5 pb-10 pt-5 lg:justify-center">
        <div className="flex flex-col gap-2.5">
          <h1 className="font-display text-[30px] font-extrabold leading-[1.1] tracking-[-0.02em]">
            {sent ? "Check your email." : "That link didn't work."}
          </h1>
          <p className="text-pretty text-[16px] leading-[1.55] text-ink-2">
            {sent
              ? "If that address has an account waiting to be confirmed, a new code and link are on their way. It can take a minute, and it may land in spam. Open the link, or log in and enter the latest code we sent."
              : explanation}
          </p>
        </div>

        {isRecovery ? (
          <Link
            href="/forgot-password"
            className="flex h-[52px] w-full items-center justify-center rounded-lg bg-optic text-[15px] font-semibold text-optic-ink transition-colors hover:bg-optic-hover active:scale-[0.98]"
          >
            Request a new link
          </Link>
        ) : (
          !sent && (
            <form action={resendConfirmation} className="flex flex-col gap-3">
              <label htmlFor="email" className="sr-only">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoCapitalize="off"
                autoCorrect="off"
                autoComplete="email"
                placeholder="Email address"
                required
                // Arrives server-rendered, where a screen reader may not read
                // the alert out: the field names it instead.
                aria-invalid={errorMessage ? true : undefined}
                aria-describedby={errorMessage ? "resend-error" : undefined}
                className="h-12 w-full rounded-md border border-line-strong bg-surface px-4 text-[16px] text-ink placeholder-ink-3 focus:border-line-hover"
              />
              <button
                type="submit"
                className="flex h-[52px] w-full items-center justify-center rounded-lg bg-optic text-[15px] font-semibold text-optic-ink transition-colors hover:bg-optic-hover active:scale-[0.98]"
              >
                Send a new code
              </button>
              {errorMessage && (
                <p id="resend-error" role="alert" className="text-[16px] leading-[1.5] text-danger">
                  {errorMessage}
                </p>
              )}
            </form>
          )
        )}
        {/* No redirect sends an error to these states today; shown anyway, so a future one isn't silent. */}
        {errorMessage && (isRecovery || sent) && (
          <p role="alert" className="text-[16px] leading-[1.5] text-danger">
            {errorMessage}
          </p>
        )}
      </div>

      <p className="pb-2 text-[16px] text-ink-2">
        {isRecovery ? (
          <Link href="/login" className="underline underline-offset-4">
            Back to log in
          </Link>
        ) : (
          <>
            Already confirmed?{" "}
            <Link href="/login" className="underline underline-offset-4">
              Log in
            </Link>
          </>
        )}
      </p>
    </main>
  );
}
