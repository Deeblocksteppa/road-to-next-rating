"use client";

import { Roadmap } from "@/lib/roadmap";

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
    <main
      className="flex min-h-[100dvh] w-full flex-col items-center justify-center bg-[#080b12] px-6 text-slate-100"
      style={{
        backgroundImage:
          "radial-gradient(120% 80% at 50% -10%, #0e1726 0%, #080b12 55%, #06080d 100%)",
      }}
    >
      <CommittedStyles />
      <div className="committed-in mx-auto w-full max-w-[520px] space-y-8 py-16 text-center">

        {/* Header */}
        <div className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-teal-400/80">
            You&apos;re locked in
          </p>
          <h1 className="text-4xl font-semibold leading-[1.1] tracking-tight text-slate-50 md:text-5xl">
            Your Road to 4.0 starts now.
          </h1>
        </div>

        {/* Summary card */}
        <div className="space-y-4 rounded-xl border border-slate-700/60 bg-slate-800/20 p-6 text-left">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="text-[13px] text-slate-500">Your bottleneck:</span>
            <span className="bg-gradient-to-r from-sky-400 to-emerald-400 bg-clip-text text-[15px] font-medium text-transparent">
              {roadmap.bottleneckLabel}
            </span>
          </div>
          <div className="h-px w-full bg-slate-800" />
          <p className="text-[14px] text-slate-300">
            <span className="text-[13px] text-slate-500">Your plan: </span>
            2 sessions a week · 15 min each
          </p>
          <div className="h-px w-full bg-slate-800" />
          <p className="text-[14px] text-slate-300">
            <span className="text-[13px] text-slate-500">Duration: </span>
            3 weeks
          </p>
          <div className="h-px w-full bg-slate-800" />
          <p className="text-[14px] text-slate-300">
            <span className="text-[13px] text-slate-500">Re-test date: </span>
            {retestLabel}
          </p>
        </div>

        {/* Screenshot nudge */}
        <p className="text-sm text-slate-400">Screenshot this — it&apos;s your commitment.</p>

        {/* Buttons */}
        <div className="space-y-3 pb-4">
          <button
            onClick={onBackToPlan}
            className={[
              "w-full rounded-xl bg-gradient-to-r from-sky-500 to-emerald-500",
              "py-4 text-[16px] font-medium text-white",
              "outline-none focus-visible:outline-none",
              "transition-all duration-150 hover:opacity-90 active:scale-[0.99]",
            ].join(" ")}
          >
            Back to my plan →
          </button>
          <button
            onClick={onStartOver}
            className={[
              "w-full rounded-xl border border-slate-700",
              "py-4 text-[15px] font-medium text-slate-400",
              "outline-none focus-visible:outline-none",
              "transition-all duration-150 hover:border-slate-600 hover:text-slate-300",
              "active:scale-[0.99]",
            ].join(" ")}
          >
            Start over
          </button>
        </div>
      </div>
    </main>
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
