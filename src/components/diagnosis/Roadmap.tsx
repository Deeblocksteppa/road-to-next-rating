"use client";

import { Drill } from "@/lib/drills";
import { Roadmap } from "@/lib/roadmap";

/**
 * The 3-week plan, shown once at the end of the anonymous funnel.
 *
 * Deliberately built in the same language as the signed-in `/plan` tab: the
 * two screens show the same content — drills, the in-game rule, the re-test —
 * and a player who sees one and then the other should recognise the second as
 * the same object, not as a different product. Labels, card shape, the
 * accent-tinted in-game rule and the primary button all match that screen.
 */
export function RoadmapScreen({ roadmap, onCommit }: { roadmap: Roadmap; onCommit: () => void }) {
  return (
    <main className="min-h-[100dvh] w-full bg-background text-ink">
      <RoadmapStyles />
      <div className="roadmap-in mx-auto w-full max-w-[600px] space-y-10 px-6 py-16 md:py-20">
        {/* Header */}
        <div className="space-y-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-3">
            Your plan
          </p>
          <h1 className="font-display text-[24px] font-bold leading-[1.25] tracking-[-0.01em] text-ink md:text-[32px] md:leading-[1.15]">
            {roadmap.goalLabel}
          </h1>
          <p className="text-pretty text-[15px] leading-[1.6] text-ink-2 md:text-[16px]">
            Your one job for the next {roadmap.weeksTarget} weeks: fix{" "}
            <span className="font-medium text-ink">{roadmap.bottleneckLabel}</span>.
          </p>
        </div>

        <Divider />

        {/* Drills */}
        <div className="space-y-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-3">
            2x a week · 15 min each
          </p>
          <div className="space-y-3">
            {roadmap.weeklyDrills.map((drill) => (
              <DrillCard key={drill.id} drill={drill} hasPartner={roadmap.hasPartner} />
            ))}
          </div>
        </div>

        <Divider />

        {/*
          The in-game rule is the accent-tinted card variant from DESIGN.md
          §Components — the treatment reserved for a moment the product wants
          to point at without spending a full CTA on it. It replaces a
          gradient hairline, which the Kill-the-Gradient rule forbids outright.
        */}
        <section className="flex flex-col gap-2 rounded-2xl border border-optic bg-optic/[0.04] px-5 py-[18px]">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-optic">
            In your games
          </p>
          <p className="text-pretty text-[15px] leading-[1.55] text-ink">{roadmap.inGameRule}</p>
        </section>

        <Divider />

        {/* Re-test */}
        <section className="flex flex-col gap-2 rounded-2xl border border-line bg-surface px-5 py-[18px]">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-3">
            Re-test in {roadmap.weeksTarget} weeks
          </p>
          <p className="text-[14px] leading-[1.55] text-ink-2">{roadmap.retestMetric}</p>
          {/* No calendar emoji: the system carries no iconography at all — the
              tab bar is text-only for the same reason. */}
          <p className="text-[13px] leading-[1.5] text-ink-3">
            Come back and re-take the assessment. We&apos;ll show you what moved.
          </p>
        </section>

        {/* CTA — the one accent-carrying element on this screen. */}
        <div className="pb-8 pt-2">
          <button
            onClick={onCommit}
            className="flex h-[52px] w-full items-center justify-center rounded-lg bg-optic text-[15px] font-semibold text-optic-ink transition-colors hover:bg-optic-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-optic active:scale-[0.98]"
          >
            I&apos;m in — let&apos;s go
          </button>
        </div>
      </div>
    </main>
  );
}

function DrillCard({ drill, hasPartner }: { drill: Drill; hasPartner: boolean }) {
  const showSoloBadge = drill.requiresPartner && !hasPartner;

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-line bg-surface px-5 py-[18px]">
      <div className="flex items-start justify-between gap-3">
        <p className="font-display text-[17px] font-semibold leading-[1.3] text-ink">
          {drill.name}
        </p>
        <div className="flex shrink-0 items-center gap-2">
          {/*
            Neutral, not `warn`. The state colours are a scale — warn means
            "due today", danger means "regressed" — and a solo variant is
            neither; it is a note about which version you are being given.
          */}
          {showSoloBadge && (
            <span className="shrink-0 rounded-xs border border-line-strong bg-surface-2 px-[9px] py-[5px] font-mono text-[10px] uppercase leading-none tracking-[0.1em] text-ink-3">
              Solo version
            </span>
          )}
          <span className="font-mono text-[11px] tabular-nums text-ink-3">{drill.duration}</span>
        </div>
      </div>
      <p className="text-[14px] leading-[1.55] text-ink-2">{drill.description}</p>
    </div>
  );
}

function Divider() {
  return <div className="h-px w-full bg-line" />;
}

function RoadmapStyles() {
  return (
    <style>{`
      @keyframes roadmapIn {
        from { opacity: 0; transform: translateY(14px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      .roadmap-in {
        animation: roadmapIn 0.7s cubic-bezier(0.22, 1, 0.36, 1) both;
      }
      @media (prefers-reduced-motion: reduce) {
        .roadmap-in { animation: none; }
      }
    `}</style>
  );
}
