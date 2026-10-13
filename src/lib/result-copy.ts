import { QUESTIONS } from "@/lib/questions";
import type { AnswerMap, Diagnosis, SkillId } from "@/lib/types";

/**
 * Copy for the anonymous result page that is built from the player's own
 * answers. Presentation only: nothing here feeds the engine or the scoring,
 * and every line quotes or restates an answer the player actually gave.
 */

interface AnswerPick {
  label: string;
  level: number;
}

function pick(questionId: string, answers: AnswerMap): AnswerPick | null {
  const option = QUESTIONS.find((q) => q.id === questionId)?.options?.find(
    (o) => o.id === answers[questionId]
  );
  return option ? { label: option.label, level: option.skillLevel ?? 0 } : null;
}

/**
 * The question whose answer best stands for a skill's rating. The reset is
 * scored from two questions; the mid-court one is quoted unless the
 * kitchen-line one was rated lower, since the plan's drills and re-test are
 * about the mid-court reset.
 */
const PRIMARY_QUESTION: Record<SkillId, string> = {
  third_shot_drop: "third_shot",
  reset: "transition_reset",
  net_defense: "net_defense",
  dink_patience: "dink_patience",
};

/** The answer the player gave about their focus skill, verbatim. */
export function focusAnswer(bottleneck: SkillId, answers: AnswerMap): string | null {
  const primary = pick(PRIMARY_QUESTION[bottleneck], answers);
  if (bottleneck === "reset") {
    const netHold = pick("net_hold", answers);
    if (netHold && (!primary || netHold.level < primary.level)) return netHold.label;
  }
  return primary?.label ?? null;
}

/**
 * Why this skill: the reveal's verdict clause for this player, then the
 * answer behind it in their own words.
 *
 * It is the same sentence the reveal showed (`verdictClause`), so the two
 * can't disagree. This used to say "this is where your answers leave the
 * most room" to everyone, including a player whose focus is the reset on its
 * weight rather than on their lowest rating, and one who rated all four
 * skills at the top.
 *
 * The quote is left off when the clause already opens by restating their
 * answers ("You said your dinks break down…", "You rated yourself at the
 * top…"); it would say the same thing twice.
 */
export function focusReason(diagnosis: Diagnosis, answers: AnswerMap): string {
  const clause = diagnosis.verdictClause;
  const answer = focusAnswer(diagnosis.bottleneck, answers);
  if (!answer || /^You (said|rated)\b/.test(clause)) return clause;
  return `${clause} You said: “${answer}.”`;
}

/**
 * Where the player started on the re-test measure, quoted from the answer
 * they gave, for the skills answered in words.
 *
 * The third-shot drop is the exception: it is answered as a count out of
 * ten, so its starting range and a target set from it are part of the plan's
 * own re-test metric (`roadmap.ts`), where the Plan tab shows them too. It
 * returns null here so the page doesn't say the start twice.
 */
export function retestStart(bottleneck: SkillId, answers: AnswerMap): string | null {
  if (bottleneck === "third_shot_drop") return null;
  const answer = focusAnswer(bottleneck, answers);
  return answer ? `You started at: “${answer}.”` : null;
}
