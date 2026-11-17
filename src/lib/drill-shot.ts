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
 * drill only needs to live under its skill: no per-drill wiring. Every shot
 * has a court diagram in `ShotDemo`. A version prescribed at a wall uses the
 * wall template instead (`wallLabelsForDrill`).
 */
export function shotTypeForDrill(drillId: string): ShotType | null {
  for (const skill of Object.keys(DRILLS) as SkillId[]) {
    if (DRILLS[skill].some((d) => d.id === drillId)) return SKILL_TO_SHOT[skill];
  }
  return null;
}

/**
 * The labels the wall template shows for one drill: how far to stand, what the
 * return should do, and a height marked on the wall when the drill names one.
 * Each comes from the drill's own description in `drills.ts`; a label is at
 * most three words, like every mono label.
 */
export interface WallLabels {
  /** Where to stand. Absent when the description gives no distance. */
  stand?: string;
  /** What the return off the wall should do. */
  back: string;
  /** A height marked on the wall: "" draws the line unlabelled, undefined draws none. */
  line?: string;
  /** The picture in a sentence, for screen readers. The mono labels read badly aloud. */
  aria: string;
}

const WALL_LABELS: Record<string, WallLabels> = {
  reset_wall: {
    stand: "7–8 FT",
    back: "KNEE HEIGHT",
    aria: "Side view of a wall drill: standing 7 to 8 feet from the wall, the ball goes to the wall and comes back at knee height or lower.",
  },
  speedup_defense: {
    stand: "6–7 FT",
    back: "LOW AND SOFT",
    aria: "Side view of a wall drill: standing 6 to 7 feet from the wall, the ball goes to the wall and comes back low and soft.",
  },
  hands_battle: {
    stand: "4–5 FT",
    back: "NO BOUNCE",
    aria: "Side view of a wall drill: standing 4 to 5 feet from the wall, the ball goes to the wall and comes back without bouncing.",
  },
  dink_50: {
    stand: "KITCHEN DISTANCE",
    back: "NET HEIGHT",
    line: "",
    aria: "Side view of a wall drill: standing at kitchen distance from the wall, the ball goes to the wall and comes back around net height, which is marked on the wall.",
  },
  attack_gate: {
    back: "ABOVE TAPE: FIRM",
    line: "TAPE · 35 IN",
    aria: "Side view of a wall drill: the ball goes to the wall and comes back, with tape on the wall at net height, about 35 inches. A ball above the tape is hit firm.",
  },
};

/** Labels for a drill's wall version, or null when it has none. */
export function wallLabelsForDrill(drillId: string): WallLabels | null {
  return WALL_LABELS[drillId] ?? null;
}
