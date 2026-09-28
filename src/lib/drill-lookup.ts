import type { GuidedDrill } from "@/components/session/GuidedSession";
import { DRILLS, type Drill } from "@/lib/drills";

/** Find a drill definition by its id across all skill buckets. */
export function findDrillById(id: string): Drill | undefined {
  for (const list of Object.values(DRILLS)) {
    const found = list.find((d) => d.id === id);
    if (found) return found;
  }
  return undefined;
}

/**
 * Minutes from a drill's `duration` string ("15 min" → 15). Every duration in
 * DRILLS is a leading integer, so a leading-number parse is enough; the
 * fallback keeps the guided-session timer from starting at zero if that ever
 * stops being true.
 */
export function parseDurationMinutes(duration: string, fallback = 10): number {
  const minutes = parseInt(duration, 10);
  return Number.isFinite(minutes) && minutes > 0 ? minutes : fallback;
}

/**
 * A drill as the guided session's brief renders it. One mapping, used by the
 * /session route and by the marketing page's live preview, so the two can't
 * disagree about what a drill's brief says.
 */
export function toGuidedDrill(d: Drill): GuidedDrill {
  return {
    id: d.id,
    name: d.name,
    instructions: d.description,
    setup: d.setup,
    cue: d.cue,
    logProtocol: d.logProtocol,
    counts: d.counts,
    practiceTarget: d.practiceTarget,
    duration: d.duration,
    durationMinutes: parseDurationMinutes(d.duration),
    logPrompt: d.logPrompt,
  };
}
