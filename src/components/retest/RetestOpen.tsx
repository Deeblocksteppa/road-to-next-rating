import Link from "next/link";

/**
 * The re-test, once it is open. Shown wherever a player might look for it,
 * whatever else happened that day: Home used to offer it only in the caption
 * under the session button, and that caption gave way to "1 more session
 * this week" as soon as a session was logged, so on re-test day the one
 * entry point could disappear.
 *
 *   - `card`: the main element of a screen (Home, Progress).
 *   - `banner`: a compact line at the top of a screen (Plan).
 */
export function RetestOpen({
  skillPhrase,
  variant = "card",
}: {
  /** In-sentence skill label for the card: "your third-shot drop". */
  skillPhrase?: string;
  variant?: "card" | "banner";
}) {
  if (variant === "banner") {
    return (
      <Link
        href="/retest"
        className="flex items-center justify-between gap-4 rounded-xl border border-optic bg-optic/[0.05] px-4 py-3.5 transition-colors hover:bg-optic/[0.08]"
      >
        <span className="text-[15px] leading-[1.45] text-ink">
          <span className="font-semibold">Your re-test is open.</span> See what moved.
        </span>
        <span className="shrink-0 font-mono text-[11px] uppercase tracking-[0.12em] text-optic">
          Take it ›
        </span>
      </Link>
    );
  }
  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-optic bg-optic/[0.05] p-[22px]">
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-optic">Re-test open</p>
      <h2 className="font-display text-[26px] font-extrabold leading-[1.15] tracking-[-0.01em]">
        {skillPhrase ? `Find out if ${skillPhrase} moved.` : "Find out what moved."}
      </h2>
      <p className="text-pretty text-[15px] leading-[1.55] text-ink-2">
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
