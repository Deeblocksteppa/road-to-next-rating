import type { Metadata } from "next";
import {
  FinalCta,
  Footer,
  Hero,
  HowItWorks,
  Plan,
  Pricing,
  Problem,
  Progress,
  SiteHeader,
} from "@/components/marketing/sections";
import { StatRow } from "@/components/marketing/StatRow";

/**
 * The public storefront. A server component on purpose: it is the first thing
 * cold traffic from a social link hits, so it ships as static HTML and can
 * export the link-preview metadata a client component cannot.
 *
 * The anonymous assessment funnel lives at /start.
 */
export const metadata: Metadata = {
  title: "Road to Next Rating — find the one skill capping your pickleball rating",
  description:
    "You don't have ten weaknesses. You have one. Twelve questions finds the skill holding your rating at 3.5, why it hasn't moved, and the three weeks that fix it. Free.",
  openGraph: {
    title: "You don't have ten weaknesses. You have one.",
    description:
      "Twelve questions finds the one skill capping your pickleball rating — and the three weeks that fix it. Free, no signup.",
    siteName: "Road to Next Rating",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "You don't have ten weaknesses. You have one.",
    description:
      "Twelve questions finds the one skill capping your pickleball rating — and the three weeks that fix it. Free, no signup.",
  },
};

export default function MarketingHome() {
  return (
    <div className="min-h-[100dvh] bg-background text-ink">
      {/*
        Visible only on focus. On a ~7,500px page with eight tabbable elements
        and no in-page nav, a keyboard user otherwise tabs the whole banner
        before reaching the one thing the page is asking them to do.
      */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-6 focus:top-6 focus:z-50 focus:inline-flex focus:h-[52px] focus:items-center focus:rounded-lg focus:bg-optic focus:px-7 focus:text-[15px] focus:font-semibold focus:text-optic-ink"
      >
        Skip to content
      </a>

      <SiteHeader />

      {/*
        `main` starts at the hero, not after it. The hero was previously the
        page's `<header>` — the banner landmark — while holding the h1, the
        lede and the primary CTA, so a screen-reader user jumping to `main`
        landed past all three. StatRow sat between `</header>` and `<main>`,
        inside no landmark at all.
      */}
      <main id="main">
        <Hero />
        <StatRow />
        <Problem />
        <HowItWorks />
        <Plan />
        <Progress />
        <Pricing />
        <FinalCta />
      </main>
      <Footer />
    </div>
  );
}
