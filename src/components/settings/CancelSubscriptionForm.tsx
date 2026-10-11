"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { cancelSubscription, resumeSubscription } from "@/app/settings/actions";
import { SUPPORT_EMAIL, SUPPORT_MAILTO } from "@/lib/contact";

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
  // A failed cancel or resume shows one fixed message with a person to write
  // to, not the action's own text (which can be a raw Stripe error).
  const [failed, setFailed] = useState(false);
  const [pending, startTransition] = useTransition();

  function run(action: typeof cancelSubscription) {
    setFailed(false);
    startTransition(async () => {
      const result = await action();
      if ("error" in result) {
        setFailed(true);
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
        {failed && <SupportError />}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={() => run(cancelSubscription)}
        disabled={pending}
        // The Delete account button's recipe: danger text on a 12% danger
        // fill (~5.2:1). It was ink on solid danger, 3.06:1 and 2.37:1 on
        // hover — the billing action was the hardest text on the page to read.
        className="flex h-[52px] w-full items-center justify-center rounded-lg border border-danger bg-danger/[0.12] text-[15px] font-semibold text-danger transition-colors hover:bg-danger/[0.18] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60"
      >
        {pending ? "Canceling…" : "Cancel subscription"}
      </button>
      {failed && <SupportError />}
    </div>
  );
}

function SupportError() {
  return (
    <p role="alert" className="text-center text-[13px] leading-[1.45] text-danger">
      Something went wrong. Email{" "}
      <a href={SUPPORT_MAILTO} className="underline underline-offset-4">
        {SUPPORT_EMAIL}
      </a>{" "}
      and we&apos;ll sort it out.
    </p>
  );
}
