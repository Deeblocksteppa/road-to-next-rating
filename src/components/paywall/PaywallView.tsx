"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import { startCheckout } from "@/app/paywall/actions";

type Plan = "annual" | "monthly";

/*
 * Only what the subscription actually unlocks. "Your next bottleneck,
 * sequenced" used to be the fourth line, but every re-test diagnoses and
 * plans for the next bottleneck regardless of tier — it was never gated.
 */
const FEATURES = [
  "Per-skill re-test deltas — which skills moved, and how much",
  "Your readiness chart across every re-test, with logged sessions beneath it",
  "Re-test history and week-over-week session streaks",
];

export function PaywallView({ returnTo }: { returnTo: string }) {
  const [plan, setPlan] = useState<Plan>("annual");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleContinue() {
    setError(null);
    startTransition(async () => {
      const result = await startCheckout(plan, returnTo);

      if ("error" in result) {
        setError(result.error);
        return;
      }

      // Hand off to Stripe's hosted checkout page. Kept in the transition so
      // the button stays disabled through the navigation.
      window.location.href = result.url;
    });
  }

  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col bg-background px-6 py-8 text-ink">
      {/* Dismissing the paywall returns the user wherever they came from —
          the same `from` the Continue button uses after Stripe checkout. */}
      <header className="flex items-center pt-4">
        <Link
          href={returnTo}
          aria-label="Back"
          className="flex h-9 w-9 items-center justify-center rounded-md border border-line-strong text-[16px] text-ink-2 transition-colors hover:border-line-hover hover:text-ink"
        >
          ‹
        </Link>
      </header>

      {/* Content stays vertically centred in the space the header leaves. */}
      <div className="flex flex-1 flex-col justify-center gap-[22px] py-6">
        <div className="flex flex-col gap-2.5">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-3">
            You&apos;re improving — keep the receipts
          </p>
          <h1 className="text-balance font-display text-[30px] font-extrabold leading-[1.1] tracking-[-0.02em]">
            See every point you earn from here.
          </h1>
        </div>

        <div className="flex flex-col gap-3">
          {FEATURES.map((line) => (
            <div key={line} className="flex items-start gap-3">
              <span className="mt-[3px] text-sm leading-none text-optic">▪</span>
              <span className="text-[14.5px] leading-[1.45] text-ink">{line}</span>
            </div>
          ))}
        </div>

        <div className="mt-1 flex flex-col gap-2.5">
          <PlanCard
            selected={plan === "annual"}
            onSelect={() => setPlan("annual")}
            name="Annual"
            price="$79 / year · equivalent to $6.58 per month"
            badge="SAVE 17%"
          />
          <PlanCard
            selected={plan === "monthly"}
            onSelect={() => setPlan("monthly")}
            name="Monthly"
            price="$7.99 / month · billed monthly"
          />
        </div>

        <div className="mt-0.5 flex flex-col gap-2.5">
          <button
            type="button"
            onClick={handleContinue}
            disabled={pending}
            className="flex h-[52px] w-full items-center justify-center rounded-lg bg-optic text-[15px] font-semibold text-optic-ink transition-colors hover:bg-optic-hover active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60"
          >
            {pending
              ? "Taking you to checkout…"
              : plan === "annual"
                ? "Continue — $79/year"
                : "Continue — $7.99/month"}
          </button>
          {error && (
            <p role="alert" className="text-center text-[13px] leading-[1.45] text-danger">
              {error}
            </p>
          )}
          <p className="text-center font-mono text-[10px] uppercase tracking-[0.1em] text-ink-3">
            Secure checkout by Stripe · Cancel anytime
          </p>
        </div>
      </div>
    </main>
  );
}

function PlanCard({
  selected,
  onSelect,
  name,
  price,
  badge,
}: {
  selected: boolean;
  onSelect: () => void;
  name: string;
  price: string;
  badge?: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={[
        "flex w-full items-center justify-between rounded-xl border px-[18px] py-4 text-left transition-colors",
        selected
          ? "border-optic bg-optic/[0.05]"
          : "border-line-strong hover:border-line-hover",
      ].join(" ")}
    >
      <div className="flex flex-col gap-1">
        <span className={`text-[16px] font-semibold ${selected ? "text-ink" : "text-ink-2"}`}>
          {name}
        </span>
        <span className={`font-mono text-[11px] ${selected ? "text-ink-2" : "text-ink-3"}`}>
          {price}
        </span>
      </div>

      {badge ? (
        <span className="shrink-0 rounded-xs bg-optic px-2 py-1 font-mono text-[10px] tracking-[0.08em] text-optic-ink">
          {badge}
        </span>
      ) : (
        <span
          className={[
            "h-5 w-5 shrink-0 rounded-full border-[1.5px] box-border",
            selected ? "border-optic bg-optic" : "border-line-strong",
          ].join(" ")}
        />
      )}
    </button>
  );
}
