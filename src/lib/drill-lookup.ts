import type { GuidedDrill } from "@/components/session/GuidedSession";
import { DRILLS, type Drill } from "@/lib/drills";
import type { SkillId } from "@/lib/types";

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
 * A drill as the guided session renders it. One mapping, used by the /session
 * route, the read-only drill page and the marketing page's live preview, so
 * they can't disagree about what a drill's page says.
 */
export function toGuidedDrill(d: Drill): GuidedDrill {
  return {
    id: d.id,
    name: d.name,
    task: d.task,
    instructions: d.description,
    setup: d.setup,
    cue: d.cue,
    logProtocol: d.logProtocol,
    unit: d.unit,
    counts: d.counts,
    practiceTarget: d.practiceTarget,
    duration: d.duration,
    durationMinutes: parseDurationMinutes(d.duration),
    logPrompt: d.logPrompt,
  };
}

/**
 * The skill a set of drill ids trains: drills live under their skill in
 * `DRILLS`, so a plan's drills say which skill it is for without reading its
 * diagnosis. Null when no id resolves.
 */
export function skillForDrills(drillIds: string[]): SkillId | null {
  for (const skill of Object.keys(DRILLS) as SkillId[]) {
    if (DRILLS[skill].some((d) => drillIds.includes(d.id))) return skill;
  }
  return null;
}
