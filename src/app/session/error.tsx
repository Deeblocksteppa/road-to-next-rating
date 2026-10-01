"use client";

import Link from "next/link";
import { useEffect } from "react";

/**
 * Recovery for the guided session. A thrown error used to surface as Next's
 * bare "Application error" page with nothing to tap. Retry re-renders the
 * segment; because every logged drill is already on the server, a retry
 * resumes at the first drill not yet logged rather than starting over.
 */
export default function SessionError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("guided session crashed", error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-app w-full max-w-md flex-col gap-6 bg-background px-6 py-8 text-ink">
      <div className="flex-1" />
      <div className="flex flex-col gap-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-3">
          Something broke
        </p>
        <h1 className="font-display text-[28px] font-extrabold leading-[1.15] tracking-[-0.01em]">
          The session screen hit an error.
        </h1>
        <p className="text-[15px] leading-[1.6] text-ink-2">
          Anything you already logged is saved. Retry picks up at the first drill that
          isn&apos;t logged yet.
        </p>
      </div>
      <div className="flex-1" />
      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={reset}
          className="flex h-[52px] w-full items-center justify-center rounded-lg bg-optic text-[15px] font-semibold text-optic-ink transition-colors hover:bg-optic-hover active:scale-[0.98]"
        >
          Retry
        </button>
        <Link
          href="/plan"
          className="flex h-[52px] w-full items-center justify-center rounded-lg border border-line-strong bg-surface-2 text-[15px] font-semibold text-ink transition-colors hover:border-line-hover"
        >
          Back to plan
        </Link>
      </div>
    </main>
  );
}
