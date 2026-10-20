import { DrillBriefContent } from "@/components/session/DrillBrief";
import { ShotDemo } from "@/components/session/ShotDemo";
import { SKILL_TITLES } from "@/lib/diagnoses";
import { toGuidedDrill } from "@/lib/drill-lookup";
import { generateRoadmap } from "@/lib/roadmap";
import { weeklyCommitment } from "@/lib/session-plan";
import {
  DEMO_ANSWERS,
  DEMO_DIAGNOSIS,
  DEMO_RANKED_SKILLS,
  DEMO_RETEST_DIAGNOSIS,
  DEMO_RETEST_SKILLS,
  DEMO_SIGNALS,
  RETEST_LABEL,
  SIGNAL_READINGS,
} from "./demo-run";
import { ExampleTag } from "./primitives";

/**
 * The product's own readouts, rendered live from the engine at build time
 * (see `demo-run.ts`) rather than photographed.
 *
 * Each one used to sit in the same frame: a full-width rounded card with a
 * header row naming it and a provenance line. Five of those in a row made the
 * page one composition repeated, so each readout now takes the shape of what
 * it shows. The priority table is a table on the page, the root cause is a
 * conclusion beside its evidence, the reading is one number, the re-test is a
 * before and after. Only the two objects that are product surfaces in the app
 * (the hero reading and the drill brief) keep a card. Every one still carries
 * its `ExampleTag` beside the data it qualifies.
 */

/* ─────────────────────── Shared pieces ─────────────────────── */

/** The app's card: radius-2xl, `line` border, `surface` ground, no shadow. */
function Panel({
  children,
  glow = false,
  className = "",
}: {
  children: React.ReactNode;
  /** Ambient optic field behind the panel. Hero only, one per page. */
  glow?: boolean;
  className?: string;
}) {
  return (
    <div className={`relative ${className}`}>
      {glow ? (
        <div
          aria-hidden="true"
          // Pushed outward past the panel edge: the panel itself is opaque, so
          // any energy inside its footprint is invisible.
          className="pointer-events-none absolute -inset-x-16 -inset-y-14 -z-10"
          style={{
            background:
              "radial-gradient(closest-side at 50% 50%, rgba(216,227,76,0.22), rgba(216,227,76,0.10) 58%, rgba(216,227,76,0.04) 76%, transparent 92%)",
          }}
        />
      ) : null}
      <div className="overflow-hidden rounded-2xl border border-line bg-surface">{children}</div>
    </div>
  );
}

/** Mono status pill, the app's badge: 10px, tracking 0.10em, `radius-xs`. */
function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex shrink-0 items-center rounded-xs bg-optic-dim px-[9px] py-[5px] font-mono text-[10px] uppercase leading-none tracking-[0.10em] text-optic">
      {children}
    </span>
  );
}

/** Neutral counterpart to Badge: reads a value back without pointing at it. */
function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex w-fit shrink-0 items-center rounded-xs border border-line-strong px-[9px] py-[5px] font-mono text-[10px] uppercase leading-none tracking-[0.10em] text-ink-2">
      {children}
    </span>
  );
}

/** A short mono instrument label: a unit, a column head, a field name. */
function Unit({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={`font-mono text-[11px] uppercase leading-none tracking-[0.12em] text-ink-3 ${className}`}
    >
      {children}
    </span>
  );
}

/**
 * Three-segment level meter: the 0–3 scale the assessment actually scores.
 * Fixed and compact at 375px; on a wide viewport the segments stretch to fill
 * the row.
 */
function LevelMeter({ level }: { level: number }) {
  return (
    <span aria-hidden="true" className="flex shrink-0 gap-1.5 md:min-w-0 md:flex-1">
      {[1, 2, 3].map((step) => (
        <span
          key={step}
          className={`h-1.5 w-5 rounded-full md:w-auto md:flex-1 ${
            // Half-levels exist: `reset` averages two questions, so a 1.5 fills
            // its second segment as much as it earned rather than rounding.
            level >= step ? "bg-ink-2" : level > step - 1 ? "bg-line-hover" : "bg-line"
          }`}
        />
      ))}
    </span>
  );
}

/** Levels read to one decimal only when they have one (1.5 stays, 2.0 → 2). */
function levelText(level: number): string {
  return Number.isInteger(level) ? String(level) : level.toFixed(1);
}

