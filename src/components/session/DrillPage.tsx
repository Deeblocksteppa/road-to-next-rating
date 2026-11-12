import Link from "next/link";

import { ShotDemo } from "@/components/session/ShotDemo";
import { ReadingRows } from "@/components/ui/reading-rows";
import { scoringRule, setupWho, type DrillUnit } from "@/lib/drills";

/** A drill as its page shows it: the prescribed version's fields. */
export interface DrillPageDrill {
  id: string;
  name: string;
  /** The drill in one sentence. The full technique is on the timer, behind "View instructions". */
  task: string;
  /** "Partner" / "Wall" / "Solo". */
  setup: string;
  duration: string;
  /** What counts as a success. */
  counts: string;
  /** What gets logged: "Your last set of 10 drops". */
  logProtocol: string;
  /** "7 of 10". */
  practiceTarget: string;
  /** What the player is in the middle of when the timer ends. */
  unit: DrillUnit;
}

/**
 * A drill's page, top to bottom: diagram, name, the drill in one sentence,
 * its facts as rows, and the one scoring rule.
 *
 * Shared by the guided session's first screen, the read-only page a plan row
 * opens (/plan and the anonymous /start), and the landing's example drill, so
 * the three can't describe a drill differently. `as` sets the heading level:
 * the app screen's h1 is the drill name; on the landing it sits under section
 * headings.
 */
export function DrillPageBody({
  drill,
  as: Heading = "h1",
}: {
  drill: DrillPageDrill;
  as?: "h1" | "h3";
}) {
  return (
    <>
      <ShotDemo drillId={drill.id} setup={drill.setup} />

      <div className="flex flex-col gap-2">
        <Heading className="font-display text-2xl font-bold leading-[1.25] tracking-[-0.01em] text-ink">
          {drill.name}
        </Heading>
        <p className="text-pretty text-[16px] leading-[1.6] text-ink">{drill.task}</p>
      </div>

      <div className="flex flex-col gap-3">
        <ReadingRows
          rows={[
            { label: "Time", value: drill.duration },
            { label: "Who", value: setupWho(drill.setup) },
            { label: "Counts", value: drill.counts },
            { label: "Log", value: drill.logProtocol },
            { label: "Target", value: drill.practiceTarget },
          ]}
        />
        <p className="text-pretty text-[16px] leading-[1.6] text-ink-2">{scoringRule(drill.unit)}</p>
      </div>
    </>
  );
}

/** The back arrow and "Drill 1 of 2". */
export function DrillPageHeader({
  backHref,
  backLabel,
  position,
  total,
  replace = false,
}: {
  backHref: string;
  /** For screen readers: where the arrow goes ("Back to my plan"). */
  backLabel: string;
  position: number;
  total: number;
  /**
   * Replace the history entry, not push one: for the read-only page, which a
   * plan row pushed. Otherwise the phone's back gesture, after the arrow,
   * reopens the drill.
   */
  replace?: boolean;
}) {
  return (
    <header className="flex items-center gap-4 pt-4">
      <Link
        href={backHref}
        replace={replace}
        aria-label={backLabel}
        className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-line-strong text-ink-2 transition-colors after:absolute after:-inset-1 after:content-[''] hover:border-line-hover hover:text-ink"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M15 5l-7 7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </Link>
      <span className="font-mono text-[11px] uppercase tracking-[0.14em] tabular-nums text-ink-2">
        Drill {position} of {total}
      </span>
    </header>
  );
}

/** "Next: Live Drop Practice · 15 min", under Begin. */
export function NextDrillLine({ next }: { next: { name: string; duration: string } | null }) {
  if (!next) return null;
  return (
    <p className="font-mono text-[11px] uppercase leading-[1.6] tracking-[0.12em] text-ink-3">
      Next: {next.name} · {next.duration}
    </p>
  );
}

/**
 * The drill page with nothing to press: what a plan row opens. Starting a
 * session lives on the plan's "Start session" and on Home, so this has the
 * back arrow and nothing else to tap, in every state. No "Next" line either:
 * that belongs under Begin, and the plan it came from lists both drills.
 */
export function DrillPageReadOnly({
  drill,
  position,
  total,
  backHref,
}: {
  drill: DrillPageDrill;
  position: number;
  total: number;
  backHref: string;
}) {
  return (
    <div className="flex flex-col gap-6">
      <DrillPageHeader
        backHref={backHref}
        backLabel="Back to my plan"
        position={position}
        total={total}
        replace
      />
      <DrillPageBody drill={drill} />
    </div>
  );
}
