import Link from "next/link";

/**
 * The re-test, once it is open. Shown wherever a player might look for it,
 * whatever else happened that day: Home used to offer it only in the caption
 * under the session button, and that caption gave way to "1 more session
 * this week" as soon as a session was logged, so on re-test day the one
 * entry point could disappear.
 *
 *   - `block`: the main element of a screen (Home, Progress, the session
 *     recap). Flat: hairlines, no tinted card, and the button is its only
 *     accent.
 *   - `banner`: a compact line at the top of a screen (Plan), between
 *     hairlines, with the screen's one primary button.
 */
export function RetestOpen({
  skillPhrase,
  variant = "block",
}: {
  /** In-sentence skill label for the block: "your third-shot drop". */
  skillPhrase?: string;
  variant?: "block" | "banner";
}) {
  if (variant === "banner") {
    return (
      <section className="flex flex-col items-start gap-3 border-y border-line py-4">
        <p className="text-[16px] leading-[1.5] text-ink">
          <span className="font-semibold">Your re-test is open.</span> See what moved.
        </p>
        <Link
          href="/retest"
          className="inline-flex h-11 items-center justify-center rounded-lg bg-optic px-5 text-[15px] font-semibold text-optic-ink transition-colors hover:bg-optic-hover active:scale-[0.98]"
        >
          Take your re-test
        </Link>
      </section>
    );
  }
  return (
    <section className="flex flex-col gap-3 border-y border-line py-6">
      <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3">Re-test open</p>
      <h2 className="font-display text-[26px] font-extrabold leading-[1.15] tracking-[-0.01em]">
        {skillPhrase ? `Find out if ${skillPhrase} moved.` : "Find out what moved."}
      </h2>
      <p className="text-pretty text-[16px] leading-[1.6] text-ink-2">
        Answer the same twelve questions. It takes about four minutes, and your next plan
        starts from the result.
      </p>
      <Link
        href="/retest"
        className="mt-1 flex h-[52px] w-full items-center justify-center rounded-lg bg-optic text-[15px] font-semibold text-optic-ink transition-colors hover:bg-optic-hover active:scale-[0.98]"
      >
        Take your re-test
      </Link>
    </section>
  );
}
