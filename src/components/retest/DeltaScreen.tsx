import Link from "next/link";

import { LockedCard } from "@/components/ui/locked-card";
import { SKILL_LABELS, SKILL_TITLES } from "@/lib/diagnoses";
import type { SkillDelta } from "@/lib/delta";
import {
  nextPlanHref,
  retestHref,
  type Direction,
  type RetestView,
  type TrainedRow,
  type TrainedSkillView,
} from "@/lib/retest-view";
import type { SkillId } from "@/lib/types";

const PRIMARY =
  "flex h-[52px] w-full items-center justify-center rounded-lg bg-optic text-[15px] font-semibold text-optic-ink transition-colors hover:bg-optic-hover active:scale-[0.98]";
const GHOST =
  "flex min-h-11 w-full items-center justify-center px-2 py-2 text-center text-[14px] font-medium text-ink-2 transition-colors hover:text-ink";

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

/**
 * What the locked rows would answer, phrased for the result they sit under.
 * The skill the plan trained is shown free above them; these are the rest.
 */
const LOCKED_COPY: Record<Direction, { label: string; teaser: string }> = {
  up: { label: "The other three skills", teaser: "See where the rest of the points came from." },
  flat: { label: "The other three skills", teaser: "See whether anything shifted underneath the same score." },
  down: { label: "The other three skills", teaser: "See which of them slipped and which held." },
};

/** What paying adds, said where the offer is made. */
const UPGRADE_LINK = "Unlock the other skills, readiness history and streaks";

function nextPlanLine(view: RetestView): string {
  const skill = SKILL_LABELS[view.newBottleneck];
  // An older re-test opened from history describes a plan already run.
  if (!view.isLatest) {
    return view.switched ? `The plan after it moved to ${skill}.` : `The plan after it stayed on ${skill}.`;
  }
  // Same skill: said in one line, no replay. A new skill gets its reveal
  // (verdict, insight, absolution) on the way to the plan.
  return view.switched
    ? `Your next plan moves to ${skill}. Here's why, before it opens.`
    : `Your focus stays on ${skill}: same drills, three more weeks to beat your counts.`;
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
  const nextHref = view.isLatest ? nextPlanHref(view) : "/progress";
  const nextLabel = view.isLatest ? "See my next plan" : "Back to Progress";

  return (
    <main className="flex min-h-app w-full flex-col bg-reveal px-6 py-8 text-ink">
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

        <p className="-mt-3 text-[13px] leading-[1.5] text-ink-3">
          A score from your answers, not a DUPR estimate.
        </p>

        <p className="text-pretty text-[15px] leading-[1.6] text-ink-2">
          {summaryLine(view, direction, change, previous)}
        </p>

        {view.trained && <TrainedSkill trained={view.trained} />}

        {view.isPaid && view.skills ? (
          <BreakdownCard skills={view.skills} />
        ) : (
          // The placeholder is built from skill names only: the levels were
          // never sent to this browser (see loadRetestView).
          <LockedCard label={locked.label} teaser={locked.teaser}>
            <BreakdownPlaceholder exclude={view.trained?.skill ?? view.previousBottleneck} />
          </LockedCard>
        )}

        {/* The way forward is always the main action. The upgrade, for a
            free player, is offered under it and says what it adds. */}
        <div className="flex flex-col gap-1">
          <Link href={nextHref} className={PRIMARY}>
            {nextLabel}
          </Link>
          {!view.isPaid && (
            <Link href={paywallHref} className={GHOST}>
              {UPGRADE_LINK}
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}

/**
 * The skill the last plan trained, before and after in the player's own
 * answers. Free for every tier: whether the practised skill moved is the
 * question a re-test exists to answer.
 *
 * Each answer carries its own change. A skill asked about once keeps it in
 * the header; the reset, asked about twice, gets a labelled row per answer so
 * one moving and the other holding read as exactly that.
 */
function TrainedSkill({ trained }: { trained: TrainedSkillView }) {
  const single = trained.rows.length === 1 ? trained.rows[0] : null;
  return (
    <section className="flex flex-col gap-2 border-y border-line py-4">
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3">
          What you trained
        </p>
        {single && <ChangeBadge change={single.change} numeric={trained.numeric} />}
      </div>
      <p className="text-[17px] font-semibold leading-[1.3] text-ink">{SKILL_TITLES[trained.skill]}</p>
      {single ? (
        <BeforeAfter row={single} />
      ) : (
        trained.rows.map((row) => (
          <div key={row.label ?? row.before} className="flex flex-col gap-1 pt-1">
            <div className="flex items-baseline justify-between gap-3">
              <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3">{row.label}</p>
              <ChangeBadge change={row.change} numeric={trained.numeric} />
            </div>
            <BeforeAfter row={row} />
          </div>
        ))
      )}
    </section>
  );
}

function ChangeBadge({ change, numeric }: { change: number; numeric: boolean }) {
  const moved =
    change > 0
      ? { text: "Moved up", tone: "text-optic" }
      : change < 0
        ? { text: "Moved down", tone: "text-danger" }
        : // A level readout has no "answer" to be the same.
          { text: numeric ? "No change" : "Same answer", tone: "text-ink-3" };
  return (
    <p className={`shrink-0 font-mono text-[11px] uppercase tracking-[0.1em] ${moved.tone}`}>
      {moved.text}
    </p>
  );
}

function BeforeAfter({ row }: { row: TrainedRow }) {
  return (
    <p className="text-pretty text-[16px] leading-[1.45] tabular-nums">
      <span className="text-ink-3">{row.before}</span>
      <span aria-hidden="true" className="px-2 text-ink-3">
        →
      </span>
      <span className="sr-only"> to </span>
      <span className="text-ink">{row.after}</span>
    </p>
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
    <main className="flex min-h-app w-full flex-col bg-reveal px-6 py-8 text-ink">
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
          <p className="mt-2.5 text-[13px] leading-[1.5] text-ink-3">
            A score from your answers, not a DUPR estimate.
          </p>
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
      className="relative after:absolute after:-inset-1 after:content-[''] flex h-9 w-9 items-center justify-center rounded-md border border-line-strong text-[16px] text-ink-2 transition-colors hover:border-line-hover hover:text-ink"
    >
      ‹
    </Link>
  );
}

/** Paid: the skills other than the one trained, each before and after. */
function BreakdownCard({ skills }: { skills: SkillDelta[] }) {
  return (
    <div className="flex flex-col rounded-2xl border border-line bg-background px-5 pt-4">
      <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3">The other skills</p>
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
function BreakdownPlaceholder({ exclude }: { exclude: SkillId }) {
  const skills = (Object.keys(SKILL_TITLES) as SkillId[]).filter((s) => s !== exclude);
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
