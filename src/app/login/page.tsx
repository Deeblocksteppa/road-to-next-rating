import Link from "next/link";

import { login, signInWithGoogle } from "@/app/auth/actions";
import { Logo } from "@/components/brand/Logo";

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string; next?: string };
}) {
  const next = searchParams.next ?? "/home";

  return (
    <main className="flex min-h-[100dvh] w-full flex-col bg-background px-6 py-8 text-ink">
      <header className="pt-4">
        <Logo />
      </header>

      <div className="flex flex-1 flex-col justify-center gap-5 py-10">
        <h1 className="text-[1.875rem] font-extrabold leading-[1.1] tracking-[-0.02em] font-display">
          Welcome back.
        </h1>

        {searchParams.error && (
          <p className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
            {searchParams.error}
          </p>
        )}

        <form action={login} className="flex flex-col gap-3">
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
            required
            className="h-12 w-full rounded-md border border-line-strong bg-surface px-4 text-[15px] text-ink placeholder-ink-3 focus:border-line-hover focus:outline-none"
          />

          {/* Password row with the inline (placeholder, non-functional) FORGOT? affordance */}
          <div className="flex h-12 w-full items-center rounded-md border border-line-strong bg-surface pl-4 pr-4">
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
              className="flex-1 bg-transparent text-[15px] text-ink placeholder-ink-3 outline-none"
            />
            <span className="shrink-0 pl-2 font-mono text-[10px] tracking-[0.08em] text-ink-3">
              FORGOT?
            </span>
          </div>

          <button
            type="submit"
            className="flex h-[52px] w-full items-center justify-center rounded-lg bg-optic text-[15px] font-semibold text-optic-ink transition-colors hover:bg-optic-hover active:scale-[0.98]"
          >
            Sign in
          </button>
        </form>

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
      </div>

      <p className="pb-2 text-center text-[13px] text-ink-2">
        New here?{" "}
        <Link href="/start" className="underline underline-offset-4">
          Take the assessment
        </Link>
      </p>
    </main>
  );
}
