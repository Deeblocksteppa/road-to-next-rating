"use client";

import { useState } from "react";

import { ShotDemo } from "@/components/session/ShotDemo";
import { Drill } from "@/lib/drills";
import { Roadmap } from "@/lib/roadmap";
import { SESSIONS_PER_WEEK, sessionShape } from "@/lib/session-plan";

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
    <main className="min-h-app w-full bg-background text-ink">
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
          {/* Computed, never typed: this line used to read "2x a week · 15 min
              each" above a 15-minute drill and a 10-minute one. */}
          <div className="space-y-2">
            <p className="text-[15px] font-semibold text-ink">
              {SESSIONS_PER_WEEK} sessions a week · {sessionShape(roadmap.weeklyDrills)} each
            </p>
            <p className="text-[14px] leading-[1.55] text-ink-2">
              One session is {roadmap.weeklyDrills.length === 2 ? "both" : "all"} of these,
              back to back, on the same day.
              {/* Only a partner plan needs a partner booked; a solo plan
                  prescribes solo and wall drills. */}
              {roadmap.hasPartner && " Book the court and your partner for the whole thing."}
            </p>
          </div>
          <div className="space-y-3">
            {roadmap.weeklyDrills.map((drill) => (
              <DrillCard key={drill.id} drill={drill} />
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

/**
 * A drill on the plan. Collapsed, it is the same three rows as the Plan tab's
 * card: name, mono metadata, one sentence. Tapping it opens the full brief in
 * place: the technique instructions, the shot diagram and what gets logged,
 * the same fields the guided session's brief screen shows.
 *
 * One setup label only. A partner drill prescribed in its solo version used
 * to carry a "Solo version" badge beside a metadata line that already said
 * "Solo".
 */
export function DrillCard({ drill }: { drill: Drill }) {
  const [open, setOpen] = useState(false);
  const panelId = `drill-${drill.id}-brief`;

  return (
    <div className="rounded-2xl border border-line bg-surface transition-colors hover:border-line-hover">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full flex-col rounded-2xl px-5 py-4 text-left"
      >
        <span className="font-display text-[17px] font-semibold leading-[1.3] text-ink">
          {drill.name}
        </span>
        <span className="mt-1.5 font-mono text-[11px] uppercase leading-[1.5] tracking-[0.1em] text-ink-3">
          {drill.duration} · {drill.setup}
        </span>
        <span className="mt-2.5 text-pretty text-[14px] leading-[1.5] text-ink-2">{drill.task}</span>
        <span className="mt-3 font-mono text-[11px] uppercase tracking-[0.12em] text-ink-2 underline decoration-line-hover underline-offset-4">
          {open ? "Hide instructions" : "View instructions"}
        </span>
      </button>

      {open && (
        <div id={panelId} className="flex flex-col gap-4 border-t border-line px-5 pb-5 pt-4">
          <p className="text-pretty text-[15px] leading-[1.6] text-ink">{drill.description}</p>
          <ShotDemo drillId={drill.id} />
          <div className="flex flex-col gap-1.5">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-3">
              When the timer ends
            </p>
            <p className="text-pretty text-[14px] leading-[1.5] text-ink-2">
              <span className="font-semibold text-ink">{drill.logProtocol}</span> {drill.counts}
            </p>
            <p className="font-mono text-[11px] uppercase leading-[1.6] tracking-[0.1em] text-ink-2">
              Practice target <span className="text-ink">{drill.practiceTarget}</span>
            </p>
          </div>
        </div>
      )}
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
