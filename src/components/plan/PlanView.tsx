"use client";

import Link from "next/link";
import { useState } from "react";

import { ResendConfirmation } from "@/components/auth/ResendConfirmation";
import { SkillTitle } from "@/components/diagnosis/SkillTitle";
import { ShotDemo } from "@/components/session/ShotDemo";
import { AUTH_ERRORS } from "@/lib/auth-errors";
import { SKILL_TITLES } from "@/lib/diagnoses";
import type { Drill } from "@/lib/drills";
import type { TodayLogEntry, WeeklyProgress } from "@/lib/drill-sessions";
import { SESSIONS_PER_WEEK, sessionMinutes } from "@/lib/session-plan";
import type { SkillId } from "@/lib/types";

/** The anonymous player on /start: the plan lives on this device until they sign up. */
interface AnonymousContext {
  kind: "anonymous";
  /** The reveal's verdict clause and the answer behind it (`focusReason`). */
  focusReason: string;
  /** The address a sign-up on this device is waiting on, if any. */
  pendingEmail: string | null;
  /**
   * The button waiting on the result's save before the form opens (it reads
   * "Saving…" and both are disabled), and the one whose save failed.
   */
  saving: "save" | "session" | null;
  saveFailed: "save" | "session" | null;
  /** "Start session": sessions need an account, so this opens the save form saying so. */
  onStartSession: () => void;
  /** "Save my plan": the same form, without the session line. */
  onSavePlan: () => void;
  /** Drop the pending sign-up and reopen the form. */
  onChangeEmail: () => void;
  onReplay: () => void;
  onStartOver: () => void;
}

/** The signed-in player on /plan. */
interface MemberContext {
  kind: "member";
  weekNumber: number | null;
  todayLog: TodayLogEntry[];
  weekly: WeeklyProgress;
  /** The re-test is open: it takes the screen's accent, and every Start goes secondary. */
  retestOpen: boolean;
}

/**
 * The plan, one way everywhere: the anonymous result on /start and the Plan
 * tab. It replaced the plan preview (shown once after the reveal), the saved
 * result and the Plan tab's own body, which told the same plan in three
 * designs and three sets of names.
 *
 * Top to bottom: the skill as the title, the session's shape, the drills as
 * numbered hairline rows, then three quiet readings under hairlines (In your
 * games, Re-test goal, Readiness). No cards. One accent per screen: the next
 * drill's Start (member), Start session (anonymous), or, when the re-test is
 * open, the re-test above this view.
 *
 * Anonymous only: the sign-up status, the reason for the focus, Replay, the
 * account block and Start over. Starting a session needs an account (that is
 * where the counts are kept), so both of the anonymous buttons open the save
 * form. Nothing opens it by itself.
 */
