"use client";

import { Roadmap } from "@/lib/roadmap";

/**
 * The funnel's closing confirmation, after the plan has been saved.
 *
 * Left-aligned, not centred: DESIGN.md reserves centring for the reveal
 * sequence, and the old centred header sat above a left-aligned summary card,
 * so the screen never lined up with itself anyway.
 */
export function CommittedScreen({
  roadmap,
  onBackToPlan,
  onStartOver,
}: {
  roadmap: Roadmap;
  onBackToPlan: () => void;
  onStartOver: () => void;
}) {
  const retestDate = new Date(Date.now() + 21 * 24 * 60 * 60 * 1000);
  const retestLabel = retestDate.toLocaleDateString("en-US", { month: "long", day: "numeric" });

  return (
    <main className="flex min-h-[100dvh] w-full flex-col justify-center bg-background px-6 text-ink">
      <CommittedStyles />
      <div className="committed-in mx-auto w-full max-w-[520px] space-y-8 py-16">
        {/* Header */}
        <div className="space-y-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-3">
            You&apos;re locked in
          </p>
          <h1 className="font-display text-[24px] font-bold leading-[1.25] tracking-[-0.01em] text-ink md:text-[32px] md:leading-[1.15]">
            Your Road to 4.0 starts now.
          </h1>
        </div>

        {/* Summary card. The bottleneck reads in `ink`, not the accent: the
            one thing this screen points at is the button. */}
        <div className="flex flex-col rounded-2xl border border-line bg-surface px-5 py-[18px]">
          <SummaryRow label="Your bottleneck" value={roadmap.bottleneckLabel} first />
          <SummaryRow label="Your plan" value="2 sessions a week · 15 min each" />
          <SummaryRow label="Duration" value={`${roadmap.weeksTarget} weeks`} />
          <SummaryRow label="Re-test date" value={retestLabel} />
        </div>

        <p className="text-[14px] leading-[1.55] text-ink-2">
          Screenshot this — it&apos;s your commitment.
        </p>

        {/* Buttons */}
        <div className="space-y-3 pb-4">
          <button
            onClick={onBackToPlan}
            className="flex h-[52px] w-full items-center justify-center rounded-lg bg-optic text-[15px] font-semibold text-optic-ink transition-colors hover:bg-optic-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-optic active:scale-[0.98]"
          >
            Back to my plan →
          </button>
          <button
            onClick={onStartOver}
            className="flex h-[52px] w-full items-center justify-center rounded-lg border border-line-strong bg-surface-2 text-[15px] font-semibold text-ink transition-colors hover:border-line-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-optic active:scale-[0.98]"
          >
            Start over
          </button>
        </div>
      </div>
    </main>
  );
}

/** One line of the summary, with the divider that separates it from the last. */
function SummaryRow({
  label,
  value,
  first = false,
}: {
  label: string;
  value: string;
  first?: boolean;
}) {
  return (
    // Label always above value, never beside it. Wrapping only when the value
    // is long left two rows stacked and two inline, which reads as a bug
    // rather than as a spec sheet.
    <div className={`flex flex-col gap-1 py-3 ${first ? "pt-0" : "border-t border-line"}`}>
      <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-3">{label}</span>
      <span className="text-[15px] font-medium leading-[1.4] text-ink">{value}</span>
    </div>
  );
}

function CommittedStyles() {
  return (
    <style>{`
      @keyframes committedIn {
        from { opacity: 0; transform: translateY(14px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      .committed-in {
        animation: committedIn 0.7s cubic-bezier(0.22, 1, 0.36, 1) both;
      }
      @media (prefers-reduced-motion: reduce) {
        .committed-in { animation: none; }
      }
    `}</style>
  );
}
