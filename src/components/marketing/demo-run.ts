import { diagnose, scoreSkills } from "@/lib/engine";
import { QUESTIONS } from "@/lib/questions";
import type { AnswerMap, RootCauseId } from "@/lib/types";

/**
 * One complete pass through the real diagnostic engine, used as the source of
 * every number the marketing site's readouts display.
 *
 * These are answers, not results: nothing here is a hand-typed score. The
 * levels, importance weights, weighted gaps, bottleneck and readiness number
 * shown on the landing page all come back from `scoreSkills`/`diagnose`, so the
 * page cannot drift from the engine — change a weight in `engine.ts` or an
 * option's `skillLevel` in `questions.ts` and the site re-renders the new truth.
 *
 * It is an example run, not a customer: PRODUCT.md forbids inventing usage
 * data, so every surface that shows this labels it as an example.
 *
 * The answers are chosen so the engine returns the same reading the reveal
 * screenshot further down the page already shows — the reset as the bottleneck,
 * 63/100 readiness — so the section's three visuals describe one run instead of
 * three unrelated ones.
 */
export const DEMO_ANSWERS: AnswerMap = {
  rating: "3.5 DUPR",
  plateau_duration: "c", // 1–2 years
  play_frequency: "3x a week, ~2 hours",
  open_play_ratio: "b", // Mostly games, occasional drilling
  drilling_quality: "c", // Drills specific shots, picked randomly
  partner_access: "c", // Usual group, no real drilling partner
  net_hold: "c", // Inconsistent — often stuck mid-court
  third_shot: "b", // 4–6 of 10 find the kitchen
  transition_reset: "c", // Pops it up, usually loses the point
  net_defense: "b", // Gets it back but it sits up
  dink_patience: "c", // Impatient — forces the speed-up too early
  lose_reason: "We give away the middle and I get impatient in long dinks.",
};

export const DEMO_DIAGNOSIS = diagnose(DEMO_ANSWERS);

/**
 * Worst-first, which is the same ordering `diagnose` uses internally to pick
 * the bottleneck — so the top row of any readout is the diagnosed skill by
 * construction rather than by a hand-kept coincidence.
 */
export const DEMO_RANKED_SKILLS = [...scoreSkills(DEMO_ANSWERS)].sort(
  (a, b) => b.gap - a.gap
);

/** Short human titles for the engine's root-cause ids. */
export const ROOT_CAUSE_TITLES: Record<RootCauseId, string> = {
  open_play_only: "Open play only",
  random_drilling: "Unfocused drilling",
  well_coached: "Coached, not transferring",
  unclear: "No clear signal",
};

/** One training question, the answer given, and the root cause it votes for. */
export interface TrainingSignal {
  /** Three-word column head — the question, not its full prompt. */
  title: string;
  /** The option label the example run chose, verbatim from `questions.ts`. */
  answer: string;
  flag: RootCauseId;
  /**
   * `open_play_ratio` is the engine's master variable: when it reads a cause
   * outright, `inferRootCause` returns it without going to the vote.
   */
  master: boolean;
}

function signal(questionId: string, title: string, master = false): TrainingSignal {
  const question = QUESTIONS.find((q) => q.id === questionId);
  const option = question?.options?.find((o) => o.id === DEMO_ANSWERS[questionId]);
  // Loud on purpose: this runs at build time, so a renamed question or option
  // fails the build rather than shipping a readout with a blank row in it.
  if (!option?.rootCauseFlag) {
    throw new Error(`demo-run: no root-cause option for ${questionId}`);
  }
  return { title, answer: option.label, flag: option.rootCauseFlag, master };
}

export const DEMO_SIGNALS: TrainingSignal[] = [
  signal("open_play_ratio", "Court time", true),
  signal("drilling_quality", "Drill quality"),
  signal("partner_access", "Who you play"),
];
