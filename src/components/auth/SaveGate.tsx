"use client";

import Link from "next/link";
import { useState } from "react";

import { claimPendingRecords } from "@/lib/persistence";
import { createClient } from "@/lib/supabase/client";

/**
 * Post-roadmap Save Gate. Creates an account, then claims the anonymous
 * assessment/diagnosis/plan rows into it.
 *
 * - Email/password with confirmation OFF → session is live immediately, so we
 *   claim here and hard-navigate to /home.
 * - Email/password with confirmation ON, or Google OAuth → no session yet; the
 *   claim runs on /home via <ClaimOnLoad> once the round trip lands.
 * - An existing user instead lands on /login (below) — the same pending ids
 *   sit in localStorage and get claimed by <ClaimOnLoad> once they're signed in.
 */
export function SaveGate({
  onSkip,
  bottleneckLabel,
  weeksTarget,
}: {
  onSkip: () => void;
  bottleneckLabel: string;
  weeksTarget: number;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function handleEmailSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/home`,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    if (data.session) {
      // Signed in immediately — claim the anonymous rows, then go.
      try {
        await claimPendingRecords();
      } catch (err) {
        console.error("Failed to claim records:", err);
      }
      window.location.href = "/home";
      return;
    }

    // Email confirmation is enabled. Keep the pending ids in localStorage;
    // they'll be claimed on /home after the user confirms.
    setMessage(
      "Check your email to confirm your account. Your plan will be saved when you come back."
    );
    setLoading(false);
  }

  async function handleGoogle() {
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/home`,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    }
    // On success the browser is redirected to Google.
  }

  return (
    <main className="flex min-h-[100dvh] w-full flex-col justify-center gap-5 bg-background px-6 py-12 text-ink">
      <div className="flex flex-col gap-2.5">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-3">
          Your diagnosis is ready
        </p>
        <h1 className="text-[1.875rem] font-extrabold leading-[1.1] tracking-[-0.02em] font-display">
          Keep what you just found.
        </h1>
        <p className="text-pretty text-[14.5px] leading-[1.55] text-ink-2">
          Save your bottleneck and {weeksTarget}-week plan to your account so
          it&apos;s here tomorrow. Free — always.
        </p>
      </div>

      {/* Saving summary card — the real bottleneck/plan being saved */}
      <div className="flex flex-col gap-2 rounded-xl border border-line bg-surface px-[18px] py-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
          Saving
        </p>
        <div className="flex items-center gap-2.5">
          <span className="h-2 w-2 shrink-0 rounded-full bg-optic" />
          <span className="text-[15px] font-semibold">{bottleneckLabel}</span>
          <span className="text-[13px] text-ink-3">
            · {weeksTarget}-week plan
          </span>
        </div>
      </div>

      {error && (
        <p className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      {message ? (
        <p className="rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink-2">
          {message}
        </p>
      ) : (
        <>
          <div className="flex flex-col gap-3">
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

            <form onSubmit={handleEmailSignup} className="flex flex-col gap-3">
              <label htmlFor="email" className="sr-only">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-12 w-full rounded-md border border-line-strong bg-surface px-4 text-[15px] text-ink placeholder-ink-3 focus:border-line-hover focus:outline-none"
              />

              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                minLength={6}
                placeholder="Create a password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-12 w-full rounded-md border border-line-strong bg-surface px-4 text-[15px] text-ink placeholder-ink-3 focus:border-line-hover focus:outline-none"
              />

              <button
                type="submit"
                disabled={loading}
                className="flex h-[52px] w-full items-center justify-center rounded-lg bg-optic text-[15px] font-semibold text-optic-ink transition-colors hover:bg-optic-hover active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60"
              >
                {loading ? "Saving…" : "Save my plan"}
              </button>
            </form>
          </div>

          <button
            type="button"
            onClick={onSkip}
            className="text-center text-[13px] text-ink-2 underline underline-offset-4"
          >
            Maybe later
          </button>
        </>
      )}

      <p className="text-center text-[13px] text-ink-2">
        Already have an account?{" "}
        <Link href="/login" className="underline underline-offset-4">
          Sign in
        </Link>
      </p>
    </main>
  );
}
