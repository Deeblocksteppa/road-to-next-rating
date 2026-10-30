/**
 * The date on all three legal pages, and the version a sign-up agrees to. Set
 * to the merge date: re-dating is this one line.
 */
export const LEGAL_EFFECTIVE_DATE = "2026-10-30";

export const TERMS_VERSION = LEGAL_EFFECTIVE_DATE;

/** "October 30, 2026" */
export const LEGAL_EFFECTIVE_LABEL = new Date(LEGAL_EFFECTIVE_DATE).toLocaleDateString(
  "en-US",
  { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }
);
