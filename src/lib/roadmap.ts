import { Diagnosis, AnswerMap, SkillId } from "./types";
import { DRILLS, Drill } from "./drills";
import { SKILL_LABELS } from "./diagnoses";
import { QUESTIONS } from "./questions";

export interface Roadmap {
  goalLabel: string;
  bottleneckLabel: string;
  weeklyDrills: Drill[];
  hasPartner: boolean;
  inGameRule: string;
  retestMetric: string;
  weeksTarget: number;
}

const IN_GAME_RULES: Record<SkillId, string> = {
  reset:
    "When you're caught mid-court, reset soft instead of attacking, even if you lose the point. You're trading this week's games for next month's level.",
  third_shot_drop:
    "Commit to the drop on every third shot this week, even when it fails. You need the reps more than the wins right now.",
  net_defense:
    "When someone speeds up at you, your first job is to stay in the point, not counter-attack. Block first, look for offense second.",
  dink_patience:
    "In every dink rally, wait for a ball that is above net height AND out in front before you speed up. Reset everything else, no exceptions.",
};

const RETEST_METRICS: Record<Exclude<SkillId, "third_shot_drop">, string> = {
  reset:
    "Can you reset a hard ball at your feet from mid-court without it floating up? Count 10 attempts. Aim for 6+ clean.",
  net_defense:
    "When someone speeds up at your body, can you block it back and stay in the point? Aim for 6 of 10.",
  dink_patience:
    "In your next 3 games, count how many times you speed up on a ball that wasn't actually attackable. Aim for fewer than 3 per game.",
};

/**
 * The third-shot drop's re-test target, set from where the player started.
 *
 * It is the one skill the assessment asks about as a count out of ten, so it
 * is the one target that can be stated against a starting point. The start
 * is the range they chose (never a single number nobody collected), and the
 * target is one the re-test can actually register: the re-test asks the same
 * question with the same four ranges (0, 1–3, 4–6, 7–10).
 *
 *   - started at 0 or 1–3 → "Target: 5+" (lands in the next range up);
 *   - started at 4–6, already around five → "Target: 7+", the next range;
 *   - started at 7–10 → nothing higher to aim at, so hold it under pressure.
 *
 * This used to read "Aim for 5+ (up from where you started)" for everyone,
 * including a player who had answered 4–6.
 */
function thirdShotRetestMetric(answers: AnswerMap): string {
  const measure =
    "Out of 10 drops in a real game, count how many land soft without getting attacked.";
  const option = QUESTIONS.find((q) => q.id === "third_shot")?.options?.find(
    (o) => o.id === answers["third_shot"]
  );
  const range = option?.short;
  if (!option || !range) return `${measure} Target: 5+.`;

  const level = option.skillLevel ?? 0;
  if (level >= 3) return `${measure} You started at ${range}. Hold 7+ under game pressure.`;
  return `${measure} You started at ${range}. Target: ${level >= 2 ? "7+" : "5+"}.`;
}

function retestMetricFor(bottleneck: SkillId, answers: AnswerMap): string {
  return bottleneck === "third_shot_drop"
    ? thirdShotRetestMetric(answers)
    : RETEST_METRICS[bottleneck];
}

/**
 * Whether the plan should assume a drilling partner. One rule, used when the
 * plan is generated and again wherever a saved plan is rendered, so the two
 * can't disagree: only "I have a reliable drilling partner and play up often"
 * counts. "Sometimes, but not consistently" gets the solo versions, which are
 * the ones a player can be sure of doing.
 */
export function hasDrillingPartner(answers: AnswerMap): boolean {
  return answers["partner_access"] === "a";
}

/**
 * The drill as prescribed to this player: the partner version, or — for a
 * player without a partner — the drill's complete solo version. Plans store
 * only drill ids, so every surface that renders a saved plan's drills must go
 * through this (via `loadPlanDrills` on the server), or a solo player sees
 * partner instructions they can't follow.
 */
export function prescribeDrill(drill: Drill, hasPartner: boolean): Drill {
  if (hasPartner || !drill.requiresPartner || !drill.solo) return drill;
  return { ...drill, ...drill.solo };
}

export function generateRoadmap(diagnosis: Diagnosis, answers: AnswerMap): Roadmap {
  const hasPartner = hasDrillingPartner(answers);
  const weeklyDrills = DRILLS[diagnosis.bottleneck]
    .slice(0, 2)
    .map((d) => prescribeDrill(d, hasPartner));

  return {
    goalLabel: "Road to 4.0",
    bottleneckLabel: SKILL_LABELS[diagnosis.bottleneck],
    weeklyDrills,
    hasPartner,
    inGameRule: IN_GAME_RULES[diagnosis.bottleneck],
    retestMetric: retestMetricFor(diagnosis.bottleneck, answers),
    weeksTarget: 3,
  };
}
