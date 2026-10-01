"use client";

import Link from "next/link";
import { useState } from "react";

import { DrillCard } from "@/components/diagnosis/Roadmap";
import { SKILL_TITLES } from "@/lib/diagnoses";
import type { Roadmap } from "@/lib/roadmap";
import { weeklyCommitment } from "@/lib/session-plan";
import type { Diagnosis } from "@/lib/types";

/**
 * The anonymous player's home: their diagnosis and plan, rebuilt from the
 * answers saved on this device (`local-result.ts`).
 *
 * This replaces a loop. "Maybe later" on the Save Gate used to open a
 * Committed screen whose "Back to my plan" returned to the roadmap, whose one
 * button returned to the Save Gate — an anonymous player could only ever go
 * round. Now every anonymous path ends here, and nothing on this screen moves
 * them anywhere they didn't ask to go:
 *
 *   - the result and the plan are on the page, not behind a button;
 *   - "Create a free account" is the one primary action, and says plainly
 *     what an account adds and that the plan is on this device only;
 *   - replaying the diagnosis comes back here, not to the Save Gate;
 *   - starting over is a separate, confirmed, last-on-the-page action.
 */
export function SavedResult({
  diagnosis,
  roadmap,
  onCreateAccount,
  onReplay,
  onStartOver,
}: {
  diagnosis: Diagnosis;
  roadmap: Roadmap;
  onCreateAccount: () => void;
  onReplay: () => void;
  onStartOver: () => void;
}) {
  const [confirmingReset, setConfirmingReset] = useState(false);

  return (
    <main className="min-h-app w-full bg-background text-ink">
      <div className="mx-auto flex w-full max-w-[600px] flex-col gap-8 px-6 py-12 md:py-16">
        {/* ── The result ── */}
        <section className="flex flex-col gap-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-3">
            Your result
          </p>
          <h1 className="font-display text-[32px] font-extrabold leading-[1.1] tracking-[-0.02em]">
            {SKILL_TITLES[diagnosis.bottleneck]}
          </h1>
          <p className="text-pretty text-[15px] leading-[1.6] text-ink-2">
            {diagnosis.insightHeadline} Readiness baseline{" "}
            <span className="font-semibold tabular-nums text-ink">{diagnosis.readiness}</span>
            <span className="text-ink-3">/100</span>.
          </p>
          <button
            type="button"
            onClick={onReplay}
            className="-my-2 self-start py-2 font-mono text-[11px] uppercase tracking-[0.12em] text-ink-2 underline decoration-line-hover underline-offset-4 hover:text-ink"
          >
            Replay your diagnosis
          </button>
        </section>

        {/* ── The one main action ── */}
        <section className="flex flex-col gap-4 rounded-2xl border border-line-strong bg-surface px-5 py-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-3">
            Saved on this device only
          </p>
          <h2 className="text-pretty font-display text-[20px] font-bold leading-[1.3]">
            Create a free account to start guided sessions and re-test your score.
          </h2>
          <ul className="flex flex-col gap-2.5">
            {[
              "Guided sessions: a timer, a technique cue, and your result logged for each drill",
              "Home and Plan tabs: sessions done this week and what's next",
              "Re-tests that show how far your score moved",
              "Your plan on any device, not just this browser",
            ].map((line) => (
              <li key={line} className="flex gap-3 text-[14px] leading-[1.5] text-ink-1">
                <span
                  aria-hidden="true"
                  className="mt-[8px] h-[5px] w-[5px] shrink-0 rounded-full bg-ink-3"
                />
                {line}
              </li>
            ))}
          </ul>
          <p className="text-pretty text-[13px] leading-[1.5] text-ink-2">
            Right now this plan lives only in this browser. Clearing its data or switching
            phones loses it.
          </p>
          <button
            type="button"
            onClick={onCreateAccount}
            className="flex h-[52px] w-full items-center justify-center rounded-lg bg-optic text-[15px] font-semibold text-optic-ink transition-colors hover:bg-optic-hover active:scale-[0.98]"
          >
            Create a free account
          </button>
          <p className="text-center text-[13px] text-ink-2">
            Free, no card.{" "}
            <Link href="/login" className="underline underline-offset-4 hover:text-ink">
              Already have an account? Sign in
            </Link>
          </p>
        </section>

        {/* ── The plan ── */}
        <section className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-3">
              Your {roadmap.weeksTarget}-week plan
            </p>
            <p className="text-[15px] leading-[1.55] text-ink-2">
              {weeklyCommitment(roadmap.weeklyDrills)}. One session is every drill below,
              back to back.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            {roadmap.weeklyDrills.map((drill) => (
              <DrillCard key={drill.id} drill={drill} hasPartner={roadmap.hasPartner} />
            ))}
          </div>
          <div className="flex flex-col gap-2 rounded-2xl border border-line bg-surface px-5 py-[18px]">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-3">
              In your games
            </p>
            <p className="text-pretty text-[15px] leading-[1.55] text-ink">{roadmap.inGameRule}</p>
          </div>
          <div className="flex flex-col gap-2 rounded-2xl border border-line bg-surface px-5 py-[18px]">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-3">
              Re-test target · {roadmap.weeksTarget} weeks
            </p>
            <p className="text-[14px] leading-[1.55] text-ink-2">{roadmap.retestMetric}</p>
            <p className="text-[13px] leading-[1.5] text-ink-3">
              Recording a re-test needs an account.
            </p>
          </div>
        </section>

        {/* ── Start over: separate, last, and confirmed ── */}
        <section className="flex flex-col gap-3 border-t border-line pt-6">
          {confirmingReset ? (
            <>
              <p className="text-[14px] leading-[1.5] text-ink-2">
                This replaces the result saved on this device with a new assessment.
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onStartOver}
                  className="flex h-11 flex-1 items-center justify-center rounded-lg border border-line-strong bg-surface-2 text-[14px] font-semibold text-ink transition-colors hover:border-line-hover"
                >
                  Start over
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmingReset(false)}
                  className="flex h-11 flex-1 items-center justify-center rounded-lg text-[14px] font-medium text-ink-2 transition-colors hover:text-ink"
                >
                  Keep my result
                </button>
              </div>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmingReset(true)}
              className="-my-2 self-start py-2 text-[13px] text-ink-3 underline decoration-line-hover underline-offset-4 hover:text-ink-2"
            >
              Start over with a new assessment
            </button>
          )}
        </section>
      </div>
    </main>
  );
}