/** The 0–100 readiness track with its two ends named. */
function ReadinessTrack({ value, before }: { value: number; before?: number }) {
  return (
    <div className="w-full">
      <div className="relative h-1.5 overflow-hidden rounded-full bg-line">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-optic"
          style={{ width: `${value}%` }}
        />
        {/* A re-test draws the baseline over the gain in neutral, so the
            accent marks only the ground it moved. */}
        {before !== undefined ? (
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-line-hover"
            style={{ width: `${before}%` }}
          />
        ) : null}
      </div>
      <div className="mt-2.5 flex justify-between">
        <Unit>3.0</Unit>
        <Unit>4.0</Unit>
      </div>
    </div>
  );
}

/* ──────────────── The reading (hero) ──────────────── */

/**
 * The whole reading in one object: readiness for 4.0, and the four skills that
 * produced it with the diagnosed one flagged. The page's headline claim (ten
 * things to fix versus one to start with) stated as data. The one marketing
 * object on a card with the hero's ambient field behind it: it stands in for
 * the result screen, so it looks like a product surface.
 */
export function ScoreReadout({ glow = false }: { glow?: boolean }) {
  const bottleneck = DEMO_DIAGNOSIS.bottleneck;

  return (
    <div>
      <ExampleTag className="mb-3" />
      <Panel glow={glow}>
        <div className="grid gap-8 px-5 py-6 md:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] md:gap-12 md:px-7 md:py-8">
          <div className="md:self-center">
            <Unit>Readiness for 4.0</Unit>
            <p className="mt-3 font-display text-[56px] font-extrabold leading-none tabular-nums text-ink md:text-[72px]">
              {DEMO_DIAGNOSIS.readiness}
              <span className="text-[24px] font-semibold text-ink-3"> /100</span>
            </p>
            <div className="mt-5">
              <ReadinessTrack value={DEMO_DIAGNOSIS.readiness} />
            </div>
          </div>

          <ul className="md:border-l md:border-line md:pl-12">
            {DEMO_RANKED_SKILLS.map((score, i) => {
              const isBottleneck = score.skill === bottleneck;
              return (
                <li
                  key={score.skill}
                  className={`flex items-center gap-3 py-3.5 md:gap-5 md:py-4 ${
                    i === 0 ? "pt-0 md:pt-0" : "border-t border-line"
                  }`}
                >
                  <div
                    className={`min-w-0 flex-1 text-[15px] font-semibold leading-[1.3] md:w-[12rem] md:flex-none md:text-[17px] ${
                      isBottleneck ? "text-ink" : "text-ink-2"
                    }`}
                  >
                    {SKILL_TITLES[score.skill]}
                    {/* At 375px the flag drops under the name it marks:
                        inline, it squeezes the name column until the one row
                        that matters most is also the only one that wraps. */}
                    {isBottleneck ? (
                      <span className="mt-1.5 block md:hidden">
                        <Badge>Bottleneck</Badge>
                      </span>
                    ) : null}
                  </div>
                  {/* Wide layout: the flag keeps its own column on every row,
                      filled or not, so the meters stay on one axis. */}
                  <span className="hidden shrink-0 md:block md:w-[7rem]">
                    {isBottleneck ? <Badge>Bottleneck</Badge> : null}
                  </span>
                  <LevelMeter level={score.level} />
                  <span className="w-[2.75rem] shrink-0 text-right font-mono text-[13px] tabular-nums text-ink-2">
                    {levelText(score.level)}
                    <span className="text-ink-3">/3</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </Panel>
    </div>
  );
}

/* ──────────────── Step one: the priority table ──────────────── */

/**
 * Why one of the four is the place to start: each skill's level turned into a
 * weighted gap by how much that skill separates 3.5 from 4.0, ranked. Set
 * straight on the page as a table with hairline rules, no card: it is a
 * ranking, and a ranking reads best as rows. The accent marks the winning bar.
 */
export function PriorityTable() {
  const maxGap = Math.max(...DEMO_RANKED_SKILLS.map((s) => s.gap));

  return (
    <div>
      <ExampleTag />

      {/* Column heads carry the table on a wide viewport; at 375px each row
          labels its own values, because a header row that far from the fourth
          row is recall, not recognition. */}
      <div className="mt-5 hidden items-center gap-6 pb-3 md:flex">
        <Unit className="w-[14rem] shrink-0 pl-9">Skill</Unit>
        <Unit className="w-[3.25rem] shrink-0">Level</Unit>
        <Unit className="flex-1">Priority</Unit>
      </div>

      <ul className="mt-4 border-b border-line md:mt-0">
        {DEMO_RANKED_SKILLS.map((score, i) => {
          const isBottleneck = score.skill === DEMO_DIAGNOSIS.bottleneck;
          return (
            <li
              key={score.skill}
              className="flex flex-col gap-3 border-t border-line py-5 md:flex-row md:items-center md:gap-6"
            >
              <div className="flex items-baseline gap-4 md:w-[14rem] md:shrink-0">
                <span
                  className={`w-5 shrink-0 font-mono text-[11px] tabular-nums ${
                    isBottleneck ? "text-optic" : "text-ink-3"
                  }`}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span
                  className={`text-[16px] font-semibold leading-[1.3] md:text-[18px] ${
                    isBottleneck ? "text-ink" : "text-ink-2"
                  }`}
                >
                  {SKILL_TITLES[score.skill]}
                </span>
              </div>

              {/*
                Mobile wraps this into two lines: the labelled values, then the
                bar full width beneath them. `order` lets one DOM serve both;
                on a wide viewport the column heads above name the cells.
              */}
              <div className="flex flex-wrap items-start gap-x-6 gap-y-3.5 pl-9 md:flex-1 md:flex-nowrap md:items-center md:gap-6 md:pl-0">
                <div className="order-1 md:order-none md:w-[3.25rem] md:shrink-0">
                  <Unit className="mb-1.5 block md:hidden">Level</Unit>
                  <span className="block font-mono text-[13px] tabular-nums text-ink-2">
                    {levelText(score.level)}
                    <span className="text-ink-3">/3</span>
                  </span>
                </div>
                <div className="order-3 md:order-last md:w-[2.5rem] md:shrink-0 md:text-right">
                  <Unit className="mb-1.5 block md:hidden">Priority</Unit>
                  <span
                    className={`block font-display text-[18px] font-bold tabular-nums md:text-[22px] ${
                      isBottleneck ? "text-ink" : "text-ink-2"
                    }`}
                  >
                    {score.gap.toFixed(1)}
                  </span>
                </div>
                <div
                  aria-hidden="true"
                  className="order-4 h-2 w-full overflow-hidden rounded-full bg-line md:order-none md:w-auto md:flex-1"
                >
                  <div
                    className={`h-full rounded-full ${isBottleneck ? "bg-optic" : "bg-line-hover"}`}
                    style={{ width: `${(score.gap / maxGap) * 100}%` }}
                  />
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {/*
        The arithmetic, one tap away. The table is the argument; this is the
        working, for the visitor who wants to check it.
      */}
      <details className="group mt-4">
        <summary className="-my-2 flex cursor-pointer list-none items-center gap-2 py-2 text-[14px] font-semibold text-ink-1 transition-colors hover:text-ink [&::-webkit-details-marker]:hidden">
          <span
            aria-hidden="true"
            className="inline-block text-ink-3 transition-transform group-open:rotate-90"
          >
            ›
          </span>
          How your priority is chosen
        </summary>
        <div className="mt-3 flex max-w-[640px] flex-col gap-3 pl-4 text-[14px] leading-[1.55] text-ink-2">
          <p>
            Each skill&apos;s level comes from your answers, 0 to 3. The gap is how far below 3
            it sits, multiplied by how much that skill separates 3.5 from 4.0. The largest
            result is where your plan starts.
          </p>
          <p className="font-mono text-[12px] leading-[1.5] tracking-[0.02em] text-ink-2">
            Priority = weight × (3 − level)
          </p>
          <ul className="flex flex-col gap-1.5 font-mono text-[12px] tabular-nums">
            {DEMO_RANKED_SKILLS.map((score) => (
              <li
                key={score.skill}
                className="flex flex-col gap-0.5 sm:flex-row sm:justify-between sm:gap-4"
              >
                <span className="text-ink-2">{SKILL_TITLES[score.skill]}</span>
                <span className="whitespace-nowrap text-ink-1">
                  ×{score.importance.toFixed(1)} × (3 − {levelText(score.level)}) ={" "}
                  {score.gap.toFixed(1)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </details>
    </div>
  );
}

/* ──────────────── Step two: the root cause ──────────────── */

/**
 * The second axis, from the same twelve answers: the three practice answers
 * on the left as a plain list, each tagged with what it implies, and on the
 * right the conclusion the engine draws from them, large, under a single
 * accent rule. The conclusion is the engine's own output for this example
 * (the insight headline and plan line the reveal shows for this bottleneck
 * × root cause), so it can't drift from what the product tells a player.
 */
export function RootCauseSplit({ children }: { children?: React.ReactNode }) {
  return (
    <div className="grid gap-12 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:gap-16 lg:gap-24">
      <div>
        {/* The step's own heading leads the evidence column, so the step is
            two columns from its first line rather than a header over a pair. */}
        {children ? <div className="mb-10">{children}</div> : null}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Unit>Your practice answers</Unit>
          <ExampleTag />
        </div>
        <ul className="mt-4 border-b border-line">
          {DEMO_SIGNALS.map((signal) => (
            <li key={signal.title} className="flex flex-col gap-2 border-t border-line py-4">
              <Unit>{signal.title}</Unit>
              <div className="flex flex-col gap-2.5 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                <p className="text-pretty text-[15px] leading-[1.45] text-ink md:text-[16px]">
                  {signal.answer}
                </p>
                <Chip>{SIGNAL_READINGS[signal.flag]}</Chip>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Bottom-aligned with the list on a wide viewport, so the conclusion
          sits level with the answers it is drawn from. */}
      <div className="md:self-end md:pb-2">
        <span aria-hidden="true" className="block h-[2px] w-12 rounded-full bg-optic" />
        <Unit className="mt-5 block">Root cause</Unit>
        <p className="mt-4 text-balance font-display text-[34px] font-extrabold leading-[1.08] tracking-[-0.02em] text-ink md:text-[46px] md:leading-[1.05]">
          {DEMO_DIAGNOSIS.insightHeadline}
        </p>
        <p className="mt-4 text-pretty text-[16px] leading-[1.55] text-ink-1 md:text-[18px]">
          {DEMO_DIAGNOSIS.absolutionClose}
        </p>
      </div>
    </div>
  );
}

/* ──────────────── Step three: the reading ──────────────── */

/**
 * The readiness number as the walkthrough's last word: centred, large, with
 * the track under it and the tag beside it. No card. The reveal centres this
 * screen in the app for the same reason.
 */
export function ReadingCenterpiece() {
  const readiness = DEMO_DIAGNOSIS.readiness;
  return (
    <div className="flex flex-col items-center text-center">
      <Unit>Readiness for 4.0</Unit>
      <p className="mt-4 font-display text-[72px] font-extrabold leading-none tabular-nums text-ink md:text-[96px]">
        {readiness}
        <span className="text-[28px] font-semibold text-ink-3 md:text-[32px]"> /100</span>
      </p>
      <div className="mt-7 w-full max-w-[420px]">
        <ReadinessTrack value={readiness} />
      </div>
      <ExampleTag className="mt-5" />
    </div>
  );
}

/* ──────────────── The re-test ──────────────── */

/**
 * The same run, re-scored after the plan: the before and after at display
 * size, then each skill's movement as a strip of four readings. Every figure
 * is the engine's second pass over the same answers with only the diagnosed
 * skill's questions moved (`demo-run.ts` enforces that at build time).
 */
export function RetestNumbers() {
  const before = DEMO_DIAGNOSIS.readiness;
  const after = DEMO_RETEST_DIAGNOSIS.readiness;
  return (
    <div className="w-full">
      {/* One grid, so both labels share a line and both numbers share a
          baseline, whatever their sizes. */}
      <div className="grid w-fit grid-cols-[auto_auto_auto] items-baseline gap-x-5 gap-y-3 md:gap-x-7">
        <Unit>Before</Unit>
        <span />
        <Unit>After</Unit>
        <p className="font-display text-[40px] font-extrabold leading-none tabular-nums text-ink-3 md:text-[48px]">
          {before}
        </p>
        <span aria-hidden="true" className="font-display text-[28px] leading-none text-ink-3">
          →
        </span>
        <p className="flex items-baseline gap-3 font-display text-[56px] font-extrabold leading-none tabular-nums text-ink md:text-[72px]">
          {after}
          <span className="font-mono text-[15px] font-normal tabular-nums text-optic">
            +{after - before}
          </span>
        </p>
      </div>
      <div className="mt-6 max-w-[420px]">
        <ReadinessTrack value={after} before={before} />
      </div>
      <ExampleTag className="mt-5">{RETEST_LABEL}</ExampleTag>
    </div>
  );
}

/** Each skill's level before and after, as four readings in a strip. */
export function RetestStrip() {
  const fixed = SKILL_TITLES[DEMO_DIAGNOSIS.bottleneck];
  const next = SKILL_TITLES[DEMO_RETEST_DIAGNOSIS.bottleneck];
  return (
    <div>
      <dl className="grid grid-cols-2 border-y border-line md:grid-cols-4">
        {DEMO_RETEST_SKILLS.map((row, i) => {
          const moved = row.after > row.before;
          return (
            <div
              key={row.skill}
              className={`flex flex-col gap-3 py-5 ${i % 2 === 1 ? "border-l border-line pl-5" : "pr-5"} ${
                i < 2 ? "border-b border-line md:border-b-0" : ""
              } md:border-l md:pl-6 md:pr-6 ${i === 0 ? "md:border-l-0 md:pl-0" : ""}`}
            >
              <dt className={`text-[15px] font-semibold leading-[1.3] ${moved ? "text-ink" : "text-ink-2"}`}>
                {SKILL_TITLES[row.skill]}
              </dt>
              <dd className="flex items-baseline gap-2 font-mono text-[13px] tabular-nums">
                <span className="text-ink-3">{levelText(row.before)}</span>
                <span aria-hidden="true" className="text-ink-3">
                  →
                </span>
                <span className={moved ? "text-ink" : "text-ink-3"}>
                  {levelText(row.after)}
                  <span className="text-ink-3">/3</span>
                </span>
                <span className={`ml-auto ${moved ? "text-optic" : "text-ink-3"}`}>
                  {moved ? `+${levelText(row.after - row.before)}` : "0"}
                </span>
              </dd>
            </div>
          );
        })}
      </dl>
      {/*
        The handover, straight off the second diagnosis: fixing the reset does
        not finish the player, it promotes the next-largest gap.
      */}
      <p className="mt-5 text-pretty text-[15px] leading-[1.55] text-ink-2">
        {fixed} is no longer the largest gap, so {next.toLowerCase()} becomes the next
        three-week plan.
      </p>
    </div>
  );
}

/* ──────────────── The plan ──────────────── */

/** The example plan, as `generateRoadmap` prescribes it to the example player. */
function examplePlan() {
  const roadmap = generateRoadmap(DEMO_DIAGNOSIS, DEMO_ANSWERS);
  if (roadmap.weeklyDrills.length === 0) {
    // Loud on purpose: this renders at build time, so a renamed drill fails
    // the build rather than shipping an empty panel.
    throw new Error("demo-run: the example plan has no drills");
  }
  return roadmap;
}

/**
 * The example plan's first drill, rendered with the guided session's own brief
 * component and shot diagram, fed straight from `drills.ts` through the same
 * prescription the app uses (the example player has no drilling partner, so
 * this is the solo version). The brief's re-test footnote is left off: the
 * page has no plan beside it to point to.
 */
export function SessionBriefReadout() {
  const roadmap = examplePlan();
  const drill = toGuidedDrill(roadmap.weeklyDrills[0]);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <span className="text-[14px] leading-[1.45] text-ink-2">
          {weeklyCommitment(roadmap.weeklyDrills)}
        </span>
        <ExampleTag />
      </div>
      <Panel>
        <div className="flex flex-col gap-5 px-5 py-6 md:px-7 md:py-7">
          <Unit>
            Drill 1 of {roadmap.weeklyDrills.length} · {drill.duration} · {drill.setup}
          </Unit>
          <div className="flex flex-col gap-5">
            <DrillBriefContent drill={drill} retestMetric={null} as="h3" />
            <ShotDemo drillId={drill.id} />
          </div>
        </div>
      </Panel>
    </div>
  );
}
