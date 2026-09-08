import Link from "next/link";
import { BreakMark } from "./BreakRule";

/**
 * Shared marketing primitives. Everything here is server-safe; the only client
 * component on the marketing site is RiseIn.
 */

/** Mono smallcaps label — the system's instrument voice. */
export function Label({
  children,
  tone = "muted",
  className = "",
}: {
  children: React.ReactNode;
  tone?: "muted" | "accent" | "body";
  className?: string;
}) {
  const color =
    tone === "accent" ? "text-optic" : tone === "body" ? "text-ink-2" : "text-ink-3";
  return (
    <p
      className={`text-balance font-mono text-[11px] uppercase leading-[1.6] tracking-[0.16em] ${color} ${className}`}
    >
      {children}
    </p>
  );
}

/**
 * A section's opening marker: the logo's break motif, then the mono label.
 * Gives every section the same recognizable entry point instead of a bare
 * line of small caps.
 */
export function SectionLabel({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  /** `center` is for a header that sits above a group rather than beside it. */
  align?: "left" | "center";
}) {
  return (
    <div
      className={`flex items-center gap-3 ${align === "center" ? "justify-center" : ""}`}
    >
      <BreakMark />
      <Label>{children}</Label>
    </div>
  );
}

/**
 * The primary action. One per viewport — this is the accent's whole job.
 * Height and radius match the app's primary button exactly (52px / 14px).
 */
export function Cta({
  href,
  children,
  className = "",
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex h-[52px] items-center justify-center rounded-lg bg-optic px-7 text-[15px] font-semibold text-optic-ink transition-colors hover:bg-optic-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-optic active:scale-[0.98] ${className}`}
    >
      {children}
    </Link>
  );
}

/** Secondary action — neutral surface, border brightens on hover. */
export function GhostCta({
  href,
  children,
  className = "",
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex h-[52px] items-center justify-center rounded-lg border border-line-strong bg-surface-2 px-7 text-[15px] font-semibold text-ink transition-colors hover:border-line-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-optic ${className}`}
    >
      {children}
    </Link>
  );
}

/**
 * Section shell. Owns the page's vertical rhythm in one place so the spacing
 * scale can't drift section to section.
 *
 * `tone="raised"` lifts the ground one step to `#0E0E10` — between `background`
 * and `surface`. Alternating it section to section is what keeps the page from
 * reading as one continuous sheet of prose.
 */
export function Section({
  children,
  className = "",
  id,
  tone = "base",
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
  tone?: "base" | "raised";
}) {
  return (
    <section
      id={id}
      className={`px-6 py-16 md:px-10 md:py-20 ${className}`}
      style={tone === "raised" ? { backgroundColor: "#0E0E10" } : undefined}
    >
      <div className="mx-auto w-full max-w-[1120px]">{children}</div>
    </section>
  );
}

/** Section headline — one per section, no competing focal point. */
export function SectionHeading({
  children,
  size = "section",
  className = "",
}: {
  children: React.ReactNode;
  /**
   * `group` is for a heading that has to hold three numbered steps under it
   * rather than one column of prose. At section scale a centred heading over a
   * 2,300px group reads as a caption that lost its paragraph.
   */
  size?: "section" | "group";
  className?: string;
}) {
  const scale =
    size === "group"
      ? "text-[26px] leading-[1.25] md:text-[32px] md:leading-[1.2]"
      : "text-[22px] leading-[1.3] md:text-[24px] md:leading-[1.3]";
  return (
    <h2
      className={`text-balance font-display font-bold tracking-[-0.01em] text-ink ${scale} ${className}`}
    >
      {children}
    </h2>
  );
}

/**
 * Body copy. Brighter and larger than the app's secondary text: a cold visitor
 * scans this page rather than studying it. Measure stays inside the 65–75ch
 * reading band.
 */
export function Body({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p
      className={`text-pretty text-[16px] leading-[1.6] text-ink-1 md:text-[18px] md:leading-[1.55] ${className}`}
    >
      {children}
    </p>
  );
}

/**
 * A statement section: one sentence, centred, at display scale, spanning the
 * container with nothing beside it.
 *
 * This exists as a rhythm break. Every other section on the page is the same
 * composition — left column of text, right column of visual — and nine of
 * those in a row read as a template rather than as a designed page. A section
 * with no second column also cannot have a void in one: the empty half that
 * made the old prose-only sections feel unfinished is gone because the column
 * that created it is gone.
 *
 * Deliberately breaks DESIGN.md's "nothing is centred except the reveal",
 * which is an in-app rule; the marketing page already centres its close.
 */
export function Statement({ children }: { children: React.ReactNode }) {
  return (
    // 26px, not 30: at 375px a 30px statement ran six centred lines of about
    // twenty characters, which is the hardest wrap on the page. 26 buys four
    // longer lines, and `sm:` never applied at 375 anyway.
    <h2 className="text-balance text-center font-display text-[26px] font-extrabold leading-[1.15] tracking-[-0.02em] text-ink sm:text-[36px] sm:leading-[1.1] md:text-[46px] md:leading-[1.08] lg:text-[54px]">
      {children}
    </h2>
  );
}
