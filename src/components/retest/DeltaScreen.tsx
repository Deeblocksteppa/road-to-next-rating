import Link from "next/link";

import { LockedCard } from "@/components/ui/locked-card";
import { SKILL_LABELS, SKILL_TITLES } from "@/lib/diagnoses";
import type { SkillDelta } from "@/lib/delta";
import { retestHref, type Direction, type RetestView } from "@/lib/retest-view";
import type { SkillId } from "@/lib/types";

const PRIMARY =
  "flex h-[52px] w-full items-center justify-center rounded-lg bg-optic text-[15px] font-semibold text-optic-ink transition-colors hover:bg-optic-hover active:scale-[0.98]";
const GHOST =
  "flex h-11 w-full items-center justify-center text-[14px] font-medium text-ink-2 transition-colors hover:text-ink";

/**
 * The headline says which way the score went, and only that. It used to read
 * "Your {skill} moved." on every result, including a drop, and named a skill
 * whose own level the free screen can't show — so it could claim movement
 * the player couldn't check and that hadn't happened.
 */
const HEADLINES: Record<Direction, string> = {
  up: "Your readiness went up.",
  flat: "Your readiness held.",
  down: "Your readiness came in lower.",
};

/** What the locked breakdown would answer, phrased for the result it sits under. */
const LOCKED_COPY: Record<Direction, { label: string; teaser: string }> = {
  up: { label: "Which skills moved", teaser: "See which skills moved, and where the points came from." },
  flat: { label: "What shifted", teaser: "See whether anything shifted underneath the same score." },
  down: { label: "Which skills changed", teaser: "See which skills slipped and which held." },
};

function nextPlanLine(view: RetestView): string {
  const skill = SKILL_LABELS[view.newBottleneck];
  const same = view.newBottleneck === view.previousBottleneck;
  // An older re-test opened from history describes a plan already run.
  if (!view.isLatest) {
    return same ? `The plan after it stayed on ${skill}.` : `The plan after it moved to ${skill}.`;
  }
  return same ? `Your next plan stays on ${skill}.` : `Your next plan works on ${skill}.`;
}

/**
 * The line under the numbers. A drop is said plainly, in points, and then
 * put in proportion: a re-test is one reading of today's answers, not a
 * verdict on the player — the same structure-not-talent frame the reveal
 * is built on (PRODUCT.md, Principle 5).
 */
function summaryLine(view: RetestView, direction: Direction, change: number, previous: number): string {
  if (direction === "up") return `Up ${change} from ${previous}. ${nextPlanLine(view)}`;
  // Not "nothing slipped": a flat total can hide one skill up and another down.
  if (direction === "flat") return `The same reading as last time. ${nextPlanLine(view)}`;
  return `${Math.abs(change)} under last time. A re-test reads how you answered today, and one reading can dip. It isn't a ceiling on your game. ${nextPlanLine(view)}`;
}

function signed(change: number): string {
  if (change > 0) return `+${change}`;
  if (change < 0) return `−${Math.abs(change)}`;
  return "no change";
}

