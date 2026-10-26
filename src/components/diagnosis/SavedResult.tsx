"use client";

import Link from "next/link";
import { useState } from "react";

import { ResendConfirmation } from "@/components/auth/ResendConfirmation";
import { DrillCard } from "@/components/diagnosis/Roadmap";
import { SKILL_TITLES } from "@/lib/diagnoses";
import { focusReason, retestStart } from "@/lib/result-copy";
import type { Roadmap } from "@/lib/roadmap";
import { SESSIONS_PER_WEEK, sessionMinutes } from "@/lib/session-plan";
import type { AnswerMap, Diagnosis } from "@/lib/types";

const NUMBER_WORDS: Record<number, string> = { 2: "two", 3: "three", 4: "four" };

/**
 * The anonymous player's home: their recommended focus and plan, rebuilt
 * from the answers saved on this device (`local-result.ts`).
 *
 * The page knows where the player is with their account, and says only the
 * thing that is true for that state:
 *
 *   - no sign-up started: the plan first, then one compact prompt with one
 *     benefit (the plan and logged sessions on any device) and one button;
 *   - sign-up pending: a small banner near the top saying to check that
 *     inbox, with Resend. No account pitch anywhere. This page used to show
 *     the full "Create a free account" card to someone who had just created
 *     one, which read as "that didn't work";
 *   - signed in: never shown. /start sends a signed-in player to Home.
 *
 * Three visual levels, so the page reads in order of what you act on: the
 * drill cards (the only interactive surfaces), the in-game rule (a short
 * callout with a small accent marker), and the re-test (quiet text under a
 * hairline).
 */
