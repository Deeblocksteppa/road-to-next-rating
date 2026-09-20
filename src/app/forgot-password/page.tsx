import Link from "next/link";

import { requestPasswordReset } from "@/app/auth/actions";
import { Logo } from "@/components/brand/Logo";

/**
 * Step one of the password reset: ask for the address, send the link.
 *
 * The confirmation is the same whether or not an account exists for the
 * address — saying "no such account" would let anyone test which emails are
 * registered here.
 */
export default function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: { sent?: string; error?: string };
}) {
  const sent = searchParams.sent === "1";

  return (
    <main className="flex min-h-[100dvh] w-full flex-col bg-background px-6 py-8 text-ink">
      <header className="pt-4">
        <Logo />
      </header>

      <div className="flex flex-1 flex-col justify-center gap-5 py-10">
        <div className="flex flex-col gap-2.5">
          <h1 className="font-display text-[1.875rem] font-extrabold leading-[1.1] tracking-[-0.02em]">
            Reset your password.
          </h1>
          <p className="text-pretty text-[14.5px] leading-[1.55] text-ink-2">
            {sent
              ? "If there is an account for that address, a reset link is on its way. It can take a minute, and it may land in spam."
              : "Enter the email you signed up with and we'll send you a link to choose a new password."}
          </p>
        </div>

        {searchParams.error && (
          <p className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
            {searchParams.error}
          </p>
        )}

        {!sent && (
          <form action={requestPasswordReset} className="flex flex-col gap-3">
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
              className="h-12 w-full rounded-md border border-line-strong bg-surface px-4 text-[15px] text-ink placeholder-ink-3 focus:border-line-hover focus:outline-none"
            />
            <button
              type="submit"
              className="flex h-[52px] w-full items-center justify-center rounded-lg bg-optic text-[15px] font-semibold text-optic-ink transition-colors hover:bg-optic-hover active:scale-[0.98]"
            >
              Send reset link
            </button>
          </form>
        )}
      </div>

      <p className="pb-2 text-center text-[13px] text-ink-2">
        <Link href="/login" className="underline underline-offset-4">
          Back to sign in
        </Link>
      </p>
    </main>
  );
}
