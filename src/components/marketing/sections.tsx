import Link from "next/link";
import { LogoFull, Logo } from "@/components/brand/Logo";
import { SUPPORT_EMAIL, SUPPORT_MAILTO } from "@/lib/contact";
import { QUESTIONS } from "@/lib/questions";
import { BreakMark, BreakRule } from "./BreakRule";
import { RiseIn } from "./RiseIn";
import {
  PriorityTable,
  ReadingCenterpiece,
  RetestNumbers,
  RetestStrip,
  RootCauseSplit,
  ScoreReadout,
  SessionBriefReadout,
} from "./readouts";
import {
  Body,
  Caption,
  Cta,
  GhostCta,
  Section,
  SectionHeading,
  Statement,
} from "./primitives";

const START = "/start";
/** The page's one action, said the same way every time it appears. */
const CTA_LABEL = "Find your bottleneck, free";

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
          className="-mx-2 -my-3 shrink-0 whitespace-nowrap px-2 py-3 text-[15px] text-ink-2 underline decoration-line-hover underline-offset-4 transition-colors hover:text-ink hover:decoration-ink-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-optic"
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
          {/*
            Headline, one sentence, the CTA, one caption — nothing else. The
            eyebrow and a three-sentence lede used to stack above the CTA and
            pushed it below the fold at 375px; the audience ("stuck at
            3.0–4.0") now rides in the one sentence.
          */}
          <h1
            className="hero-in text-balance font-display text-[40px] font-extrabold leading-[1.06] tracking-[-0.03em] text-ink md:text-[64px] md:leading-[1.03] lg:text-[80px]"
            style={{ "--hero-delay": "120ms" } as React.CSSProperties}
          >
            You don&apos;t need to fix ten things. Start with one.
          </h1>

          <div className="md:pb-2">
            <p
              className="hero-in max-w-[40ch] text-pretty text-[17px] leading-[1.55] text-ink-1 md:text-[20px] md:leading-[1.5]"
              style={{ "--hero-delay": "220ms" } as React.CSSProperties}
            >
              Stuck at 3.0–4.0? Twelve questions find the skill to work on first, with a
              three-week plan to work on it.
            </p>

            <div
              className="hero-in mt-7 flex flex-col items-start gap-3"
              style={{ "--hero-delay": "300ms" } as React.CSSProperties}
            >
              <Cta href={START} className="w-full sm:w-auto">
                {CTA_LABEL}
              </Cta>
              <Caption>{QUESTIONS.length} questions · about 4 minutes · no signup</Caption>
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
          <ScoreReadout />
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────── The problem ───────────────────────── */

/**
 * The plateau, as a statement rather than a paragraph: one sentence at
 * display scale across the whole container, a change of rhythm before the
 * walkthrough starts.
 */
export function Problem() {
  return (
    <Section tone="raised" className="border-t border-line-soft !py-24 md:!py-36">
      <RiseIn>
        <Statement>
          Open play rewards what you&apos;re already good at. The shot holding you back never
          gets the reps.
        </Statement>
      </RiseIn>
    </Section>
  );
}

/* ───────────────────────── How it works ───────────────────────── */

/**
 * One step on the walkthrough rail.
 *
 * The rail is the logo's plateau line turned on its side: a flat muted
 * hairline running from step to step, which the three steps hang from instead
 * of each opening with its own eyebrow and card. It ends at step three, the
 * reading, where its marker takes the accent: the one place the line breaks.
 *
 * Each step draws the segment below its own marker, down to the next step's
 * marker, so the line is continuous however tall a step grows.
 */
function RailStep({
  index,
  last = false,
  children,
}: {
  index: string;
  last?: boolean;
  children: React.ReactNode;
}) {
  return (
    <li className={`relative pl-11 md:pl-20 ${last ? "" : "pb-20 md:pb-32"}`}>
      {last ? null : (
        <span
          aria-hidden="true"
          className="absolute bottom-0 left-[13px] top-7 w-px bg-line md:left-[19px] md:top-10"
        />
      )}
      <span
        aria-hidden="true"
        className={`absolute left-0 top-0 flex h-7 w-7 items-center justify-center rounded-full border bg-background font-mono text-[11px] tabular-nums md:h-10 md:w-10 ${
          last ? "border-optic text-ink" : "border-line-strong text-ink-2"
        }`}
      >
        {index}
      </span>
      {children}
    </li>
  );
}

/** A step's heading: hangs level with its rail marker. */
function StepHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-balance font-display text-[22px] font-bold leading-[1.27] tracking-[-0.01em] text-ink md:pt-[3px] md:text-[26px] md:leading-[1.3]">
      {children}
    </h3>
  );
}

/**
 * The mechanism, as one walkthrough down a single rail.
 *
 * Each step takes the shape of what it shows, rather than all three sharing
 * a "heading left, paragraph right, card underneath" frame: step one is a
 * ranking set straight on the page, step two is evidence beside its
 * conclusion, step three is one number with the page's second CTA directly
 * under it, so the argument and the action read top to bottom. All three keep
 * the rail's left edge.
 */