export function PlanView({
  skill,
  drills,
  inGameRule,
  retestMetric,
  retestStart,
  retestWhen,
  readiness,
  weeksTarget,
  context,
}: {
  skill: SkillId;
  /** As prescribed: the solo versions for a player without a partner. */
  drills: Drill[];
  inGameRule: string | null;
  retestMetric: string | null;
  /** "You started at: “…”." for skills answered in words (`retestStart`). */
  retestStart: string | null;
  /** When the re-test opens, as a short mono reading: "In 3 weeks", "Oct 30". */
  retestWhen: string;
  readiness: number | null;
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
  const nextId = remainingToday[0]?.id ?? null;

  // Anonymous: the plan is saved when the assessment ends, but the device keeps
  // no start date, so it has no week to name.
  const weekLine =
    member?.weekNumber != null
      ? `Week ${member.weekNumber} of ${weeksTarget} · Same drills each week. Beat your last numbers.`
      : `${weeksTarget} weeks · Same drills each week. Beat your last numbers.`;

  return (
    <div className="flex flex-col gap-10">
      {anon?.pendingEmail && (
        <PendingStatus email={anon.pendingEmail} onChangeEmail={anon.onChangeEmail} />
      )}

      {/* ── The focus: the skill is the title ── */}
      <header className="flex flex-col gap-3">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3">Your focus</p>
        <h1 className="font-display text-[32px] font-extrabold leading-[1.1] tracking-[-0.02em] text-ink">
          <SkillTitle title={SKILL_TITLES[skill]} />
        </h1>
        {anon && (
          <p className="text-pretty text-[16px] leading-[1.6] text-ink-2">{anon.focusReason}</p>
        )}
        <p className="text-pretty text-[16px] leading-[1.6] text-ink-2">
          {SESSIONS_PER_WEEK} sessions a week, {sessionMinutes(drills)} minutes each. Each session is{" "}
          {drills.length === 2 ? "both" : "all"} drills, back to back.
        </p>
        <p className="text-pretty text-[16px] leading-[1.6] text-ink-2">{weekLine}</p>
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

      {/* ── The drills ── */}
      <section className="flex flex-col gap-4">
        {member && (
          <div className="flex items-baseline justify-between">
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3">This week</p>
            <p className="font-mono text-[11px] uppercase tracking-[0.1em] tabular-nums text-ink-2">
              {member.weekly.completed} of {member.weekly.total} sessions
            </p>
          </div>
        )}
        {member && todayComplete && (
          <p className="text-pretty text-[16px] leading-[1.6] text-ink-2">
            Today&apos;s session complete.{" "}
            {weekComplete
              ? "Both sessions done this week. Next week starts Monday."
              : `Next session: any other day this week (${member.weekly.total - member.weekly.completed} to go).`}
          </p>
        )}

        {drills.length === 0 ? (
          <p className="text-[16px] text-ink-2">No drills on this plan.</p>
        ) : (
          <ol className="border-b border-line">
            {drills.map((drill, i) => (
              <DrillRow
                key={drill.id}
                drill={drill}
                index={i}
                status={
                  !member
                    ? null
                    : logged.has(drill.id)
                      ? { kind: "logged", result: logged.get(drill.id) ?? null }
                      : inProgress
                        ? { kind: "due" }
                        : null
                }
                start={
                  member && !logged.has(drill.id)
                    ? {
                        primary: drill.id === nextId && !member.retestOpen,
                        label: drill.id === nextId && inProgress ? "Continue session" : "Start drill",
                      }
                    : null
                }
              />
            ))}
          </ol>
        )}

        {anon && (
          <button
            type="button"
            onClick={anon.onStartSession}
            disabled={anon.saving !== null}
            className="mt-2 flex h-[52px] w-full items-center justify-center rounded-lg bg-optic text-[15px] font-semibold text-optic-ink transition-colors hover:bg-optic-hover active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60"
          >
            {anon.saving === "session" ? "Saving…" : "Start session"}
          </button>
        )}
        {anon?.saveFailed === "session" && <SaveError />}
      </section>

      {/* ── Three readings, quiet, under hairlines ── */}
      <dl className="border-b border-line">
        {inGameRule && (
          <div className="flex flex-col gap-2 border-t border-line py-5">
            <dt className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3">
              In your games
            </dt>
            <dd className="text-pretty text-[16px] leading-[1.6] text-ink">{inGameRule}</dd>
          </div>
        )}
        {retestMetric && (
          <div className="flex flex-col gap-2 border-t border-line py-5">
            <dt className="flex items-baseline justify-between gap-4 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3">
              <span>Re-test goal</span>
              <span className="tabular-nums tracking-[0.1em]">{retestWhen}</span>
            </dt>
            <dd className="text-pretty text-[16px] leading-[1.6] text-ink-2">
              {retestStart && <span className="text-ink">{retestStart} </span>}
              {retestMetric}
            </dd>
          </div>
        )}
        {readiness !== null && (
          <div className="flex flex-col gap-2 border-t border-line py-5">
            <dt className="flex items-baseline justify-between gap-4">
              <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3">
                Readiness
              </span>
              <span className="font-display text-[18px] font-semibold tabular-nums text-ink">
                {readiness}
                <span className="font-mono text-[11px] font-normal tracking-[0.1em] text-ink-3"> /100</span>
              </span>
            </dt>
            <dd className="text-pretty text-[16px] leading-[1.6] text-ink-2">
              A score from your answers, not a DUPR estimate.
            </dd>
          </div>
        )}
      </dl>

      {anon && !anon.pendingEmail && (
        <section className="flex flex-col gap-4">
          <p className="text-pretty text-[16px] leading-[1.6] text-ink">
            Your plan is saved on this device. A free account runs your sessions, keeps what you log,
            and opens your plan on any device.
          </p>
          {/* Secondary: Start session is the screen's main action, and it opens the same form. */}
          <button
            type="button"
            onClick={anon.onSavePlan}
            disabled={anon.saving !== null}
            className="flex h-[52px] w-full items-center justify-center rounded-lg border border-line-strong bg-surface-2 text-[15px] font-semibold text-ink transition-colors hover:border-line-hover active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60"
          >
            {anon.saving === "save" ? "Saving…" : "Save my plan"}
          </button>
          {anon.saveFailed === "save" && <SaveError />}
        </section>
      )}

      {anon && <StartOver onStartOver={anon.onStartOver} />}
    </div>
  );
}

/** The result could not be saved, so the form did not open. The same alert as the form's. */
function SaveError() {
  return (
    <p
      role="alert"
      className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-[16px] text-danger"
    >
      {AUTH_ERRORS.generic}
    </p>
  );
}

type DrillStatus = { kind: "logged"; result: number | null } | { kind: "due" } | null;

/**
 * One drill: index, name, setup, the task in one sentence, and the full
 * brief on demand (technique, the shot diagram, what gets logged: the same
 * fields the guided session's brief shows). The guided session is the only
 * way to log, so there is no checkbox: a casual tap can't create a result.
 */
function DrillRow({
  drill,
  index,
  status,
  start,
}: {
  drill: Drill;
  index: number;
  status: DrillStatus;
  /** Member only: into the guided session. Primary on the next drill, unless the re-test is open. */
  start: { primary: boolean; label: string } | null;
}) {
  const [open, setOpen] = useState(false);
  const panelId = `drill-${drill.id}-brief`;

  return (
    <li className="flex gap-4 border-t border-line py-5">
      <span className="w-5 shrink-0 pt-[3px] font-mono text-[11px] tabular-nums text-ink-3">
        {String(index + 1).padStart(2, "0")}
      </span>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-display text-[18px] font-semibold leading-[1.3] text-ink">{drill.name}</h3>
          {status?.kind === "logged" && (
            <span className="shrink-0 rounded-xs bg-surface-2 px-[9px] py-[5px] font-mono text-[10px] leading-none tracking-[0.1em] tabular-nums text-ink">
              {status.result === null ? "LOGGED" : `LOGGED · ${status.result}/10`}
            </span>
          )}
          {status?.kind === "due" && (
            <span className="shrink-0 rounded-xs bg-warn/[0.12] px-[9px] py-[5px] font-mono text-[10px] leading-none tracking-[0.1em] text-warn">
              DUE TODAY
            </span>
          )}
        </div>
        <p className="mt-1.5 font-mono text-[11px] uppercase leading-[1.5] tracking-[0.1em] text-ink-3">
          {drill.duration} · {drill.setup}
        </p>
        {/* The task is the instructions in one line; with the brief open it would say it twice. */}
        {!open && <p className="mt-2.5 text-pretty text-[16px] leading-[1.6] text-ink-2">{drill.task}</p>}

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls={panelId}
          className="mt-2 self-start py-1 text-[15px] text-ink-2 underline decoration-line-hover underline-offset-4 transition-colors hover:text-ink"
        >
          {open ? "Hide instructions" : "View instructions"}
        </button>

        {open && (
          <div id={panelId} className="mt-3 flex flex-col gap-4">
            <p className="text-pretty text-[16px] leading-[1.6] text-ink">{drill.description}</p>
            <ShotDemo drillId={drill.id} setup={drill.setup} />
            <div className="flex flex-col gap-1.5 border-t border-line pt-4">
              <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3">
                When the timer ends
              </p>
              <p className="text-pretty text-[16px] leading-[1.6] text-ink-2">
                <span className="font-semibold text-ink">{drill.logProtocol}</span> {drill.counts}
              </p>
              <p className="font-mono text-[11px] uppercase leading-[1.6] tracking-[0.1em] text-ink-2">
                Practice target <span className="text-ink">{drill.practiceTarget}</span>
              </p>
            </div>
          </div>
        )}

        {start && (
          <Link
            href={`/session?drill=${encodeURIComponent(drill.id)}`}
            className={`mt-4 inline-flex h-11 items-center justify-center self-start rounded-lg px-5 text-[15px] font-semibold transition-colors active:scale-[0.98] ${
              start.primary
                ? "bg-optic text-optic-ink hover:bg-optic-hover"
                : "border border-line-strong bg-surface-2 text-ink hover:border-line-hover"
            }`}
          >
            {start.label}
          </Link>
        )}
      </div>
    </li>
  );
}

/**
 * Sign-up pending: status, not a pitch. A player who has just made an
 * account sees where it stands, never the "create an account" block again.
 */
function PendingStatus({ email, onChangeEmail }: { email: string; onChangeEmail: () => void }) {
  return (
    <div role="status" className="flex flex-col gap-2.5 border-y border-line py-4">
      <p className="text-pretty text-[16px] leading-[1.5] text-ink">
        Check <span className="break-words font-semibold">{email}</span> to finish saving your plan.
      </p>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
        <ResendConfirmation email={email} />
        <button
          type="button"
          onClick={onChangeEmail}
          className="-my-2 py-2 text-[15px] text-ink-2 underline decoration-line-hover underline-offset-4 transition-colors hover:text-ink"
        >
          Use a different email
        </button>
      </div>
      {/* The way out when the link was opened on another device: this one
          can't know that happened. Signing in lands on Home, which clears the
          pending note and this device's copy of the plan. */}
      <p className="text-[15px] leading-[1.5] text-ink-2">
        Already confirmed?{" "}
        <Link
          href="/login"
          className="text-ink-2 underline decoration-line-hover underline-offset-4 transition-colors hover:text-ink"
        >
          Sign in
        </Link>
      </p>
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
