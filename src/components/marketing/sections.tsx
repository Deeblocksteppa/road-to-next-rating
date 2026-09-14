import Link from "next/link";
import { LogoFull, Logo } from "@/components/brand/Logo";
import { QUESTIONS } from "@/lib/questions";
import { AppShot } from "./AppShot";
import type { ShotKey } from "./shots";
import { BreakRule } from "./BreakRule";
import { RiseIn } from "./RiseIn";
import { GapLedger, RetestReadout, RootCauseReadout, ScoreReadout } from "./readouts";
import {
  Body,
  Cta,
  Label,
  Section,
  SectionHeading,
  SectionLabel,
  Statement,
} from "./primitives";

const START = "/start";

/* ─────────────────────────── Hero ─────────────────────────── */

/**
 * The site banner: wordmark and the one returning-user door.
 *
 * It lives outside the hero, and outside `<main>`, for two reasons. The hero
 * used to be the page's `<header>` — so it was the banner landmark, and it
 * held the h1, the lede and the primary CTA. A screen-reader user jumping to
 * `main`, the standard first move, landed after all three. And the sign-in
 * link used to be `hidden … sm:block`, which put the only door back into the
 * product at y=8,749 of an 8,866px page on the device this product is
 * specified for. It is a 14px text link; it costs nothing next to the
 * wordmark and it does not compete with the optic CTA below it.
 */
export function SiteHeader() {
  return (
    <header className="px-6 pt-8 md:px-10 md:pt-12">
      <div className="hero-in mx-auto flex w-full max-w-[1120px] items-center justify-between gap-4">
        <LogoFull />
        {/* `-my-3 py-3` buys a 45px tap target out of 21px of text without
            moving anything: the padding grows the hit box, the margin gives
            the row its height back. */}
        <Link
          href="/login"
          className="-mx-2 -my-3 px-2 py-3 text-[14px] text-ink-2 underline decoration-line-hover underline-offset-4 transition-colors hover:text-ink hover:decoration-ink-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-optic"
        >
          Sign in
        </Link>
      </div>
    </header>
  );
}

