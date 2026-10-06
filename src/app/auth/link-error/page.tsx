import Link from "next/link";

import { resendConfirmation } from "@/app/auth/actions";
import { Logo } from "@/components/brand/Logo";
import { authErrorMessage } from "@/lib/auth-errors";

/**
 * Where a dead email link lands: an expired or already-used link, or an old
 * one opened in a different browser from the one that requested it.
 *
 * It used to drop the player on Sign in with "Sign in couldn't be
 * completed", which named neither the cause nor the way out. This says what
 * happened and puts the fix one tap away: a new reset link, or a new
 * confirmation email.
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

      <div className="flex flex-1 flex-col justify-center gap-5 py-10">
        <div className="flex flex-col gap-2.5">
          <h1 className="font-display text-[30px] font-extrabold leading-[1.1] tracking-[-0.02em]">
            {sent ? "Check your email." : "That link didn't work."}
          </h1>
          <p className="text-pretty text-[15px] leading-[1.55] text-ink-2">
            {sent
              ? "If that address has an account waiting to be confirmed, a new link is on its way. It can take a minute, and it may land in spam."
              : explanation}
          </p>
        </div>

        {errorMessage && (
          <p
            role="alert"
            className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger"
          >
            {errorMessage}
          </p>
        )}

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
                autoComplete="email"
                placeholder="Email address"
                required
                className="h-12 w-full rounded-md border border-line-strong bg-surface px-4 text-[15px] text-ink placeholder-ink-3 focus:border-line-hover"
              />
              <button
                type="submit"
                className="flex h-[52px] w-full items-center justify-center rounded-lg bg-optic text-[15px] font-semibold text-optic-ink transition-colors hover:bg-optic-hover active:scale-[0.98]"
              >
                Send a new confirmation link
              </button>
            </form>
          )
        )}
      </div>

      <p className="pb-2 text-center text-[13px] text-ink-2">
        {isRecovery ? (
          <Link href="/login" className="underline underline-offset-4">
            Back to sign in
          </Link>
        ) : (
          <>
            Already confirmed?{" "}
            <Link href="/login" className="underline underline-offset-4">
              Sign in
            </Link>
          </>
        )}
      </p>
    </main>
  );
}
