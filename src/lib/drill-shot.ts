import { DRILLS } from "./drills";
import type { SkillId } from "./types";

/** The shot a drill trains — picks the Brief-screen demo animation. */
export type ShotType = "drop" | "reset" | "dink" | "net_defense";

const SKILL_TO_SHOT: Record<SkillId, ShotType> = {
  third_shot_drop: "drop",
  reset: "reset",
  dink_patience: "dink",
  net_defense: "net_defense",
};

/**
 * Which shot a drill maps to, or null if unknown. Derived from DRILLS so a
 * drill only needs to live under its skill — no per-drill wiring. Note that
 * only "drop" has a built demo today; the others resolve here but ShotDemo
 * renders nothing for them until their animations exist.
 */
export function shotTypeForDrill(drillId: string): ShotType | null {
  for (const skill of Object.keys(DRILLS) as SkillId[]) {
    if (DRILLS[skill].some((d) => d.id === drillId)) return SKILL_TO_SHOT[skill];
  }
  return null;
}
