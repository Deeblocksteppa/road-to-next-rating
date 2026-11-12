"use client";

import Link from "next/link";
import { useState } from "react";

import { SkillTitle } from "@/components/diagnosis/SkillTitle";
import { ReadingRows } from "@/components/ui/reading-rows";
import { AUTH_ERRORS } from "@/lib/auth-errors";
import { SKILL_TITLES } from "@/lib/diagnoses";
import { setupRowLabel, type Drill } from "@/lib/drills";
import type { TodayLogEntry, WeeklyProgress } from "@/lib/drill-sessions";
import { SESSIONS_PER_WEEK, sessionMinutes } from "@/lib/session-plan";
import type { SkillId } from "@/lib/types";
import { planStatusLine, type WeekContext } from "@/lib/week-status";

/** The anonymous player on /start: the plan lives on this device until they sign up. */
interface AnonymousContext {
  kind: "anonymous";
  /** The address a sign-up on this device is waiting on, if any. */
  pendingEmail: string | null;
  /** Retaking while signed in: no account to pitch, and the plan isn't on it yet. */
  signedIn: boolean;
  /**
   * "Save my plan" (or the pending line's "Enter code") is waiting on the
   * result's save before the form opens or, signed in, the claim. The button
   * reads "Saving…" and nothing opens twice.
   */
  saving: boolean;
  /** That save failed, so nothing opened. */
  saveFailed: boolean;
  /** Opens the save form. Signed in: claims the result for the account instead. */
  onSavePlan: () => void;
  /** The pending sign-up's code screen (which has resend, change email and log in). */
  onEnterCode: () => void;
  onReplay: () => void;
  onStartOver: () => void;
}

/** The signed-in player on /plan. */
interface MemberContext {
  kind: "member";
  todayLog: TodayLogEntry[];
  weekly: WeeklyProgress;
  /**
   * Where today sits in the week and the plan, for the status line. With
   * `week.retestOpen` the re-test's banner above this view takes the screen's
   * accent, and Start session goes secondary.
   */
  week: WeekContext;
  /** Something in `todayLog` was logged on the current UTC day (`loggedThisUtcDay`). */
  loggedToday: boolean;
}

/**
 * The plan, one way everywhere: the anonymous result on /start and the Plan
 * tab.
 *
 * Top to bottom: the skill as the title; the plan's shape as label and value
 * rows; the drills, each a row that opens its page; one action; then the two
 * sentences that go with the drills (In your games, Re-test goal). No cards.
 *
 * One action, one accent:
 *   - anonymous: "Save my plan", the only way into the save form (signed in
 *     and retaking, it saves straight to the account);
 *   - signed in with a session to do: "Start session" ("Continue session"
 *     when today's is half done), secondary while an open re-test holds the
 *     accent above this view;
 *   - signed in with nothing to start: a status line and no button.
 *
 * A drill row never starts anything: it opens the drill's page, read-only.
 * Sessions start here or on Home, and always at the first drill not yet
 * logged today.
 */