export function HowItWorks() {
  return (
    <Section className="border-t border-line-soft">
      <RiseIn className="max-w-[620px]">
        <SectionHeading>
          Two questions, not one: what&apos;s broken, and why it never fixed itself.
        </SectionHeading>
      </RiseIn>

      <ol className="mt-14 md:mt-20">
        <RailStep index="01">
          <RiseIn className="max-w-[620px]">
            <StepHeading>Step one: the skill that matters most for 4.0.</StepHeading>
            <Body className="mt-3">
              Each skill is scored from your answers and weighted by how much it matters at
              4.0. The largest gap is where the plan starts.
            </Body>
          </RiseIn>
          <RiseIn delay={80} className="mt-10 md:mt-12">
            <PriorityTable />
          </RiseIn>
        </RailStep>

        <RailStep index="02">
          <RiseIn>
            <RootCauseSplit>
              <StepHeading>Step two: why it hasn&apos;t improved.</StepHeading>
              {/* The root cause changes the explanation, not the drills: the
                  plan is built from the skill, so this says "stuck for
                  different reasons" rather than "needs a different plan". */}
              <Body className="mt-3">
                Three answers describe how you practice. A player who mostly plays games and
                one who drills but can&apos;t carry it into matches are stuck for different
                reasons.
              </Body>
            </RootCauseSplit>
          </RiseIn>
        </RailStep>

        <RailStep index="03" last>
          <RiseIn>
            <StepHeading>Step three: one number you can re-test against.</StepHeading>
          </RiseIn>
          {/* Same left edge as steps one and two: the walkthrough keeps one
              column from its first step to the CTA. */}
          <RiseIn delay={80} className="mt-10 flex flex-col items-start md:mt-12">
            <ReadingCenterpiece />
            <Body className="mt-8 max-w-[44ch]">
              Your skill and practice answers roll up into one readiness score. Re-test after
              the plan and see how far it moved.
            </Body>
            <div className="mt-9 flex w-full flex-col items-start gap-3">
              <Cta href={START} className="w-full sm:w-auto">
                {CTA_LABEL}
              </Cta>
              <Caption>
                {QUESTIONS.length} questions · about 4 minutes · no signup
              </Caption>
            </div>
          </RiseIn>
        </RailStep>
      </ol>
    </Section>
  );
}

/* ─────────────────────────── The plan ─────────────────────────── */

/**
 * What the plan is: a point and one line on what it means. Set at body size
 * so the column carries its own weight beside the drill card.
 */
const PLAN_POINTS = [
  {
    title: "One skill for three weeks.",
    body: "Every session works the gap that matters most, not a library to browse.",
  },
  {
    title: "Named drills, with the shot shown.",
    body: "Each drill comes with a diagram of the shot and a count to aim for.",
  },
  {
    // A logged count is a practice record kept beside the plan. The re-test
    // (and every readiness number on this page) is the twelve questions
    // answered again; nothing logged in a session feeds it.
    title: "A count logged every session.",
    body: "Your makes out of 10, kept as a practice record apart from the re-test.",
  },
  {
    title: "One rule for your games.",
    body: "A single thing to do in open play while the drills do their work.",
  },
];

export function Plan() {
  return (
    <Section tone="raised" className="border-t border-line-soft">
      <div className="grid gap-y-12 md:grid-cols-[minmax(0,1fr)_minmax(0,460px)] md:items-start md:gap-x-16 lg:gap-x-24">
        <RiseIn>
          <SectionHeading>Three weeks, one skill, and a number at the end of it.</SectionHeading>
          <ul className="mt-8 border-b border-line">
            {PLAN_POINTS.map((point) => (
              <li key={point.title} className="border-t border-line py-5">
                <h3 className="text-pretty text-[16px] font-semibold leading-[1.45] text-ink md:text-[18px]">
                  {point.title}
                </h3>
                <p className="mt-1.5 text-pretty text-[16px] leading-[1.55] text-ink-2 md:text-[18px]">
                  {point.body}
                </p>
              </li>
            ))}
          </ul>
        </RiseIn>

        {/* The example plan's first drill, rendered live with the guided
            session's own brief and shot diagram. */}
        <RiseIn delay={100} className="w-full">
          <SessionBriefReadout />
        </RiseIn>
      </div>
    </Section>
  );
}

/* ───────────────────────── Re-test ───────────────────────── */

/**
 * The re-test as a before and after: the claim on the left, the two numbers
 * on the right at display size, and each skill's movement as a strip of four
 * readings across the full width underneath.
 */
