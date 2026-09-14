import { SKILL_TITLES } from "@/lib/diagnoses";
import {
  DEMO_DIAGNOSIS,
  DEMO_RANKED_SKILLS,
  DEMO_RETEST_DIAGNOSIS,
  DEMO_RETEST_SKILLS,
  DEMO_SIGNALS,
  ROOT_CAUSE_TITLES,
} from "./demo-run";

/**
 * Landscape data objects: the product's own readouts, rendered live at page
 * scale rather than photographed.
 *
 * The reveal screens this page used to show are mostly-text by design — one
 * idea per screen — so framing them larger only ever produced bigger words on a
 * page. These carry the interface density instead: the real four-skill scoring,
 * the real weighted-gap arithmetic, the real training-signal vote, every value
 * computed by `engine.ts` at build time (see `demo-run.ts`). They are real
 * product UI in the app's card language, laid out wide so they fill the page's
 * column instead of standing in a phone-shaped frame.
 */

/* ─────────────────────── Shared frame ─────────────────────── */

/**
 * The object's shell: the app's card (radius-2xl, `line` border, `surface`
 * ground, no shadow) with a titled instrument header, which is what makes a
 * block of numbers read as a panel of a running product rather than as a table
 * dropped into a marketing page.
 */
function Readout({
  eyebrow,
  meta,
  children,
  glow = false,
  className = "",
}: {
  eyebrow: string;
  /** Right-hand instrument line — what this run is, or what it was scored from. */
  meta: string;
  children: React.ReactNode;
  /** Ambient optic field behind the panel. Hero only — one per page. */
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

      <figure className="overflow-hidden rounded-2xl border border-line bg-surface">
        <figcaption className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1.5 border-b border-line px-5 py-3.5 md:px-7 md:py-4">
          <span className="font-mono text-[11px] uppercase leading-[1.5] tracking-[0.14em] text-ink-2">
            {eyebrow}
          </span>
          <span className="font-mono text-[11px] uppercase leading-[1.5] tracking-[0.12em] tabular-nums text-ink-3">
            {meta}
          </span>
        </figcaption>
        <div className="px-5 py-6 md:px-7 md:py-7">{children}</div>
      </figure>
    </div>
  );
}

/** Mono status pill — the app's badge: 10px, tracking 0.10em, `radius-xs`. */
function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex shrink-0 items-center rounded-xs bg-optic-dim px-[9px] py-[5px] font-mono text-[10px] uppercase leading-none tracking-[0.10em] text-optic">
      {children}
    </span>
  );
}

/** Neutral counterpart to Badge — reads a value back without pointing at it. */
function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex shrink-0 items-center rounded-xs border border-line-strong px-[9px] py-[5px] font-mono text-[10px] uppercase leading-none tracking-[0.10em] text-ink-2">
      {children}
    </span>
  );
}

/**
 * The instrument label above a value, mobile only — on a wide viewport the
 * table's column heads do this job and repeating it per row would be noise.
 */
function ValueLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="mb-1.5 block font-mono text-[11px] uppercase leading-none tracking-[0.12em] text-ink-3 md:hidden">
      {children}
    </span>
  );
}

/* ──────────────── 1. The reading (hero) ──────────────── */

/**
 * Three-segment level meter — the 0–3 scale the assessment actually scores.
 * Fixed and compact at 375px; on a wide viewport the segments stretch to fill
 * the row, so the readout uses its landscape width instead of leaving a corridor
 * of dead space between the skill name and its reading.
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

/**
 * The whole reading in one object: readiness for 4.0, and the four skills that
 * produced it with the diagnosed one flagged. The page's headline claim —
 * ten weaknesses versus one — stated as data instead of as a sentence.
 */
