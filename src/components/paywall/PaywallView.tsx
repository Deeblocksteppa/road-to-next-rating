"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import { startCheckout } from "@/app/paywall/actions";
import type { Direction } from "@/lib/retest-view";

type Plan = "annual" | "monthly";

/*
 * Only what the subscription actually unlocks. "Your next bottleneck,
 * sequenced" used to be the fourth line, but every re-test diagnoses and
 * plans for the next bottleneck regardless of tier — it was never gated.
 */
const FEATURES = [
  "Each re-test's skill-by-skill breakdown, kept for every re-test you take",
  "Your readiness chart across every re-test, with logged sessions beneath it",
  "Re-test history and week-over-week session streaks",
];

/**
 * The headline follows the player's last re-test, because this screen is
 * usually reached straight from one. It used to open on "You're improving —
 * keep the receipts" for everyone, including a player whose score had just
 * fallen. With no re-test yet (reached from Settings, say) it stays neutral.
 */
function pitchFor(reading: { direction: Direction; change: number } | null): {
  eyebrow: string;
  headline: string;
} {
  if (!reading) return { eyebrow: "Progress", headline: "See what every re-test changes." };
  const points = (n: number) => `${n} point${n === 1 ? "" : "s"}`;
  switch (reading.direction) {
    case "up":
      return { eyebrow: `Up ${points(reading.change)}`, headline: "See where every point came from." };
    case "flat":
      return { eyebrow: "Score held", headline: "See what shifted underneath it." };
    case "down":
      return {
        eyebrow: `Down ${points(Math.abs(reading.change))}`,
        headline: "See which skills slipped, and which held.",
      };
  }
}

export function PaywallView({
  returnTo,
  reading,
}: {
  returnTo: string;
  /** Direction of the re-test the player came from, or their latest; null before any re-test. */
  reading: { direction: Direction; change: number } | null;
}) {
  const pitch = pitchFor(reading);
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
    <main className="mx-auto flex min-h-app w-full max-w-md flex-col bg-background px-6 py-8 text-ink">
      {/* Dismissing the paywall returns the user wherever they came from —
          the same `from` the Continue button uses after Stripe checkout. */}
      <header className="flex items-center pt-4">
        <Link
          href={returnTo}
          aria-label="Back"
          className="relative after:absolute after:-inset-1 after:content-[''] flex h-9 w-9 items-center justify-center rounded-md border border-line-strong text-[16px] text-ink-2 transition-colors hover:border-line-hover hover:text-ink"
        >
          ‹
        </Link>
      </header>

      {/* Content stays vertically centred in the space the header leaves. */}
      <div className="flex flex-1 flex-col justify-center gap-[22px] py-6">
        <div className="flex flex-col gap-2.5">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-3">
            {pitch.eyebrow}
          </p>
          <h1 className="text-balance font-display text-[30px] font-extrabold leading-[1.1] tracking-[-0.02em]">
            {pitch.headline}
          </h1>
        </div>

        <div className="flex flex-col gap-3">
          {FEATURES.map((line) => (
            <div key={line} className="flex items-start gap-3">
              <span className="mt-[3px] text-sm leading-none text-optic">▪</span>
              <span className="text-[15px] leading-[1.45] text-ink">{line}</span>
            </div>
          ))}
        </div>

        <div role="radiogroup" aria-label="Plan" className="mt-1 flex flex-col gap-2.5">
          <PlanCard
            selected={plan === "annual"}
            onSelect={() => setPlan("annual")}
            value="annual"
            name="Annual"
            price="$79 / year · equivalent to $6.58 per month"
            badge="SAVE 17%"
          />
          <PlanCard
            selected={plan === "monthly"}
            onSelect={() => setPlan("monthly")}
            value="monthly"
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
          <p className="text-center text-[13px] leading-[1.5] text-ink-3">
            Secure checkout by Stripe · Cancel anytime
          </p>
        </div>
      </div>
    </main>
  );
}

/**
 * A native radio inside each card, visually hidden: assistive tech hears
 * "Annual, radio button, checked, 1 of 2" and arrow keys switch plans. Both
 * cards carry the radio dot; the Annual card used to swap its dot for the
 * SAVE badge, so it had no selection indicator at all.
 */
function PlanCard({
  selected,
  onSelect,
  value,
  name,
  price,
  badge,
}: {
  selected: boolean;
  onSelect: () => void;
  value: Plan;
  name: string;
  price: string;
  badge?: string;
}) {
  return (
    <label
      className={[
        "flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl border px-[18px] py-4 text-left transition-colors",
        "has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-optic",
        selected
          ? "border-optic bg-optic/[0.05]"
          : "border-line-strong hover:border-line-hover",
      ].join(" ")}
    >
      <input
        type="radio"
        name="plan"
        value={value}
        checked={selected}
        onChange={onSelect}
        className="sr-only"
      />
      <div className="flex flex-col gap-1">
        <span className="flex items-center gap-2.5">
          <span className={`text-[16px] font-semibold ${selected ? "text-ink" : "text-ink-2"}`}>
            {name}
          </span>
          {badge && (
            <span className="shrink-0 rounded-xs bg-optic px-2 py-1 font-mono text-[10px] tracking-[0.08em] text-optic-ink">
              {badge}
            </span>
          )}
        </span>
        {/* Pricing terms are read, not scanned: body voice, per DESIGN.md. */}
        <span className={`text-[13px] leading-[1.45] ${selected ? "text-ink-2" : "text-ink-3"}`}>
          {price}
        </span>
      </div>

      <span
        aria-hidden="true"
        className={[
          "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-[1.5px] box-border",
          selected ? "border-optic" : "border-line-strong",
        ].join(" ")}
      >
        {selected && <span className="h-2.5 w-2.5 rounded-full bg-optic" />}
      </span>
    </label>
  );
}
