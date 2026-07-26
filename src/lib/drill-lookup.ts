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