export function DeltaScreen({ view }: { view: RetestView }) {
  const { comparison } = view;
  if (!comparison) return <BaselineScreen view={view} />;

  const { direction, change, previous, current } = comparison;
  const paywallHref = `/paywall?from=${encodeURIComponent(retestHref(view.diagnosisId))}`;
  const locked = LOCKED_COPY[direction];

  return (
    <main className="flex min-h-[100dvh] w-full flex-col bg-reveal px-6 py-8 text-ink">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6">
        {!view.isLatest && <BackToProgress />}

        <div className="flex flex-col gap-3">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-ink-3">
            {view.isLatest ? "Re-test complete" : `Re-test · ${view.takenOn}`}
          </p>
          <h1 className="text-balance font-display text-[34px] font-extrabold leading-[1.05] tracking-[-0.02em]">
            {HEADLINES[direction]}
          </h1>
        </div>

        <div className="flex items-baseline gap-3.5">
          <span className="font-display text-[72px] font-extrabold leading-none tabular-nums text-ink-3">
            {previous}
          </span>
          <span className="font-display text-2xl font-extrabold text-ink-3" aria-hidden="true">
            →
          </span>
          <span className="font-display text-[72px] font-extrabold leading-none tabular-nums">
            {current}
          </span>
          <span
            className={`pb-2 font-mono text-sm tabular-nums ${
              direction === "up" ? "text-optic" : direction === "down" ? "text-danger" : "text-ink-3"
            }`}
          >
            {signed(change)}
          </span>
        </div>

        <p className="text-pretty text-[15px] leading-[1.6] text-ink-2">
          {summaryLine(view, direction, change, previous)}
        </p>

        {view.isPaid && view.skills ? (
          <>
            <BreakdownCard skills={view.skills} />
            {view.isLatest ? (
              <Link href="/plan" className={PRIMARY}>
                See my next plan
              </Link>
            ) : (
              <Link href="/progress" className={PRIMARY}>
                Back to Progress
              </Link>
            )}
          </>
        ) : (
          <>
            {/* The placeholder is built from skill names only: the levels
                were never sent to this browser (see loadRetestView). */}
            <LockedCard label={locked.label} teaser={locked.teaser}>
              <BreakdownPlaceholder />
            </LockedCard>

            {/* After a drop the next plan comes first and the breakdown is
                offered, not pushed. After a rise or a hold, the breakdown is
                the natural next question. */}
            {direction === "down" ? (
              <div className="flex flex-col gap-1">
                <Link href="/plan" className={PRIMARY}>
                  See my next plan
                </Link>
                <Link href={paywallHref} className={GHOST}>
                  See which skills changed
                </Link>
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                <Link href={paywallHref} className={PRIMARY}>
                  See the full breakdown
                </Link>
                <Link href="/plan" className={GHOST}>
                  Go to my plan
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}

/**
 * The re-test with nothing comparable to measure it against — no previous
 * diagnosis, or one whose per-skill levels could not be recovered. Shows the
 * new reading as the reading it is, with no "→", no change and no per-skill
 * rows: every one of those would be a comparison against a baseline that
 * does not exist. There is also nothing here to lock, so paid and free see
 * the same screen.
 */
function BaselineScreen({ view }: { view: RetestView }) {
  return (
    <main className="flex min-h-[100dvh] w-full flex-col bg-reveal px-6 py-8 text-ink">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6">
        {!view.isLatest && <BackToProgress />}

        <div className="flex flex-col gap-3">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-ink-3">
            {view.isLatest ? "Re-test complete" : `Reading · ${view.takenOn}`}
          </p>
          <h1 className="font-display text-[34px] font-extrabold leading-[1.05] tracking-[-0.02em]">
            Your baseline is set.
          </h1>
        </div>

        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-3">
            Readiness for 4.0
          </p>
          <p className="mt-3 font-display text-[72px] font-extrabold leading-none tabular-nums">
            {view.readiness}
            <span className="text-[24px] font-semibold text-ink-3"> /100</span>
          </p>
          <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-line">
            <div className="h-full rounded-full bg-optic" style={{ width: `${view.readiness}%` }} />
          </div>
          <div className="mt-2.5 flex justify-between font-mono text-[10px] tracking-[0.1em] text-ink-3">
            <span>3.0</span>
            <span>4.0</span>
          </div>
        </div>

        <p className="text-pretty text-[15px] leading-[1.6] text-ink-2">
          There is no earlier assessment on your account to compare this against, so
          this reading is your starting line. Your next re-test is the one that shows
          what moved. The plan starts on {SKILL_LABELS[view.newBottleneck]}.
        </p>

        <Link href={view.isLatest ? "/home" : "/progress"} className={PRIMARY}>
          {view.isLatest ? "See my plan" : "Back to Progress"}
        </Link>
      </div>
    </main>
  );
}

function BackToProgress() {
  return (
    <Link
      href="/progress"
      aria-label="Back to Progress"
      className="flex h-9 w-9 items-center justify-center rounded-md border border-line-strong text-[16px] text-ink-2 transition-colors hover:border-line-hover hover:text-ink"
    >
      ‹
    </Link>
  );
}

function BreakdownCard({ skills }: { skills: SkillDelta[] }) {
  return (
    <div className="flex flex-col rounded-2xl border border-line bg-background px-5">
      {skills.map((s, i) => (
        <div key={s.skill}>
          {i > 0 && <div className="h-px bg-line" />}
          <div className="flex items-center justify-between py-4">
            <span className="text-[15px] font-semibold">{SKILL_TITLES[s.skill]}</span>
            <span className="font-mono text-[13px] tabular-nums">
              <span className="text-ink-3">{s.previousLevel}/3</span>{" "}
              <span className="text-ink-3">→</span> {s.currentLevel}/3{" "}
              {s.delta !== 0 && (
                <span className={s.delta > 0 ? "text-optic" : "text-danger"}>
                  {s.delta > 0 ? `+${s.delta}` : `−${Math.abs(s.delta)}`}
                </span>
              )}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

/** Same shape as BreakdownCard, with no levels in it — there are none to show. */
function BreakdownPlaceholder() {
  const skills = Object.keys(SKILL_TITLES) as SkillId[];
  return (
    <div className="flex flex-col">
      {skills.map((skill, i) => (
        <div key={skill}>
          {i > 0 && <div className="h-px bg-line" />}
          <div className="flex items-center justify-between py-4">
            <span className="text-[15px] font-semibold">{SKILL_TITLES[skill]}</span>
            <span className="font-mono text-[13px] text-ink-3">–/3 → –/3</span>
          </div>
        </div>
      ))}
    </div>
  );
}
