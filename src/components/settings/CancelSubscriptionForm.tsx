"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { cancelSubscription, resumeSubscription } from "@/app/settings/actions";

/**
 * Cancel / resume controls for a live Stripe subscription.
 *
 * The button reports only what Stripe confirmed: it stays in "Canceling…"
 * until the API call returns, and the page it refreshes into reads the flag
 * Stripe sent back. Nothing here optimistically claims the subscription ended.
 */
export function CancelSubscriptionForm({
  cancelPending,
  untilLabel,
}: {
  cancelPending: boolean;
  untilLabel: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run(action: typeof cancelSubscription) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if ("error" in result) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  if (cancelPending) {
    return (
      <div className="flex flex-col gap-3">
        <p className="rounded-xl border border-line bg-surface px-[18px] py-4 text-[14px] leading-[1.5] text-ink-2">
          Your subscription is set to cancel. You keep Progress access until{" "}
          <span className="text-ink">{untilLabel}</span>, then you move to the
          free plan.
        </p>
        <button
          type="button"
          onClick={() => run(resumeSubscription)}
          disabled={pending}
          className="flex h-[52px] w-full items-center justify-center rounded-lg bg-optic text-[15px] font-semibold text-optic-ink transition-colors hover:bg-optic-hover active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60"
        >
          {pending ? "Resuming…" : "Keep my subscription"}
        </button>
        {error && (
          <p role="alert" className="text-center text-[13px] leading-[1.45] text-danger">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={() => run(cancelSubscription)}
        disabled={pending}
        className="flex h-[52px] w-full items-center justify-center rounded-lg bg-danger text-[15px] font-semibold text-ink transition-colors hover:bg-danger-hover active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60"
      >
        {pending ? "Canceling…" : "Cancel subscription"}
      </button>
      {error && (
        <p role="alert" className="text-center text-[13px] leading-[1.45] text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
