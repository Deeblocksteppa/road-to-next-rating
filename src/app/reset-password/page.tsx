import { redirect } from "next/navigation";

import { updatePassword } from "@/app/auth/actions";
import { Logo } from "@/components/brand/Logo";
import { createClient } from "@/lib/supabase/server";
import { authErrorMessage } from "@/lib/auth-errors";

export const dynamic = "force-dynamic";

/**
 * Step two of the password reset: choose the new password.
 *
 * Reached from the emailed link, which goes through /auth/callback (PKCE code)
 * or /auth/confirm (token hash) — either one leaves a recovery session in the
 * cookie before landing here. No session means the link was never followed, or
 * it has expired, so the only useful move is to send them back to ask again.
 */
export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  // Fixed copy keyed by code; the URL's own text is never shown (lib/auth-errors.ts).
  const errorMessage = authErrorMessage(searchParams.error);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/forgot-password?error=link_expired");
  }

  return (
    <main className="mx-auto flex min-h-app w-full max-w-md flex-col bg-background px-6 py-8 text-ink">
      <header className="pt-4">
        <Logo />
      </header>

      <div className="flex flex-1 flex-col justify-center gap-5 py-10">
        <div className="flex flex-col gap-2.5">
          <h1 className="font-display text-[1.875rem] font-extrabold leading-[1.1] tracking-[-0.02em]">
            Choose a new password.
          </h1>
          <p className="text-pretty text-[15px] leading-[1.55] text-ink-2">
            For {user.email}. At least 8 characters.
          </p>
        </div>

        {errorMessage && (
          <p role="alert" className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
            {errorMessage}
          </p>
        )}

        <form action={updatePassword} className="flex flex-col gap-3">
          <label htmlFor="password" className="sr-only">
            New password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            placeholder="New password"
            minLength={8}
            required
            className="h-12 w-full rounded-md border border-line-strong bg-surface px-4 text-[15px] text-ink placeholder-ink-3 focus:border-line-hover"
          />
          <label htmlFor="confirm" className="sr-only">
            Repeat new password
          </label>
          <input
            id="confirm"
            name="confirm"
            type="password"
            autoComplete="new-password"
            placeholder="Repeat new password"
            minLength={8}
            required
            className="h-12 w-full rounded-md border border-line-strong bg-surface px-4 text-[15px] text-ink placeholder-ink-3 focus:border-line-hover"
          />
          <button
            type="submit"
            className="flex h-[52px] w-full items-center justify-center rounded-lg bg-optic text-[15px] font-semibold text-optic-ink transition-colors hover:bg-optic-hover active:scale-[0.98]"
          >
            Save new password
          </button>
        </form>
      </div>
    </main>
  );
}