export function PlanView({
  skill,
  drills,
  drillBase,
  inGameRule,
  retestGoal,
  retestWhen,
  weeksTarget,
  context,
}: {
  skill: SkillId;
  /** As prescribed: the solo versions for a player without a partner. */
  drills: Drill[];
  /** The page showing this plan ("/start", "/plan"): a row opens `{drillBase}?drill={id}`. */
  drillBase: string;
  /** One sentence, from `inGameRuleFor`. */
  inGameRule: string | null;
  /** One sentence, from `retestGoalFor`. */
  retestGoal: string | null;
  /** When the re-test opens, as the RE-TEST row reads it: "In 3 weeks", "Oct 30", "Open now". */
  retestWhen: string;
  weeksTarget: number;
  context: AnonymousContext | MemberContext;
}) {
  const anon = context.kind === "anonymous" ? context : null;
  const member = context.kind === "member" ? context : null;

  const logged = new Map((member?.todayLog ?? []).map((e) => [e.drillId, e.result]));
  const remainingToday = drills.filter((d) => !logged.has(d.id));
  const todayComplete = drills.length > 0 && remainingToday.length === 0;
  const inProgress = !todayComplete && remainingToday.length < drills.length;
  const weekComplete = member ? member.weekly.total > 0 && member.weekly.completed >= member.weekly.total : false;
  // A session half done today is worth finishing even with the week's two in.
  const canStart = member !== null && drills.length > 0 && !todayComplete && (!weekComplete || inProgress);

  const rows = [
    { label: "Plan", value: `${weeksTarget} weeks · ${SESSIONS_PER_WEEK} sessions a week` },
    {
      label: "Session",
      value: `${sessionMinutes(drills)} min · ${drills.length === 2 ? "both" : "all"} drills`,
    },
    ...(member
      ? [{ label: "This week", value: `${member.weekly.completed} of ${member.weekly.total} sessions` }]
      : []),
    { label: "Re-test", value: retestWhen },
  ];

  return (
    <div className="flex flex-col gap-8">
      {anon?.pendingEmail && (
        <PendingStatus
          email={anon.pendingEmail}
          busy={anon.saving}
          failed={anon.saveFailed}
          onEnterCode={anon.onEnterCode}
        />
      )}

      {/* ── The focus: the skill is the title ── */}
      <header className="flex flex-col gap-3">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3">Your focus</p>
        <h1 className="font-display text-[32px] font-extrabold leading-[1.1] tracking-[-0.02em] text-ink">
          <SkillTitle title={SKILL_TITLES[skill]} />
        </h1>
        {anon && (
          <button
            type="button"
            onClick={anon.onReplay}
            className="-my-1 self-start py-1 text-[15px] text-ink-2 underline decoration-line-hover underline-offset-4 transition-colors hover:text-ink"
          >
            Replay your diagnosis
          </button>
        )}
      </header>

      {/* ── The plan's shape ── */}
      <ReadingRows rows={rows} />

      {/* ── The drills: each row opens its page ── */}
      {drills.length === 0 ? (
        <p className="text-[16px] text-ink-2">No drills on this plan.</p>
      ) : (
        <ol className="border-b border-line">
          {drills.map((drill) => (
            <DrillRow
              key={drill.id}
              drill={drill}
              href={`${drillBase}?drill=${encodeURIComponent(drill.id)}`}
              loggedToday={logged.has(drill.id) ? { result: logged.get(drill.id) ?? null } : null}
            />
          ))}
        </ol>
      )}

      {/* ── One action ── */}
      {anon && !anon.pendingEmail && (
        <section className="flex flex-col gap-4">
          <p className="text-pretty text-[16px] leading-[1.6] text-ink">
            {anon.signedIn
              ? "This plan isn't on your account yet. Saving it makes it your current plan."
              : "A free account keeps your plan and lets you start your sessions."}
          </p>
          <button
            type="button"
            onClick={anon.onSavePlan}
            disabled={anon.saving}
            className="flex h-[52px] w-full items-center justify-center rounded-lg bg-optic text-[15px] font-semibold text-optic-ink transition-colors hover:bg-optic-hover active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60"
          >
            {anon.saving ? "Saving…" : "Save my plan"}
          </button>
          {anon.saveFailed && <SaveError />}
        </section>
      )}
      {member && canStart && (
        <Link
          href="/session"
          className={`flex h-[52px] w-full items-center justify-center rounded-lg text-[15px] font-semibold transition-colors active:scale-[0.98] ${
            member.week.retestOpen
              ? "border border-line-strong bg-surface-2 text-ink hover:border-line-hover"
              : "bg-optic text-optic-ink hover:bg-optic-hover"
          }`}
        >
          {inProgress ? "Continue session" : "Start session"}
        </Link>
      )}
      {member && !canStart && drills.length > 0 && (
        <p role="status" className="text-pretty text-[16px] leading-[1.6] text-ink">
          {planStatusLine(member.week, member.weekly, todayComplete, member.loggedToday)}
        </p>
      )}

      {/* ── What goes with the drills: one sentence each ── */}
      {(inGameRule || retestGoal) && (
        <dl className="border-b border-line">
          {inGameRule && (
            <div className="flex flex-col gap-2 border-t border-line py-5">
              <dt className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3">In your games</dt>
              <dd className="text-pretty text-[16px] leading-[1.6] text-ink">{inGameRule}</dd>
            </div>
          )}
          {retestGoal && (
            <div className="flex flex-col gap-2 border-t border-line py-5">
              <dt className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3">Re-test goal</dt>
              <dd className="text-pretty text-[16px] leading-[1.6] text-ink">{retestGoal}</dd>
            </div>
          )}
        </dl>
      )}

      {anon && <StartOver onStartOver={anon.onStartOver} />}
    </div>
  );
}

