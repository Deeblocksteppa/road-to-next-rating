import { fullDate } from "@/lib/date-format";

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
export const LEGAL_EFFECTIVE_LABEL = fullDate(LEGAL_EFFECTIVE_DATE);

/**
 * What a sign-up records as agreement, in the user's auth metadata. Goes out
 * with the sign-up on both forms and is deleted with the account. Metadata is
 * merged on update, so clearing the pending ids after a claim leaves this alone.
 */
export function consentMetadata() {
  return {
    terms_accepted_at: new Date().toISOString(),
    terms_version: TERMS_VERSION,
  };
}