export function ScoreReadout({ glow = false }: { glow?: boolean }) {
  const bottleneck = DEMO_DIAGNOSIS.bottleneck;

  return (
    <Readout
      glow={glow}
      eyebrow="Example readout — the reading"
      meta={`${DEMO_RANKED_SKILLS.length} skills scored`}
    >
      <div className="grid gap-8 md:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] md:gap-12">
        <div className="md:self-center">
          <p className="font-mono text-[11px] uppercase leading-[1.5] tracking-[0.16em] text-ink-3">
            Readiness for 4.0
          </p>
          <p className="mt-3 font-display text-[56px] font-extrabold leading-none tabular-nums text-ink md:text-[72px]">
            {DEMO_DIAGNOSIS.readiness}
            <span className="text-[24px] font-semibold text-ink-3"> /100</span>
          </p>
          <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-line">
            <div
              className="h-full rounded-full bg-optic"
              style={{ width: `${DEMO_DIAGNOSIS.readiness}%` }}
            />
          </div>
          <div className="mt-2.5 flex justify-between font-mono text-[11px] tracking-[0.1em] text-ink-3">
            <span>3.0</span>
            <span>4.0</span>
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
                  {/* At 375px the flag drops under the name it marks: inline, it
                      squeezes the name column until the one row that matters
                      most is also the only one that wraps. */}
                  {isBottleneck ? (
                    <span className="mt-1.5 block md:hidden">
                      <Badge>Bottleneck</Badge>
                    </span>
                  ) : null}
                </div>
                {/* Wide layout: the flag keeps its own column on every row,
                    filled or not, so the meters stay on one axis instead of
                    stepping right on the row that carries a badge. */}
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
    </Readout>
  );
}

/* ──────────────── 2. The weighted gap (step 01) ──────────────── */

/**
 * Why one of those four is the constraint: each skill's level turned into a
 * weighted gap by how much that skill separates 3.5 from 4.0, ranked, with the
 * arithmetic left visible. The accent marks the winning bar — the only place in
 * this object anything is pointed at.
 */
