import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/brand/Logo";

export const metadata: Metadata = {
  title: "Privacy — Road to Next Rating",
  description: "What Road to Next Rating stores and who processes it.",
};

/**
 * Deliberately a factual summary, not a drafted legal policy. It states only
 * what the code actually does; the binding document still has to be written and
 * reviewed. Saying so plainly is better than shipping invented boilerplate on a
 * product whose whole position is honesty — and far better than the 404 that
 * was here before.
 */
export default function Privacy() {
  return (
    <main className="mx-auto min-h-[100dvh] w-full max-w-[680px] px-6 py-12 md:py-20">
      <Link href="/" className="inline-block">
        <Logo />
      </Link>

      <h1 className="mt-14 font-display text-[32px] font-bold leading-[1.15] tracking-[-0.01em] text-ink">
        Privacy
      </h1>

      <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.16em] text-ink-3">
        Summary — full policy pending
      </p>

      <div className="mt-10 flex flex-col gap-6 text-[16px] leading-[1.6] text-ink-1 md:text-[18px] md:leading-[1.55]">
        <p>
          This page describes what the product stores today. It is a plain-language
          summary, not the final legal policy — that document is still being written, and
          this page will be replaced by it before launch.
        </p>
        <p>
          <strong className="font-semibold text-ink">What is stored.</strong> Your answers
          to the assessment, the diagnosis and plan generated from them, and the drill
          sessions and re-tests you log. If you create an account, your email address.
        </p>
        <p>
          <strong className="font-semibold text-ink">Before you sign up.</strong> You can
          complete the assessment and see your full diagnosis without an account. Those
          answers are saved unclaimed so they can be attached to an account if you later
          choose to make one.
        </p>
        <p>
          <strong className="font-semibold text-ink">Who processes it.</strong> Supabase
          stores the data and handles sign-in. Stripe handles payment if you subscribe —
          card details go to Stripe, never to us. Resend sends reminder emails.
        </p>
        <p>
          <strong className="font-semibold text-ink">What is not done with it.</strong>
          {" "}
          Your data is not sold, and it is not used to train anything.
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