/** The result could not be saved, so the form did not open. Plain text under the button that failed, as on the form. */
function SaveError() {
  return (
    <p role="alert" className="text-[16px] leading-[1.5] text-danger">
      {AUTH_ERRORS.generic}
    </p>
  );
}

/**
 * One drill: its name, its time and who it needs, and a chevron. The whole
 * row opens the drill's page; nothing is described inline and nothing starts
 * here. A drill logged today reads "TODAY · 7/10" in place of its time, so a
 * half-done session shows on the plan.
 */
function DrillRow({
  drill,
  href,
  loggedToday,
}: {
  drill: Drill;
  href: string;
  loggedToday: { result: number | null } | null;
}) {
  return (
    <li className="border-t border-line">
      <Link
        href={href}
        className="group flex min-h-[64px] items-center justify-between gap-4 py-4 transition-colors"
      >
        <span className="flex min-w-0 flex-col gap-1.5">
          <span className="font-display text-[18px] font-semibold leading-[1.3] text-ink">{drill.name}</span>
          <span className="font-mono text-[11px] uppercase leading-[1.5] tracking-[0.1em] tabular-nums text-ink-3">
            {loggedToday
              ? `Today · ${loggedToday.result === null ? "logged" : `${loggedToday.result}/10`}`
              : `${drill.duration} · ${setupRowLabel(drill.setup)}`}
          </span>
        </span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
          className="shrink-0 text-ink-3 transition-colors group-hover:text-ink"
        >
          <path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </Link>
    </li>
  );
}

/**
 * Sign-up pending: status, not a pitch. A player who has just made an
 * account sees where it stands, never the "create an account" block again.
 * One line and one way on: resend, a different address and logging in all
 * live on the code screen.
 */
function PendingStatus({
  email,
  busy,
  failed,
  onEnterCode,
}: {
  email: string;
  /** The result's save is in flight: nothing opens twice. */
  busy: boolean;
  /** "Enter code" couldn't save the result first, so nothing opened. */
  failed: boolean;
  onEnterCode: () => void;
}) {
  return (
    <div className="flex flex-col items-start gap-1 border-y border-line py-4">
      <p role="status" className="text-[16px] leading-[1.5] text-ink">
        Finish saving your plan: enter the code we sent to{" "}
        {/* The address moves to the next line whole when it fits there. */}
        <span className="inline-block max-w-full [overflow-wrap:anywhere]">
          <span className="font-semibold">{email}</span>.
        </span>
      </p>
      <button
        type="button"
        onClick={onEnterCode}
        disabled={busy}
        className="-mb-2.5 flex min-h-11 items-center text-[15px] text-ink-2 underline decoration-line-hover underline-offset-4 transition-colors hover:text-ink disabled:pointer-events-none disabled:opacity-60"
      >
        Enter code
      </button>
      {failed && (
        <div className="mt-2.5">
          <SaveError />
        </div>
      )}
    </div>
  );
}

/** Separate, last, and confirmed: it replaces the result saved on this device. */
function StartOver({ onStartOver }: { onStartOver: () => void }) {
  const [confirming, setConfirming] = useState(false);

  return (
    <section className="flex flex-col gap-3 pb-4">
      {confirming ? (
        <>
          <p className="text-[16px] leading-[1.5] text-ink-2">
            This replaces the result saved on this device with a new assessment.
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onStartOver}
              className="flex h-11 flex-1 items-center justify-center rounded-lg border border-line-strong bg-surface-2 text-[15px] font-semibold text-ink transition-colors hover:border-line-hover"
            >
              Start over
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="flex h-11 flex-1 items-center justify-center rounded-lg text-[15px] font-medium text-ink-2 transition-colors hover:text-ink"
            >
              Keep my result
            </button>
          </div>
        </>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="-my-2 self-start py-2 text-[15px] text-ink-2 underline decoration-line-hover underline-offset-4 hover:text-ink"
        >
          Start over with a new assessment
        </button>
      )}
    </section>
  );
}