export function GapLedger() {
  const maxGap = Math.max(...DEMO_RANKED_SKILLS.map((s) => s.gap));

  return (
    <Readout eyebrow="Weighted gap — all four skills" meta="Example run">
      {/*
        The formula runs above the rows, not under them. It is the sentence
        that makes this object credible — `×1.4` means nothing until you have
        read it — so it cannot be the smallest, dimmest thing in the panel.
        Mono but sentence case: DESIGN.md's always-uppercase rule covers
        labels, units and countdowns, and 67 characters of caps is not a
        label, it is a paragraph wearing one.
      */}
      <p className="mb-5 border-b border-line pb-4 font-mono text-[12px] leading-[1.5] tracking-[0.02em] text-ink-2">
        Weighted gap = weight × (3 − level) · largest gap is the bottleneck
      </p>

      {/* Column heads carry the table on a wide viewport; at 375px each row
          labels its own values instead, because a header row that far from
          the fourth row is recall, not recognition. */}
      <div className="hidden items-center gap-6 pb-3 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3 md:flex">
        {/* Indented past the rank column so the head sits over the names. */}
        <span className="w-[13rem] shrink-0 pl-8">Skill</span>
        <span className="w-[3.25rem] shrink-0">Level</span>
        <span className="w-[3rem] shrink-0">Weight</span>
        <span className="flex-1">Weighted gap</span>
      </div>

      <ul>
        {DEMO_RANKED_SKILLS.map((score, i) => {
          const isBottleneck = score.skill === DEMO_DIAGNOSIS.bottleneck;
          return (
            <li
              key={score.skill}
              // The column heads are desktop-only, so on mobile the first row's
              // top rule would double up with the panel header's divider.
              className={`flex flex-col gap-3 border-line py-4 md:flex-row md:items-center md:gap-6 md:border-t ${
                i === 0 ? "pt-0 md:pt-4" : "border-t"
              }`}
            >
              <div className="flex items-baseline gap-3 md:w-[13rem] md:shrink-0">
                <span
                  className={`w-5 shrink-0 font-mono text-[11px] tabular-nums ${
                    isBottleneck ? "text-optic" : "text-ink-3"
                  }`}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span
                  className={`text-[15px] font-semibold leading-[1.3] md:text-[17px] ${
                    isBottleneck ? "text-ink" : "text-ink-2"
                  }`}
                >
                  {SKILL_TITLES[score.skill]}
                </span>
              </div>

              {/*
                Mobile wraps this into two lines — the three labelled values,
                then the bar full width beneath them. `order` is what lets one
                DOM serve both: the bar sits last on mobile and third on a wide
                viewport, where the column heads above already name the cells.
                The bar also stops being a 97px stub, which is the only reason
                the "largest gap wins" comparison is visible at all at 375px.
              */}
              <div className="flex flex-wrap items-start gap-x-6 gap-y-3.5 md:flex-1 md:flex-nowrap md:items-center md:gap-6">
                <div className="order-1 md:order-none md:w-[3.25rem] md:shrink-0">
                  <ValueLabel>Level</ValueLabel>
                  <span className="block font-mono text-[13px] tabular-nums text-ink-2">
                    {levelText(score.level)}
                    <span className="text-ink-3">/3</span>
                  </span>
                </div>
                <div className="order-2 md:order-none md:w-[3rem] md:shrink-0">
                  <ValueLabel>Weight</ValueLabel>
                  <span className="block font-mono text-[13px] tabular-nums text-ink-3">
                    ×{score.importance.toFixed(1)}
                  </span>
                </div>
                <div className="order-3 md:order-last md:w-[2.5rem] md:shrink-0 md:text-right">
                  <ValueLabel>Weighted gap</ValueLabel>
                  <span
                    className={`block font-display text-[17px] font-bold tabular-nums md:text-[20px] ${
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
                    className={`h-full rounded-full ${
                      isBottleneck ? "bg-optic" : "bg-line-hover"
                    }`}
                    style={{ width: `${(score.gap / maxGap) * 100}%` }}
                  />
                </div>
              </div>
            </li>
          );
        })}
      </ul>

    </Readout>
  );
}

/* ──────────────── 3. The root cause (step 02) ──────────────── */

/**
 * The second axis, scored from the same twelve answers: three training signals,
 * what each one reads, and the cause they resolve to. Court time is marked as
 * the master variable because that is literally how `inferRootCause` works — it
 * settles the reading outright, and the other two only break a tie.
 */
export function RootCauseReadout() {
  return (
    <Readout eyebrow="Training signals — the second axis" meta="Example run">
      <ul>
        {DEMO_SIGNALS.map((signal, i) => (
          <li
            key={signal.title}
            className={`flex flex-col gap-2.5 py-4 md:grid md:grid-cols-[minmax(0,10rem)_minmax(0,1fr)_auto] md:items-center md:gap-6 ${
              i === 0 ? "pt-0 md:pt-0" : "border-t border-line"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <span className="font-mono text-[11px] uppercase leading-[1.5] tracking-[0.14em] text-ink-3">
                {signal.title}
              </span>
              {signal.master ? (
                <span className="font-mono text-[11px] uppercase leading-[1.5] tracking-[0.1em] text-ink-2">
                  · settles it
                </span>
              ) : null}
            </div>
            <p className="text-pretty text-[15px] leading-[1.4] text-ink md:text-[16px]">
              {signal.answer}
            </p>
            <div className="md:justify-self-end">
              <Chip>{ROOT_CAUSE_TITLES[signal.flag]}</Chip>
            </div>
          </li>
        ))}
      </ul>

      {/*
        The accent-tinted card variant (DESIGN.md §Components): border `optic`
        over a 5% tint, for the one moment this object is pointing at — the
        cause the three signals resolve to.
      */}
      <div className="mt-6 flex flex-col gap-3 rounded-xl border border-optic bg-optic/[0.05] px-5 py-4 md:flex-row md:items-center md:gap-6 md:px-6">
        <p className="font-mono text-[11px] uppercase leading-[1.5] tracking-[0.16em] text-optic md:w-[10rem] md:shrink-0">
          Root cause
        </p>
        <p className="font-display text-[22px] font-bold leading-[1.2] tracking-[-0.01em] text-ink md:text-[24px]">
          {ROOT_CAUSE_TITLES[DEMO_DIAGNOSIS.rootCause]}
        </p>
        {/*
          No explanatory sentence here: the section's own body copy already
          makes the argument, and this object exists to stop the page repeating
          itself in prose. The card states the resolved reading and stops.
        */}
        <p className="font-mono text-[11px] uppercase leading-[1.5] tracking-[0.12em] text-ink-2 md:ml-auto">
          Paired with {SKILL_TITLES[DEMO_DIAGNOSIS.bottleneck]} → one plan
        </p>
      </div>
    </Readout>
  );
}

/* ──────────────── 4. The re-test (proof it moved) ──────────────── */

/**
 * The same run, re-scored after the plan — the section's whole claim as one
 * landscape object instead of two phone captures.
 *
 * It replaced a pair of screenshots that could not be made to match: they were
 * captures of two different app surfaces, so one sat on the app ground
 * (#0B0B0C) and the other on `reveal-bg` (#060607) and read as two different
 * greys side by side, and their crops could not be squared without either
 * exposing a "0 weeks" streak card or slicing a CTA in half. Rendered, the
 * object has one ground, one width and no crop to negotiate.
 *
 * It also fixes a number. The captures showed 68 → 81 (+13), which matched
 * neither the 63 this page's own engine returns for the example run nor
 * anything a single-bottleneck fix can produce: take the two questions the
 * reset is scored from to their top option and `diagnose` returns 70. Every
 * figure below is that second pass, so the claim cannot drift from the model.
 */
export function RetestReadout() {
  const before = DEMO_DIAGNOSIS.readiness;
  const after = DEMO_RETEST_DIAGNOSIS.readiness;
  const delta = after - before;
  const nextBottleneck = SKILL_TITLES[DEMO_RETEST_DIAGNOSIS.bottleneck];

  return (
    <Readout eyebrow="Re-test — what moved" meta="Example run · 3 weeks later">
      <div className="grid gap-8 md:grid-cols-[minmax(0,17rem)_minmax(0,1fr)] md:gap-12">
        <div className="md:self-center">
          <p className="font-mono text-[11px] uppercase leading-[1.5] tracking-[0.16em] text-ink-3">
            Readiness for 4.0
          </p>
          <div className="mt-3 flex items-baseline gap-3">
            <span className="font-display text-[40px] font-extrabold leading-none tabular-nums text-ink-3 md:text-[48px]">
              {before}
            </span>
            <span aria-hidden="true" className="font-display text-[24px] leading-none text-ink-3">
              →
            </span>
            <span className="font-display text-[56px] font-extrabold leading-none tabular-nums text-ink md:text-[72px]">
              {after}
            </span>
            <span className="font-mono text-[13px] leading-none tabular-nums text-optic">
              +{delta}
            </span>
          </div>

          {/*
            One track, two fills: the baseline in neutral, the ground it gained
            in the accent. The accent marks exactly one thing on this object —
            movement — which is the only thing the section is claiming.
          */}
          <div className="relative mt-5 h-1.5 overflow-hidden rounded-full bg-line">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-optic"
              style={{ width: `${after}%` }}
            />
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-line-hover"
              style={{ width: `${before}%` }}
            />
          </div>
          <div className="mt-2.5 flex justify-between font-mono text-[11px] tracking-[0.1em] text-ink-3">
            <span>3.0</span>
            <span>4.0</span>
          </div>
        </div>

        <ul className="md:border-l md:border-line md:pl-12">
          {DEMO_RETEST_SKILLS.map((row, i) => {
            const moved = row.after > row.before;
            return (
              <li
                key={row.skill}
                className={`flex items-center gap-3 py-3.5 md:gap-5 md:py-4 ${
                  i === 0 ? "pt-0 md:pt-0" : "border-t border-line"
                }`}
              >
                <span
                  className={`min-w-0 flex-1 text-[15px] font-semibold leading-[1.3] md:text-[17px] ${
                    moved ? "text-ink" : "text-ink-2"
                  }`}
                >
                  {SKILL_TITLES[row.skill]}
                </span>
                <span className="shrink-0 font-mono text-[13px] tabular-nums text-ink-3">
                  {levelText(row.before)}
                </span>
                <span aria-hidden="true" className="shrink-0 font-mono text-[13px] text-ink-3">
                  →
                </span>
                <span
                  className={`w-[1.75rem] shrink-0 font-mono text-[13px] tabular-nums ${
                    moved ? "text-ink" : "text-ink-3"
                  }`}
                >
                  {levelText(row.after)}
                  <span className="text-ink-3">/3</span>
                </span>
                <span
                  className={`w-[2.25rem] shrink-0 text-right font-mono text-[13px] tabular-nums ${
                    moved ? "text-optic" : "text-ink-3"
                  }`}
                >
                  {moved ? `+${levelText(row.after - row.before)}` : "—"}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      {/*
        The handover, straight off the second diagnosis: fixing the reset does
        not finish the player, it promotes the next-largest gap. This is the
        section's "then the next bottleneck becomes the next three weeks" as a
        computed fact rather than a promise.
      */}
      <p className="mt-6 border-t border-line pt-4 font-mono text-[12px] leading-[1.5] tracking-[0.02em] text-ink-2">
        The reset clears · {nextBottleneck} becomes the next three weeks
      </p>
    </Readout>
  );
}
