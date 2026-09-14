import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/brand/Logo";

export const metadata: Metadata = {
  title: "Terms — Road to Next Rating",
  description: "What Road to Next Rating is, what it costs, and what it does not claim.",
};

/**
 * As with /privacy: a factual summary of how the product actually behaves, not
 * a drafted contract. The billing figures here must stay in step with the
 * pricing section and with `src/lib/stripe.ts`.
 */
export default function Terms() {
  return (
    <main className="mx-auto min-h-[100dvh] w-full max-w-[680px] px-6 py-12 md:py-20">
      <Link href="/" className="inline-block">
        <Logo />
      </Link>

      <h1 className="mt-14 font-display text-[32px] font-bold leading-[1.15] tracking-[-0.01em] text-ink">
        Terms
      </h1>

      <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.16em] text-ink-3">
        Summary — full terms pending
      </p>

      <div className="mt-10 flex flex-col gap-6 text-[16px] leading-[1.6] text-ink-1 md:text-[18px] md:leading-[1.55]">
        <p>
          A plain-language summary of how the product works, not the final legal terms —
          that document is still being written and will replace this page before launch.
        </p>
        <p>
          <strong className="font-semibold text-ink">What this is.</strong> A coaching
          tool that scores your own answers against a fixed model of four skills and
          produces a diagnosis and a three-week plan. It is not a rating body. Your DUPR
          or self-rating is whatever you tell it — nothing here is verified against, or
          reported to, any official rating system.
        </p>
        <p>
          <strong className="font-semibold text-ink">What it does not promise.</strong> The
          readiness score is a reading derived from your own answers. Following a plan does
          not guarantee your rating will move.
        </p>
        <p>
          <strong className="font-semibold text-ink">What it costs.</strong> The
          assessment, your diagnosis, every three-week plan, guided sessions, re-tests with
          the headline score change, and your current readiness are free, with no card
          required. A subscription — $79 per year or $7.99 per month — adds per-skill
          re-test deltas, your readiness chart and re-test history, and session streaks.
          Cancel any time; cancelling stops future billing and leaves the free product
          intact.
        </p>
        <p>
          <strong className="font-semibold text-ink">Injury.</strong> This is physical
          training you carry out unsupervised. Use your own judgement about what your body
          can do.
        </p>
      </div>

      <Link
        href="/"
        className="mt-14 inline-block text-[15px] text-ink-2 underline decoration-line-hover underline-offset-4 transition-colors hover:text-ink hover:decoration-ink-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-optic"
      >
        Back
      </Link>
    </main>
  );
}
