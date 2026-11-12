import { Diagnosis, AnswerMap, SkillId } from "./types";
import { DRILLS, Drill } from "./drills";
import { SKILL_LABELS } from "./diagnoses";
import { QUESTIONS } from "./questions";
import { PLAN_WEEKS } from "./session-plan";

export interface Roadmap {
  goalLabel: string;
  bottleneckLabel: string;
  weeklyDrills: Drill[];
  hasPartner: boolean;
  inGameRule: string;
  retestMetric: string;
  weeksTarget: number;
}

/**
 * "In your games": the one thing to do in open play while the drills do their
 * work. One sentence per skill.
 */
const IN_GAME_RULES: Record<SkillId, string> = {
  reset: "When you're caught mid-court, reset soft instead of attacking, even if it costs the point.",
  third_shot_drop: "Go for the drop on every third shot, even when it fails.",
  net_defense: "When someone speeds up at you, block first and look for offense second.",
  dink_patience: "In every dink rally, speed up only on a ball above net height and out in front.",
};

const RETEST_GOALS: Record<Exclude<SkillId, "third_shot_drop">, string> = {
  reset: "Cleanly reset 6 of 10 hard balls at your feet from mid-court.",
  net_defense: "Block back 6 of 10 speed-ups at your body and stay in the point.",
  dink_patience: "In your next 3 games, speed up on an unattackable ball fewer than 3 times a game.",
};

/**
 * The third-shot drop's re-test goal, set from where the player started.
 *
 * It is the one skill the assessment asks about as a count out of ten, so it
 * is the one goal that can be stated against a starting point. The start is
 * the range they chose (never a single number nobody collected), and the goal
 * is one the re-test can register: the re-test asks the same question with
 * the same four ranges (0, 1–3, 4–6, 7–10).
 *
 *   - started at 1–3 → 5 or more, "up from 1–3";
 *   - started at 4–6 → 7 or more, "up from 4–6";
 *   - started at 7–10 → nothing higher to aim at, so keep landing them;
 *   - started at 0 ("none land, or I usually just drive"), or no readable
 *     answer → 5 or more, with no "up from": that answer covers a player who
 *     doesn't attempt the drop, and "up from 0" would say they had tried.
 */
function thirdShotRetestGoal(answers: AnswerMap | null): string {
  const option = QUESTIONS.find((q) => q.id === "third_shot")?.options?.find(
    (o) => o.id === answers?.["third_shot"]
  );
  const level = option?.skillLevel ?? 0;
  const range = option?.short;
  if (!option || !range || level <= 0) {
    return "In a real game, land 5 or more of 10 drops without getting attacked.";
  }
  if (level >= 3) return "Keep landing 7 or more of 10 drops without getting attacked in real games.";
  return `In a real game, land ${level >= 2 ? 7 : 5} or more of 10 drops without getting attacked, up from ${range}.`;
}

/** "In your games" for a skill. Pure, so a saved plan's page can render it without reading the row. */
export function inGameRuleFor(bottleneck: SkillId): string {
  return IN_GAME_RULES[bottleneck];
}

/**
 * "Re-test goal" for a skill, from the answers behind the diagnosis (only the
 * third-shot drop's goal reads them; null gets its no-answer wording).
 *
 * Both sentences are rendered from here wherever a plan is shown, not read
 * back from the plan row, so a plan made before a wording change shows the
 * same sentence as one made after. The row still records what was written
 * when the plan was made.
 */
export function retestGoalFor(bottleneck: SkillId, answers: AnswerMap | null): string {
  return bottleneck === "third_shot_drop" ? thirdShotRetestGoal(answers) : RETEST_GOALS[bottleneck];
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
    inGameRule: inGameRuleFor(diagnosis.bottleneck),
    retestMetric: retestGoalFor(diagnosis.bottleneck, answers),
    weeksTarget: PLAN_WEEKS,
  };
}
