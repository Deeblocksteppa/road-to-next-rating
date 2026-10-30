import Link from "next/link";

import { Logo } from "@/components/brand/Logo";
import { SUPPORT_EMAIL, SUPPORT_MAILTO } from "@/lib/contact";
import { LEGAL_EFFECTIVE_LABEL } from "@/lib/legal";

/**
 * The frame for /terms, /privacy and /refunds. The words on those pages are
 * `audit/legal-copy.md` verbatim: change the markdown first, then the page.
 */
export function LegalPage({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto min-h-app w-full max-w-[680px] px-6 py-12 md:py-20">
      <Link href="/" className="inline-block">
        <Logo />
      </Link>

      <h1 className="mt-14 font-display text-[24px] font-bold leading-[1.25] tracking-[-0.01em] text-ink md:text-[32px] md:leading-[1.15]">
        {title}
      </h1>
      <p className="mt-3 text-[15px] leading-[1.5] text-ink-2">
        Effective {LEGAL_EFFECTIVE_LABEL}
      </p>

      <div className="mt-8 flex flex-col gap-4 text-[16px] leading-[1.6] text-ink-1 md:leading-[1.7]">
        {children}
      </div>
    </main>
  );
}

/** One titled section, under a hairline. */
export function LegalSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-4 flex flex-col gap-4 border-t border-line pt-8">
      <h2 className="font-display text-[18px] font-semibold leading-[1.3] text-ink md:text-[20px]">
        {title}
      </h2>
      {children}
    </section>
  );
}

export function LegalList({ children }: { children: React.ReactNode }) {
  return <ul className="flex list-disc flex-col gap-2 pl-5">{children}</ul>;
}

/** A bold lead-in, as in "**Your account.** Your email address…". */
export function Lead({ children }: { children: React.ReactNode }) {
  return <strong className="font-semibold text-ink">{children}</strong>;
}

export function LegalLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="text-ink underline decoration-line-hover underline-offset-4 transition-colors hover:decoration-ink-2"
    >
      {children}
    </Link>
  );
}

export function SupportEmail() {
  return (
    <a
      href={SUPPORT_MAILTO}
      className="text-ink underline decoration-line-hover underline-offset-4 transition-colors hover:decoration-ink-2"
    >
      {SUPPORT_EMAIL}
    </a>
  );
}
