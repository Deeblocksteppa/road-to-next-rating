/**
 * The date on all three legal pages, and the version a sign-up agrees to. Set
 * to the merge date: re-dating is this one line.
 */
export const LEGAL_EFFECTIVE_DATE = "2026-10-30";

export const TERMS_VERSION = LEGAL_EFFECTIVE_DATE;

/** The pages, under the names `audit/legal-copy.md` gives them. */
export const LEGAL_LINKS = [
  { href: "/terms", label: "Terms" },
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/refunds", label: "Refund Policy" },
];

/** "October 30, 2026" */
export const LEGAL_EFFECTIVE_LABEL = new Date(LEGAL_EFFECTIVE_DATE).toLocaleDateString(
  "en-US",
  { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }
);
