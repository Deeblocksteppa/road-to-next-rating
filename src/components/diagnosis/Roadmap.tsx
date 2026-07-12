"use client";

import { Drill } from "@/lib/drills";
import { Roadmap } from "@/lib/roadmap";

export function RoadmapScreen({ roadmap, onCommit }: { roadmap: Roadmap; onCommit: () => void }) {
  return (
    <main
      className="min-h-[100dvh] w-full bg-[#080b12] text-slate-100"
      style={{
        backgroundImage:
          "radial-gradient(120% 80% at 50% -10%, #0e1726 0%, #080b12 55%, #06080d 100%)",
      }}
    >
      <RoadmapStyles />
      <div className="roadmap-in mx-auto w-full max-w-[600px] space-y-10 px-6 py-16 md:py-20">

        {/* Header */}
        <div className="space-y-3 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-teal-400/80">
            Your plan
          </p>
          <h1 className="text-4xl font-semibold leading-[1.1] tracking-tight text-slate-50 md:text-5xl">
            {roadmap.goalLabel}
          </h1>
          <p className="text-[17px] leading-relaxed text-slate-400">
            Your one job for the next {roadmap.weeksTarget} weeks: fix{" "}
            <span className="font-medium text-slate-200">{roadmap.bottleneckLabel}</span>.
          </p>
        </div>

        <Divider />

        {/* Drills */}
        <div className="space-y-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-500">
            2x a week · 15 min each
          </p>
          <div className="space-y-4">
            {roadmap.weeklyDrills.map((drill) => (
              <DrillCard key={drill.id} drill={drill} hasPartner={roadmap.hasPartner} />
            ))}
          </div>
        </div>

        <Divider />

        {/* In-game rule */}
        <div className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-500">
            In your games
          </p>
          <div className="flex gap-4">
            <span className="mt-1 w-0.5 shrink-0 self-stretch rounded-full bg-gradient-to-b from-emerald-400/70 to-transparent" />
            <p className="text-[16px] leading-relaxed text-slate-300">{roadmap.inGameRule}</p>
          </div>
        </div>

        <Divider />

        {/* Re-test */}
        <div className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-500">
            Re-test in {roadmap.weeksTarget} weeks
          </p>
          <p className="text-[16px] leading-relaxed text-slate-300">{roadmap.retestMetric}</p>
          <p className="text-[13px] text-slate-300">
            🗓 Come back and re-take the assessment. We&apos;ll show you what moved.
          </p>
        </div>

        {/* CTA */}
        <div className="pb-8 pt-2">
          <button
            onClick={onCommit}
            className={[
              "w-full rounded-xl bg-gradient-to-r from-sky-500 to-emerald-500",
              "py-4 text-[16px] font-medium text-white",
              "outline-none focus-visible:outline-none",
              "transition-all duration-150 hover:opacity-90 active:scale-[0.99]",
            ].join(" ")}
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
    <div className="space-y-2 rounded-xl border border-slate-700/60 bg-slate-800/20 p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[15px] font-semibold leading-snug text-slate-100">{drill.name}</p>
        <div className="flex shrink-0 items-center gap-2">
          {showSoloBadge && (
            <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-400">
              Solo version
            </span>
          )}
          <span className="text-[12px] text-slate-500">{drill.duration}</span>
        </div>
      </div>
      <p className="text-[14px] leading-relaxed text-slate-400">{drill.description}</p>
    </div>
  );
}

function Divider() {
  return <div className="h-px w-full bg-slate-800" />;
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
