import Link from "next/link";
import { LogoFull, Logo } from "@/components/brand/Logo";
import { QUESTIONS } from "@/lib/questions";
import { AppShot } from "./AppShot";
import type { ShotKey } from "./shots";
import { BreakRule } from "./BreakRule";
import { RiseIn } from "./RiseIn";
import { GapLedger, RootCauseReadout, ScoreReadout } from "./readouts";
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
      <div className="grid gap-y-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:items-end md:gap-x-12 lg:gap-x-16">
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

/** One step of the mechanism: numbered marker, argument, screenshot. */
function Step({
  index,
  label,
  heading,
  body,
  shot,
  reveal,
  anchor,
  flip = false,
}: {
  index: string;
  label: string;
  heading: string;
  body: string;
  shot: ShotKey;
  reveal?: number;
  anchor?: "top" | "center" | number;
  flip?: boolean;
}) {
  return (
    <RiseIn
      className={`grid items-center gap-y-8 gap-x-10 md:gap-x-14 lg:gap-x-20 ${
        flip
          ? "md:grid-cols-[minmax(0,440px)_minmax(0,1fr)]"
          : "md:grid-cols-[minmax(0,1fr)_minmax(0,440px)]"
      }`}
    >
      <div className={flip ? "md:order-2" : undefined}>
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
      <div className={`mx-auto w-full max-w-[300px] md:max-w-none ${flip ? "md:order-1" : ""}`}>
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
    title: "Sessions that log real numbers",
    body: "You log makes out of attempts, so the plan measures something.",
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
        Both captures are the same run (baseline 68 → 81, +13), so the two
        frames corroborate rather than contradict. Captions carry the naming
        the stage's single label used to do — two screens with one label
        between them made the reader guess which claim mapped to which image.
      */}
      <RiseIn
        delay={80}
        className="mt-12 grid items-start gap-8 md:mt-14 md:grid-cols-2 md:gap-10 lg:gap-14"
      >
        {/* Shown at every width. This was `hidden md:block`, so at 375px the
            section titled "Proof it moved" showed half its proof — and 927px
            later the paid tier's first bullet sold "your readiness chart over
            time", a chart mobile had never been given. */}
        <div className="mx-auto w-full max-w-[320px] md:max-w-none">
          <AppShot
            // 0.76 is the page-ground gap between the re-test history card
            // and the streak card below it; 0.8 clipped a sliver off the
            // streak card's top edge inside an otherwise closed frame.
            shot="progress"
            reveal={0.76}
            caption="Readiness over time"
          />
        </div>
        <div className="mx-auto w-full max-w-[320px] md:max-w-none">
          <AppShot shot="delta" reveal={0.95} caption="One re-test, skill by skill" />
        </div>
      </RiseIn>
    </Section>
  );
}

/* ─────────────────────────── Pricing ─────────────────────────── */

const FREE = [
  "The full 12-question assessment",
  "Your complete diagnosis — bottleneck and root cause",
  "Your first three-week plan",
  "Guided sessions with drill demos and logging",
  "Your home screen and current readiness",
];

const PAID = [
  "Your readiness chart over time",
  "Per-skill deltas on every re-test",
  "Full re-test history and drill streaks",
  "Your next bottlenecks, sequenced",
];

export function Pricing() {
  return (
    <Section id="pricing" className="border-t border-line-soft">
      <RiseIn className="max-w-[52ch]">
        <SectionLabel>Pricing</SectionLabel>
        <SectionHeading className="mt-5">The diagnosis is free. Always.</SectionHeading>
        <Body className="mt-4">
          No card, no trial clock. Paying only adds the record of what changed over time.
        </Body>
      </RiseIn>

      <RiseIn delay={80} className="mt-10 grid gap-5 md:mt-12 md:grid-cols-2 md:gap-6">
        {/*
          Free carries the accent, because it is the only card on this page the
          visitor can act on. Pointing the accent at a tier that says "offered
          inside the app — never before" made the loudest element on the page
          the one thing nobody can buy, under a heading reading "free. Always."
        */}
        <div className="flex flex-col rounded-2xl border border-optic bg-[rgba(216,227,76,0.05)] p-6 md:p-8">
          {/* Not `text-optic`: DESIGN.md forbids the accent as a heading
              colour outright. The card's optic border and 5% tint already
              rank this tier, and its CTA is the one thing in the pricing
              viewport that should carry the accent. */}
          <h3 className="font-mono text-[11px] uppercase leading-[1.6] tracking-[0.16em] text-ink-2">
            Free forever
          </h3>
          <p className="mt-5 font-display text-[32px] font-extrabold leading-none tracking-[-0.01em] text-ink">
            $0
          </p>
          <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.12em] text-ink-3">
            No card · nothing to enter
          </p>
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

        {/* Paid — stated plainly, never louder than the free action. */}
        <div className="flex flex-col rounded-2xl border border-line bg-surface p-6 md:p-8">
          <h3 className="font-mono text-[11px] uppercase leading-[1.6] tracking-[0.16em] text-ink-3">
            The record
          </h3>
          <div className="mt-5 flex items-baseline gap-2">
            <p className="font-display text-[32px] font-extrabold leading-none tracking-[-0.01em] tabular-nums text-ink">
              $79
            </p>
            <p className="text-[15px] text-ink-2">/ year</p>
          </div>
          <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.12em] tabular-nums text-ink-3">
            $6.58 per month · or $12.99 monthly
          </p>
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
            <p className="text-[14px] leading-[1.5] text-ink-2">
              Offered inside the app once you have a re-test worth charting — never before.
            </p>
          </div>
        </div>
      </RiseIn>

      <RiseIn delay={140} className="mt-8">
        <Label className="text-center">
          Your diagnosis, plan, and daily sessions stay free · cancel anytime
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