export function SavedResult({
  diagnosis,
  roadmap,
  answers,
  pendingEmail,
  onCreateAccount,
  onStartSession,
  onChangeEmail,
  onReplay,
  onStartOver,
}: {
  diagnosis: Diagnosis;
  roadmap: Roadmap;
  answers: AnswerMap;
  /** The address a sign-up on this device is waiting on, if any. */
  pendingEmail: string | null;
  onCreateAccount: () => void;
  /** "Start session": sessions need an account, so this opens the save form saying so. */
  onStartSession: () => void;
  /** Drop the pending sign-up and reopen the form. */
  onChangeEmail: () => void;
  onReplay: () => void;
  onStartOver: () => void;
}) {
  const [confirmingReset, setConfirmingReset] = useState(false);

  const drillCount = roadmap.weeklyDrills.length;
  const weeksWord = NUMBER_WORDS[roadmap.weeksTarget] ?? String(roadmap.weeksTarget);
  const start = retestStart(diagnosis.bottleneck, answers);

  return (
    <main className="min-h-app w-full bg-background text-ink">
      <div className="mx-auto flex w-full max-w-[600px] flex-col gap-10 px-6 py-12 md:py-16">
        {/* ── Sign-up pending: status, not a pitch ── */}
        {pendingEmail && (
          <div
            role="status"
            className="flex flex-col gap-2.5 rounded-xl border border-line bg-surface px-4 py-3.5"
          >
            <p className="text-pretty text-[14px] leading-[1.5] text-ink">
              Check <span className="break-words font-semibold">{pendingEmail}</span> to finish
              saving your plan.
            </p>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
              <ResendConfirmation email={pendingEmail} />
              <button
                type="button"
                onClick={onChangeEmail}
                className="-my-2 py-2 text-[14px] text-ink-2 underline decoration-line-hover underline-offset-4 transition-colors hover:text-ink"
              >
                Use a different email
              </button>
            </div>
            {/* The way out when the link was opened on another device: this
                one can't know that happened. Signing in lands on Home, which
                clears the pending note and this device's copy of the plan. */}
            <p className="text-[13px] leading-[1.5] text-ink-3">
              Already confirmed?{" "}
              <Link
                href="/login"
                className="text-ink-2 underline decoration-line-hover underline-offset-4 transition-colors hover:text-ink"
              >
                Sign in
              </Link>
            </p>
          </div>
        )}

        {/* ── The focus ── */}
        <section className="flex flex-col gap-4">
          <div className="flex flex-col gap-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-3">
              Your recommended focus
            </p>
            <h1 className="font-display text-[32px] font-extrabold leading-[1.1] tracking-[-0.02em]">
              {SKILL_TITLES[diagnosis.bottleneck]}
            </h1>
            <p className="text-pretty text-[15px] leading-[1.6] text-ink-2">
              {focusReason(diagnosis, answers)}
            </p>
          </div>

          {/* Its own row: a reading from the assessment, not part of the
              sentence about the skill. */}
          <div className="flex items-baseline justify-between border-y border-line py-3">
            <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3">
              Assessment baseline
            </span>
            <span className="font-display text-[18px] font-semibold tabular-nums text-ink">
              {diagnosis.readiness}
              <span className="font-sans text-[13px] font-normal text-ink-3"> /100</span>
            </span>
          </div>
          <p className="-mt-2 text-[13px] leading-[1.5] text-ink-3">
            A score from your answers, not a DUPR estimate.
          </p>

          <button
            type="button"
            onClick={onReplay}
            className="-my-2 self-start py-2 text-[13px] text-ink-3 underline decoration-line-hover underline-offset-4 transition-colors hover:text-ink-2"
          >
            Replay your diagnosis
          </button>
        </section>

        {/* ── The plan ── */}
        <section className="flex flex-col gap-5">
          <div className="flex flex-col gap-2.5">
            <h2 className="font-display text-2xl font-bold leading-[1.25] tracking-[-0.01em]">
              Your {weeksWord}-week plan
            </h2>
            <p className="text-pretty text-[15px] leading-[1.6] text-ink-2">
              {SESSIONS_PER_WEEK} sessions per week · {sessionMinutes(roadmap.weeklyDrills)} minutes
              per session. Each session includes {drillCount === 2 ? "both" : "all"} drills below.
            </p>
            {/* True of every plan today: the roadmap prescribes the same
                drills for all its weeks. Say so, and say what should move. */}
            <p className="text-pretty text-[14px] leading-[1.55] text-ink-3">
              It&apos;s the same session each time for all {weeksWord} weeks. What should change
              is your count out of 10 on each drill.
            </p>
          </div>

          {/* Level 1: the drills, and the way to run them. */}
          <div className="flex flex-col gap-3">
            {roadmap.weeklyDrills.map((drill) => (
              <DrillCard key={drill.id} drill={drill} />
            ))}
          </div>

          {/* Sessions and logging need an account (that is where the counts
              are kept), so this opens the save form, which says so. A plan
              with no way to start it was where "Not now" used to lead. */}
          <button
            type="button"
            onClick={onStartSession}
            className="flex h-[52px] w-full items-center justify-center rounded-lg bg-optic text-[15px] font-semibold text-optic-ink transition-colors hover:bg-optic-hover active:scale-[0.98]"
          >
            Start session
          </button>

          {/* Level 2: the in-game rule. A callout, marked, not boxed. */}
          <div className="flex gap-3.5 pt-1">
            <span aria-hidden="true" className="mt-[5px] h-2 w-2 shrink-0 rounded-full bg-optic" />
            <div className="flex flex-col gap-1.5">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-3">
                In your games
              </p>
              <p className="text-pretty text-[15px] leading-[1.55] text-ink">
                {roadmap.inGameRule}
              </p>
            </div>
          </div>
        </section>

        {/* ── Level 3: the re-test. Quiet text under a hairline, no card. ── */}
        <section className="flex flex-col gap-2 border-t border-line pt-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-3">
            Re-test · in {roadmap.weeksTarget} weeks
          </p>
          <p className="text-pretty text-[14px] leading-[1.55] text-ink-2">
            {start && <span className="text-ink">{start} </span>}
            {roadmap.retestMetric}
          </p>
          {pendingEmail && (
            <p className="text-pretty text-[13px] leading-[1.5] text-ink-3">
              Check {pendingEmail} to finish saving your plan.
            </p>
          )}
        </section>

        {/* ── No sign-up started: one benefit, one button, after the plan ── */}
        {!pendingEmail && (
          <section className="flex flex-col gap-4 rounded-2xl border border-line bg-surface px-5 py-5">
            <p className="text-pretty text-[15px] leading-[1.55] text-ink">
              Your plan is saved on this device. A free account runs your sessions, keeps what
              you log, and opens your plan on any device.
            </p>
            {/* Secondary: "Start session" above is the page's main action,
                and it leads to the same form. */}
            <button
              type="button"
              onClick={onCreateAccount}
              className="flex h-[52px] w-full items-center justify-center rounded-lg border border-line-strong bg-surface-2 text-[15px] font-semibold text-ink transition-colors hover:border-line-hover active:scale-[0.98]"
            >
              Create free account
            </button>
          </section>
        )}

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
