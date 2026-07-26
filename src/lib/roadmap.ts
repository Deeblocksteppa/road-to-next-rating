import { Diagnosis, AnswerMap, SkillId } from "./types";
import { DRILLS, Drill } from "./drills";
import { SKILL_LABELS } from "./diagnoses";

export interface Roadmap {
  goalLabel: string;
  bottleneckLabel: string;
  weeklyDrills: Drill[];
  hasPartner: boolean;
  inGameRule: string;
  retestMetric: string;
  weeksTarget: number;
}

// Short (2–4 word) focus phrase per bottleneck — used in the Home/Plan week
// caption ("Week 2 of 3 — Pressure and feedback"). There's no per-week theme
// data to derive this from, so it's a fixed label per skill, same pattern as
// IN_GAME_RULES / RETEST_METRICS below.
export const WEEK_FOCUS_LABELS: Record<SkillId, string> = {
  reset: "Pressure and feedback",
  third_shot_drop: "Volume and feedback",
  net_defense: "Reflex and repetition",
  dink_patience: "Patience under pressure",
};

const IN_GAME_RULES: Record<SkillId, string> = {
  reset:
    "When you're caught mid-court, reset soft instead of attacking — even if you lose the point. You're trading this week's games for next month's level.",
  third_shot_drop:
    "Commit to the drop on every third shot for the next two weeks, even when it fails. You need the reps more than the wins right now.",
  net_defense:
    "When someone speeds up at you, your first job is to stay in the point — not counter-attack. Block first, look for offense second.",
  dink_patience:
    "In every dink rally, wait for a ball that is above net height AND out in front before you speed up. Reset everything else, no exceptions.",
};

const RETEST_METRICS: Record<SkillId, string> = {
  reset:
    "Can you reset a hard ball at your feet from mid-court without it floating up? Count 10 attempts — aim for 6+ clean.",
  third_shot_drop:
    "Out of 10 drops in a real game, how many land soft without getting attacked? Aim for 5+ (up from where you started).",
  net_defense:
    "When someone speeds up at your body, can you block it back and stay in the point? Aim for 6 of 10.",
  dink_patience:
    "In your next 3 games, count how many times you speed up on a ball that wasn't actually attackable. Aim for fewer than 3 per game.",
};

export function generateRoadmap(diagnosis: Diagnosis, answers: AnswerMap): Roadmap {
  const drills = DRILLS[diagnosis.bottleneck];
  const hasPartner = answers["partner_access"] === "a";

  const weeklyDrills = hasPartner
    ? drills.slice(0, 2)
    : drills.map((d) => ({ ...d, description: d.soloVariant ?? d.description })).slice(0, 2);

  return {
    goalLabel: "Road to 4.0",
    bottleneckLabel: SKILL_LABELS[diagnosis.bottleneck],
    weeklyDrills,
    hasPartner,
    inGameRule: IN_GAME_RULES[diagnosis.bottleneck],
    retestMetric: RETEST_METRICS[diagnosis.bottleneck],
    weeksTarget: 3,
  };
}
