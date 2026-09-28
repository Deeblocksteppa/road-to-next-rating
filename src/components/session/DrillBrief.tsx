import type { GuidedDrill } from "@/components/session/GuidedSession";

/**
 * The body of a drill brief: title, technique instructions, and what gets
 * logged when the timer ends.
 *
 * Shared by the guided session's brief screen and the marketing site's live
 * session preview, so the page can never show different drill copy from the
 * app — the stale `session.png` capture it replaces showed two generations of
 * old instructions. `as` sets the heading level: the app screen's h1 is the
 * drill name; on the marketing page the drill name sits under section headings.
 */
export function DrillBriefContent({
  drill,
  retestMetric,
  as: Heading = "h1",
}: {
  drill: GuidedDrill;
  retestMetric: string | null;
  as?: "h1" | "h3";
}) {
  return (
    <>
      <Heading className="font-display text-2xl font-bold leading-[1.25] tracking-[-0.01em]">
        {drill.name}
      </Heading>

      <p className="text-[15px] leading-[1.6] text-ink">{drill.instructions}</p>

      {/*
        What gets logged, settled before the clock starts. One protocol for
        every drill (the last set of ten), what counts, and the two targets
        labelled apart so "7 of 10" here and "aim for 5+" on the plan read as
        two different measurements rather than a contradiction.
      */}
      <section className="flex flex-col gap-2.5 rounded-xl border border-line bg-surface px-4 py-3.5">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-3">
          When the timer ends
        </p>
        <p className="text-[14px] leading-[1.5] text-ink">
          <span className="font-semibold">{drill.logProtocol}</span> {drill.counts}
        </p>
        <div className="flex flex-col gap-1 border-t border-line pt-2.5">
          <p className="font-mono text-[11px] uppercase leading-[1.6] tracking-[0.1em] text-ink-2">
            Practice target <span className="text-ink">{drill.practiceTarget}</span>
          </p>
          {/* Sentence case: at this length mono caps wrapped at 375px. */}
          {retestMetric && (
            <p className="text-[13px] leading-[1.5] text-ink-2">
              The match re-test target is a separate number, on your plan.
            </p>
          )}
        </div>
      </section>
    </>
  );
}