export function Progress() {
  return (
    <Section className="border-t border-line-soft">
      <div className="grid gap-y-10 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:items-end md:gap-x-16">
        <RiseIn>
          <SectionHeading>Re-test after three weeks. See what changed.</SectionHeading>
          <Body className="mt-4 max-w-[44ch]">
            Answer the same twelve questions again and see how your score moved. The next
            gap becomes the next plan.
          </Body>
        </RiseIn>
        <RiseIn delay={80}>
          <RetestNumbers />
        </RiseIn>
      </div>
      <RiseIn delay={140} className="mt-12 md:mt-16">
        <RetestStrip />
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
 *   – The Delta screen shows the headline score change (old → new, +N) and
 *     the trained skill's before and after to everyone, and locks only the
 *     other skills' rows. Progress shows the current
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
  "The 12-question assessment and your diagnosis",
  "A three-week plan, and a new one after every re-test",
  "Guided sessions with drill demos and logging (free account)",
  "Re-tests showing your new score and how your trained skill moved",
  "Your current readiness",
];

const PAID = [
  "How the other skills moved on each re-test",
  "Your readiness chart across every re-test",
  "Full re-test history",
  "Weekly session streaks",
];

function TierList({ items, tone }: { items: string[]; tone: "ink-1" | "ink-2" }) {
  return (
    <ul className="flex flex-col gap-3.5">
      {items.map((item) => (
        <li
          key={item}
          className={`flex gap-3 text-[16px] leading-[1.55] ${tone === "ink-1" ? "text-ink-1" : "text-ink-2"}`}
        >
          <span
            aria-hidden="true"
            className="mt-[10px] h-[5px] w-[5px] shrink-0 rounded-full bg-ink-3"
          />
          {item}
        </li>
      ))}
    </ul>
  );
}

/** A tier's name: a short mono label, never the accent. */
function TierName({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="font-mono text-[11px] uppercase leading-[1.6] tracking-[0.16em] text-ink-2">
      {children}
    </h3>
  );
}

export function Pricing() {
  return (
    <Section id="pricing" className="border-t border-line-soft">
      <RiseIn className="max-w-[56ch]">
        <SectionHeading>The diagnosis is free. So is every plan after it.</SectionHeading>
        {/* "No card" is said here, once, for the whole section. */}
        <Body className="mt-4">
          No card to start. Everything you need to train stays free; paying adds the record
          of what changed, skill by skill.
        </Body>
      </RiseIn>

      {/*
        Two cards at the same weight: same border, same ground. Neither owns
        the accent. The free card used to wear an optic border and tint, which
        made the two read as "recommended" and "other" rather than as two
        tiers. The free action is a neutral button here because the page's
        loudest ask is the optic close directly below.
      */}
      <RiseIn delay={80} className="mt-10 grid gap-5 md:mt-12 md:grid-cols-2 md:gap-6">
        <div className="flex flex-col rounded-2xl border border-line bg-surface p-6 md:p-8">
          <TierName>Free</TierName>
          <p className="mt-6 font-display text-[48px] font-extrabold leading-none tabular-nums text-ink">
            $0
          </p>
          <p className="mt-3 text-[16px] leading-[1.5] text-ink-2">No trial clock.</p>
          <div className="mt-8">
            <TierList items={FREE} tone="ink-1" />
          </div>
          <div className="mt-auto pt-8">
            <GhostCta href={START} className="w-full">
              Start the assessment
            </GhostCta>
          </div>
        </div>

        <div className="flex flex-col rounded-2xl border border-line bg-surface p-6 md:p-8">
          <div className="flex items-center justify-between gap-4">
            <TierName>The record</TierName>
            <span className="inline-flex shrink-0 items-center rounded-xs bg-optic px-[9px] py-[5px] font-mono text-[10px] uppercase leading-none tracking-[0.10em] text-optic-ink">
              Best value
            </span>
          </div>
          {/* Annual is the hero; monthly is the same offer stated smaller,
              not hidden. */}
          <p className="mt-6 font-display text-[48px] font-extrabold leading-none tabular-nums text-ink">
            $79
            <span className="text-[17px] font-semibold tracking-normal text-ink-2">/year</span>
          </p>
          <p className="mt-3 text-[16px] leading-[1.5] tabular-nums text-ink-2">
            $6.58 a month, billed yearly. Saves 17% over monthly.
          </p>
          <p className="mt-1 text-[16px] leading-[1.5] tabular-nums text-ink-2">
            Or $7.99 a month, billed monthly.
          </p>
          <p className="mt-7 text-pretty text-[17px] font-semibold leading-[1.4] text-ink">
            See how every skill moved, every re-test.
          </p>
          <div className="mt-5">
            <TierList items={PAID} tone="ink-2" />
          </div>
          <div className="mt-auto pt-8">
            <div className="flex gap-3 border-t border-line pt-5">
              <BreakMark className="mt-1 shrink-0" />
              <p className="text-pretty text-[16px] leading-[1.5] text-ink-1">
                Offered inside the app after a re-test, right beside the change it explains.
              </p>
            </div>
          </div>
        </div>
      </RiseIn>

      <RiseIn delay={140} className="mt-8">
        <Caption className="text-center">
          Cancel anytime. Cancelling stops billing and keeps the free tier.
        </Caption>
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
            {CTA_LABEL}
          </Link>

          <p className="mt-5 text-[16px] leading-[1.5] text-optic-ink/80">
            {QUESTIONS.length} questions · about 4 minutes · no signup
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
            { href: SUPPORT_MAILTO, label: SUPPORT_EMAIL },
          ].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="-mx-2 -my-3 px-2 py-3 text-[15px] text-ink-2 transition-colors hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-optic"
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