export function Hero() {
  return (
    <section className="relative overflow-hidden px-6 pb-24 pt-16 md:px-10 md:pb-32 md:pt-24">
      <div className="mx-auto w-full max-w-[1120px]">
        {/*
          Copy splits across the width rather than stacking in one column,
          because the object below it is landscape: a full-width readout under a
          half-width text block reads as the page's subject, which is the whole
          point of putting real product data here instead of a phone frame.
        */}
        <div className="grid gap-y-8 md:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] md:items-end md:gap-x-14 lg:gap-x-20">
          <div>
            <div className="hero-in" style={{ "--hero-delay": "80ms" } as React.CSSProperties}>
              <Label>For players stuck at 3.0–4.0</Label>
            </div>

            <h1
              className="hero-in mt-5 text-balance font-display text-[40px] font-extrabold leading-[1.06] tracking-[-0.03em] text-ink md:text-[64px] md:leading-[1.03] lg:text-[80px]"
              style={{ "--hero-delay": "160ms" } as React.CSSProperties}
            >
              You don&apos;t have ten weaknesses. You have one.
            </h1>
          </div>

          <div className="md:pb-2">
            <p
              className="hero-in max-w-[44ch] text-pretty text-[17px] leading-[1.55] text-ink-1 md:text-[20px] md:leading-[1.5]"
              style={{ "--hero-delay": "240ms" } as React.CSSProperties}
            >
              You&apos;ve been playing for two years and still don&apos;t know what&apos;s
              actually holding you back. Twelve questions finds the one skill capping your
              rating — and the three weeks that fix it.
            </p>

            <div
              className="hero-in mt-8 flex flex-col items-start gap-4"
              style={{ "--hero-delay": "320ms" } as React.CSSProperties}
            >
              <Cta href={START} className="w-full sm:w-auto">
                Find your bottleneck — free
              </Cta>
              <Label tone="body">
                {QUESTIONS.length} questions · 4 minutes · no signup required
              </Label>
            </div>
          </div>
        </div>

        {/*
          The claim above, as the product's own reading. Not a screenshot: the
          reveal screens are one-idea-per-screen by design, so a capture of one
          is words in a frame — this is the four-skill scoring itself, computed
          by the engine, laid out wide enough to be read at page scale.
        */}
        <div
          className="hero-in mt-14 md:mt-16"
          style={{ "--hero-delay": "400ms" } as React.CSSProperties}
        >
          <ScoreReadout glow />
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────── The problem ───────────────────────── */

/**
 * The plateau, as a statement rather than a paragraph.
 *
 * This used to be an eyebrow, a heading and a paragraph in a 52ch column on a
 * full-width section — a composition that is over half empty by construction,
 * sitting at position 2, exactly where a visitor decides whether the page is
 * serious. One sentence at display scale across the whole container has no
 * empty half to explain, and gives the page a change of rhythm before the
 * three mechanism steps start.
 */
export function Problem() {
  return (
    <Section tone="raised" className="border-t border-line-soft !py-24 md:!py-36">
      <RiseIn>
        <Statement>
          Open play rewards what you&apos;re already good at — so the one shot gating
          your next level never gets the reps.
        </Statement>
      </RiseIn>
    </Section>
  );
}

/* ───────────────────────── How it works ───────────────────────── */

/** The numbered marker every step opens with: "01 —— THE SKILL". */
function StepMarker({ index, label }: { index: string; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="font-mono text-[11px] leading-none tracking-[0.16em] text-optic">
        {index}
      </span>
      <span aria-hidden="true" className="h-px w-8 bg-line-strong" />
      <span className="font-mono text-[11px] uppercase leading-none tracking-[0.16em] text-ink-3">
        {label}
      </span>
    </div>
  );
}

/**
 * A step whose evidence is a landscape data object rather than a phone-shaped
 * screenshot: the argument runs across the top in two columns, and the object
 * takes the section's full width underneath.
 */
function DataStep({
  index,
  label,
  heading,
  body,
  children,
}: {
  index: string;
  label: string;
  heading: string;
  body: string;
  children: React.ReactNode;
}) {
  return (
    <RiseIn>
      {/* `items-start`, not `items-end`: every step in this group hangs its
          text from one top axis, so the heading and the paragraph beside it
          begin on the same line rather than ending on one. */}
      <div className="grid gap-y-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:items-start md:gap-x-12 lg:gap-x-16">
        <div>
          <StepMarker index={index} label={label} />
          <h3 className="mt-4 text-balance font-display text-[20px] font-bold leading-[1.3] text-ink md:text-[22px]">
            {heading}
          </h3>
        </div>
        <Body className="max-w-[46ch] md:pb-1">{body}</Body>
      </div>
      <div className="mt-8 md:mt-10">{children}</div>
    </RiseIn>
  );
}

/**
 * One step of the mechanism: numbered marker, argument, screenshot.
 *
 * Text left, visual right — the same hand as the two DataSteps above it. The
 * side used to be switchable via a `flip` prop, which nothing ever set; the
 * prop is gone so "these three never alternate" is structural rather than a
 * default nobody happened to override. The 01/02/03 numerals already carry
 * the sequence, so alternating sides would only cost alignment discipline.
 */
function Step({
  index,
  label,
  heading,
  body,
  shot,
  reveal,
  anchor,
}: {
  index: string;
  label: string;
  heading: string;
  body: string;
  shot: ShotKey;
  reveal?: number;
  anchor?: "top" | "center" | number;
}) {
  return (
    /*
      `items-start`, not `items-center`. Centred, the text block floated 171px
      below the card's top edge — the two shared no horizontal line, which is
      what read as disconnected. Top-aligned, the marker and the card's top
      edge start together.
    */
    <RiseIn className="grid items-start gap-y-8 gap-x-10 md:grid-cols-[minmax(0,1fr)_minmax(0,440px)] md:gap-x-14 lg:gap-x-20">
      <div>
        <StepMarker index={index} label={label} />
        <h3 className="mt-4 text-balance font-display text-[20px] font-bold leading-[1.3] text-ink md:text-[22px]">
          {heading}
        </h3>
        <Body className="mt-3 max-w-[42ch]">{body}</Body>
      </div>
      {/*
        The shot column is sized to the card rather than to a fraction of the
        row, so there is no leftover space around the frame to fill with a
        surface. The card is the object; the page ground is its ground.
      */}
      {/* Full width at 375 like the two readouts above it — a 300px cap here
          made this step's visual 27px narrower than theirs on the one screen
          where all three stack into a single column. */}
      <div className="w-full">
        <AppShot shot={shot} reveal={reveal} anchor={anchor} />
      </div>
    </RiseIn>
  );
}

/**
 * The mechanism, in three steps.
 *
 * "How it works" is no longer a section of its own. As one it was a preamble
 * to a preamble: a heading and a paragraph saying twelve answers get scored on
 * both axes, immediately followed by 01 and 02 saying the same thing with the
 * actual data attached. It survives as the group's header — a centred eyebrow
 * and one heading naming the two axes the three steps then walk through.
 */
export function HowItWorks() {
  return (
    <Section className="border-t border-line-soft">
      {/*
        Max-width in px, not ch: `ch` resolves against this wrapper's own 16px
        body font rather than the 32px heading inside it, which sized the
        header to a third of its intended measure.
      */}
      <RiseIn className="mx-auto max-w-[420px] text-center md:max-w-[620px]">
        <SectionLabel align="center">How it works</SectionLabel>
        <SectionHeading size="group" className="mt-5">
          Two questions, not one: what&apos;s broken, and why it never fixed itself.
        </SectionHeading>
      </RiseIn>

      <div className="mt-16 flex flex-col gap-16 md:mt-24 md:gap-24">
        <DataStep
          index="01"
          label="The skill"
          heading="Which of the four skills that gate 4.0 is actually your constraint."
          body="Four skills get scored, then weighted by how much each one separates 3.5 from 4.0. The largest weighted gap is your bottleneck — not a ranked list of ten things."
        >
          <GapLedger />
        </DataStep>
        <DataStep
          index="02"
          label="The root cause"
          heading="And why that skill never developed, given how you actually train."
          body="The same twelve answers separately diagnose your training structure. The same weak shot has a different fix depending on which one you are — and this is the part nothing else tells you."
        >
          <RootCauseReadout />
        </DataStep>
        <Step
          index="03"
          label="The reading"
          heading="One number you can re-test against, instead of a vibe."
          body="Both axes resolve into a readiness score for 4.0. You re-test after the plan, so improvement becomes a delta instead of a feeling."
          // Measured off the capture: content runs 0.26–0.65 down the source,
          // everything else is empty screen, so `center` on a tight reveal
          // lands below all of it. 0.62 is the shallowest crop that still
          // reads as a phone — anything under 0.553 (1179/2132) makes the
          // frame wider than tall, and the screen reads as a slice of
          // something rather than as a screen. Centred on the content band so
          // the room above and below is symmetric and reads as the app's own.
          shot="readiness"
          reveal={0.62}
          anchor={0.382}
        />
      </div>

      {/*
        The argument closes here, and belief is highest at exactly this point.
        Without this the page runs ~7,700px on mobile between the hero CTA and
        the next one — the whole persuasion arc with nothing to tap.
      */}
      <RiseIn className="mt-16 flex flex-col items-center gap-4 md:mt-20">
        <Cta href={START}>Find your bottleneck — free</Cta>
        <Label tone="body" className="text-center">
          {QUESTIONS.length} questions · 4 minutes · no signup required
        </Label>
      </RiseIn>
    </Section>
  );
}

/* ─────────────────────────── The plan ─────────────────────────── */

const PLAN_POINTS = [
  {
    title: "A plan built on one skill",
    body: "A sequence aimed at the single constraint — not a library to browse.",
  },
  {
    title: "Named drills, with visual demos",
    body: "Every session names the drill and shows the shot.",
  },
  {
    // Precise about what a logged session is and is not: it is a practice
    // record kept beside the plan. The re-test — and every readiness number on
    // this page — is the twelve questions answered again, and nothing logged
    // in a session feeds it. The old line ("so the plan measures something")
    // read as though it did.
    title: "Sessions you log as you go",
    body: "Each drill records makes out of attempts, so your practice has a history — kept beside the plan, separate from the re-test.",
  },
  {
    title: "An in-game rule for the week",
    body: "One constraint to carry into open play.",
  },
];

export function Plan() {
  return (
    <Section tone="raised" className="border-t border-line-soft">
      <div className="grid gap-y-10 md:grid-cols-[minmax(0,1fr)_minmax(0,400px)] md:items-center md:gap-x-14 lg:gap-x-20">
        <div>
          <RiseIn>
            <SectionLabel>The plan</SectionLabel>
            <SectionHeading className="mt-5">
              Three weeks, one skill, and a number at the end of it.
            </SectionHeading>
          </RiseIn>

          <RiseIn delay={80}>
            <ul className="mt-8 flex flex-col">
              {PLAN_POINTS.map((point, i) => (
                <li
                  key={point.title}
                  className={`flex gap-4 py-5 ${i === 0 ? "" : "border-t border-line"}`}
                >
                  {/* Neutral, not optic. A list marker is not something the
                      page is pointing at, and nine accent dots spend the
                      break's currency before the break arrives. */}
                  <span
                    aria-hidden="true"
                    className="mt-[11px] h-[6px] w-[6px] shrink-0 rounded-full bg-ink-3"
                  />
                  <div>
                    <h3 className="font-display text-[18px] font-semibold leading-[1.35] text-ink md:text-[20px]">
                      {point.title}
                    </h3>
                    <p className="mt-1.5 text-[15px] leading-[1.55] text-ink-2 md:text-[16px]">
                      {point.body}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </RiseIn>
        </div>

        {/*
          The page's one bleed. Cropping a frame flat is a depth signal that
          says the screen carries on past the edge; it only reads that way
          while it is the exception, so it is spent here — the longest single
          screen on the page, beside the list describing what fills it — and
          nowhere else.
        */}
        <RiseIn delay={120} className="mx-auto w-full max-w-[320px] md:max-w-none">
          <AppShot shot="session" reveal={0.72} bleed />
        </RiseIn>
      </div>
    </Section>
  );
}

/* ───────────────────────── Proof / progress ───────────────────────── */

export function Progress() {
  return (
    <Section className="border-t border-line-soft">
      <RiseIn className="max-w-[52ch]">
        <SectionLabel>Proof it moved</SectionLabel>
        <SectionHeading className="mt-5">
          Then you re-test, and find out whether any of it worked.
        </SectionHeading>
        <Body className="mt-4">
          The score moves or it doesn&apos;t, and every skill shows its own delta. Then the
          next bottleneck becomes the next three weeks.
        </Body>
      </RiseIn>

      {/*
        One landscape object, the same shape as steps 01 and 02, rather than
        two phone captures side by side. The captures were of two different app
        surfaces — one on the app ground, one on `reveal-bg` — so they read as
        two different greys no markup could reconcile; their crops could not be
        squared without exposing a "0 weeks" streak card on one or slicing a
        CTA in half on the other; and they showed a second player (68 → 81 on
        hands at the net) under a page whose every other number is the reset
        player at 63. See `RetestReadout` and `demo-run.ts` for the numbers.
      */}
      <RiseIn delay={80} className="mt-12 md:mt-14">
        <RetestReadout />
      </RiseIn>
    </Section>
  );
}

/* ─────────────────────────── Pricing ─────────────────────────── */

/**
 * Every line below was checked against the code that gates it, not against
 * earlier copy. The facts, as of this writing:
 *
 *   – `/retest` and `submitRetest` have no subscription check: anyone can
 *     re-test, and every re-test retires the old plan and writes a new one.
 *     There is no "first plan"; every plan is free.
 *   – `recordDrillSession` has no subscription check either. Logging never
 *     runs out.
 *   – The Delta screen shows the headline score change (old → new, +N) to
 *     everyone and locks only the per-skill rows. Progress shows the current
 *     readiness and "+N since start" to everyone once there is a re-test, and
 *     locks the chart, the history list and the streak card.
 *   – The next bottleneck is diagnosed and planned for on every re-test
 *     regardless of tier, so it is not a paid feature and is not listed as
 *     one.
 *
 * Nothing here says "always" or "forever": neither is a commitment the
 * product has made, and the copy should not make it on the product's behalf.
 */
const FREE = [
  "The full 12-question assessment and your diagnosis",
  "A three-week plan for your bottleneck — and a new one after every re-test",
  "Guided sessions with drill demos and logging, for as long as you train",
  "Re-tests, with the headline score change: old reading, new reading, and the difference",
  "Your current readiness on Home and Progress",
];

const PAID = [
  "Per-skill deltas on every re-test — which of the four skills moved, and by how much",
  "Your readiness chart across every re-test, with your logged sessions beneath it",
  "Re-test history, labelled by plan cycle",
  "Weekly session streaks",
];

/** A price line: the amount at display weight, and the billing basis under it in mono. */
function PriceLine({
  amount,
  unit,
  basis,
  mark,
}: {
  amount: string;
  unit: string;
  basis: string;
  /** Optional neutral chip — the annual line's "better value" mark. */
  mark?: string;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
      <div>
        <p className="font-display text-[32px] font-extrabold leading-none tracking-[-0.01em] tabular-nums text-ink">
          {amount}
          <span className="text-[15px] font-semibold tracking-normal text-ink-2">{unit}</span>
        </p>
        <p className="mt-2 font-mono text-[11px] uppercase leading-[1.5] tracking-[0.12em] tabular-nums text-ink-3">
          {basis}
        </p>
      </div>
      {mark ? (
        <span className="inline-flex shrink-0 items-center rounded-xs border border-line-strong px-[9px] py-[5px] font-mono text-[10px] uppercase leading-none tracking-[0.10em] text-ink-2">
          {mark}
        </span>
      ) : null}
    </div>
  );
}

export function Pricing() {
  return (
    <Section id="pricing" className="border-t border-line-soft">
      <RiseIn className="max-w-[52ch]">
        <SectionLabel>Pricing</SectionLabel>
        <SectionHeading className="mt-5">
          The diagnosis is free. So is every plan after it.
        </SectionHeading>
        <Body className="mt-4">
          No card to start. Paying adds the record: how each re-test compared to the
          last, skill by skill, kept over time.
        </Body>
      </RiseIn>

      <RiseIn delay={80} className="mt-10 grid gap-5 md:mt-12 md:grid-cols-2 md:gap-6">
        {/*
          Free carries the accent, because it is the only card on this page the
          visitor can act on. Pointing the accent at a tier that is offered
          inside the app made the loudest element on the page the one thing
          nobody here can buy.
        */}
        <div className="flex flex-col rounded-2xl border border-optic bg-[rgba(216,227,76,0.05)] p-6 md:p-8">
          {/* Not `text-optic`: DESIGN.md forbids the accent as a heading
              colour outright. The card's optic border and 5% tint already
              rank this tier, and its CTA is the one thing in the pricing
              viewport that should carry the accent. */}
          <h3 className="font-mono text-[11px] uppercase leading-[1.6] tracking-[0.16em] text-ink-2">
            Free
          </h3>
          <div className="mt-5">
            <PriceLine amount="$0" unit="" basis="No card · no trial clock" />
          </div>
          <ul className="mt-8 flex flex-col gap-3.5">
            {FREE.map((item) => (
              <li key={item} className="flex gap-3 text-[15px] leading-[1.55] text-ink-1">
                <span
                  aria-hidden="true"
                  className="mt-[9px] h-[5px] w-[5px] shrink-0 rounded-full bg-ink-3"
                />
                {item}
              </li>
            ))}
          </ul>
          <div className="mt-auto pt-8">
            <Cta href={START} className="w-full">
              Start the assessment
            </Cta>
          </div>
        </div>

        {/*
          Paid — stated plainly, never louder than the free action. Both
          billing options sit at the same display weight: the monthly price
          used to be a mono footnote after the annual one, which hid the
          lower-commitment way in behind the higher-commitment one. Annual is
          marked as the better value with a neutral chip, not with the accent.
        */}
        <div className="flex flex-col rounded-2xl border border-line bg-surface p-6 md:p-8">
          <h3 className="font-mono text-[11px] uppercase leading-[1.6] tracking-[0.16em] text-ink-3">
            The record
          </h3>
          <div className="mt-5 flex flex-col gap-4 divide-y divide-line">
            <PriceLine
              amount="$79"
              unit="/year"
              basis="Equivalent to $6.58/month · billed annually"
              mark="Best value · save 17%"
            />
            <div className="pt-4">
              <PriceLine amount="$7.99" unit="/month" basis="Billed monthly" />
            </div>
          </div>
          <ul className="mt-8 flex flex-col gap-3.5">
            {PAID.map((item) => (
              <li key={item} className="flex gap-3 text-[15px] leading-[1.55] text-ink-2">
                <span
                  aria-hidden="true"
                  className="mt-[9px] h-[5px] w-[5px] shrink-0 rounded-full bg-ink-3"
                />
                {item}
              </li>
            ))}
          </ul>
          <div className="mt-auto pt-8">
            {/*
              What actually happens at the moment the two tiers diverge. The
              offer itself appears inside the app: on the Delta screen after a
              re-test, on Progress once there is a re-test to chart, and as a
              row in Settings. It is never in the way of training.
            */}
            <p className="text-[14px] leading-[1.5] text-ink-2">
              After a re-test, everyone sees the new score and how far it moved.
              Subscribers also see which skills moved, and each re-test joins a chart
              and history that build from there. The offer appears inside the app; it
              is never required to keep training.
            </p>
          </div>
        </div>
      </RiseIn>

      <RiseIn delay={140} className="mt-8">
        <Label className="text-center">
          No card to start · cancel anytime · cancelling stops billing and keeps the
          free tier
        </Label>
      </RiseIn>

      {/* Last dark gesture on the page: the flat line lifts, and the section
          immediately after it breaks the whole surface to accent. */}
      <RiseIn delay={200} className="mt-16 md:mt-20">
        <BreakRule align="center" className="mx-auto max-w-[280px]" />
      </RiseIn>
    </Section>
  );
}

/* ───────────────────────── Final CTA ───────────────────────── */

/**
 * The page's one loud moment.
 *
 * Everything above this is near-black with the accent used at the scale of a
 * dot or a rule — which is the north star ("flat until the break"), but held
 * for 8,000px it reads as absence rather than discipline. The close inverts
 * the whole surface to optic: the plateau finally breaks, at the exact point
 * the visitor is being asked to act.
 *
 * This is a deliberate, single exception to DESIGN.md's One Accent Rule, which
 * otherwise forbids the accent as a background behind body copy. It is scoped
 * to this section and must not spread.
 */
export function FinalCta() {
  return (
    <section className="bg-optic px-6 py-20 text-optic-ink md:px-10 md:py-24">
      <div className="mx-auto w-full max-w-[1120px]">
        <RiseIn className="flex flex-col items-center text-center">
          <p className="font-mono text-[11px] uppercase leading-[1.6] tracking-[0.16em] text-optic-ink/70">
            Four minutes
          </p>
          <h2 className="mt-5 max-w-[16ch] text-balance font-display text-[40px] font-extrabold leading-[1.06] tracking-[-0.03em] md:text-[64px] md:leading-[1.03] lg:text-[80px]">
            Find out what&apos;s actually holding you back.
          </h2>
          <p className="mt-6 max-w-[40ch] text-pretty text-[16px] leading-[1.6] text-optic-ink/80 md:text-[18px] md:leading-[1.55]">
            Twelve questions. No account needed to see your result.
          </p>

          <Link
            href={START}
            className="mt-10 inline-flex h-[52px] w-full items-center justify-center rounded-lg bg-[#131408] px-7 text-[15px] font-semibold text-optic transition-colors hover:bg-[#0B0B0C] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-optic-ink active:scale-[0.98] sm:w-auto"
          >
            Find your bottleneck — free
          </Link>

          <p className="mt-5 font-mono text-[11px] uppercase leading-[1.6] tracking-[0.16em] text-optic-ink/70">
            {QUESTIONS.length} questions · 4 minutes · no signup required
          </p>
        </RiseIn>
      </div>
    </section>
  );
}

/* ─────────────────────────── Footer ─────────────────────────── */

export function Footer() {
  return (
    <footer className="border-t border-line px-6 py-12 md:px-10">
      <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-8 md:flex-row md:items-center md:justify-between">
        <Logo />
        <nav className="flex flex-wrap items-center gap-x-7 gap-y-3">
          {[
            { href: "/login", label: "Sign in" },
            { href: "/privacy", label: "Privacy" },
            { href: "/terms", label: "Terms" },
          ].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="-mx-2 -my-3 px-2 py-3 text-[14px] text-ink-2 transition-colors hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-optic"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-3">
          © {new Date().getFullYear()} Road to Next Rating
        </p>
      </div>
    </footer>
  );
}
