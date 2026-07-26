import { AnswerMap, Diagnosis, RootCauseId, SkillId, SkillScore } from "./types";
import { QUESTIONS } from "./questions";
import { STORIES, FALLBACK, SKILL_LABELS } from "./diagnoses";

const IMPORTANCE: Record<SkillId, number> = {
  reset: 1.4,
  third_shot_drop: 1.2,
  net_defense: 1.0,
  dink_patience: 0.9,
};

// Returns the skillLevel for a given question id + chosen option id
function getSkillLevel(questionId: string, optionId: string): number {
  const q = QUESTIONS.find((q) => q.id === questionId);
  if (!q || !q.options) return 0;
  const opt = q.options.find((o) => o.id === optionId);
  return opt?.skillLevel ?? 0;
}

// Returns the rootCauseFlag for a given question id + chosen option id
function getRootCauseFlag(questionId: string, optionId: string): RootCauseId | null {
  const q = QUESTIONS.find((q) => q.id === questionId);
  if (!q || !q.options) return null;
  const opt = q.options.find((o) => o.id === optionId);
  return opt?.rootCauseFlag ?? null;
}

export function scoreSkills(answers: AnswerMap): SkillScore[] {
  // net_hold and transition_reset both measure reset — average them
  const netHoldLevel = getSkillLevel("net_hold", answers["net_hold"] ?? "");
  const transitionLevel = getSkillLevel("transition_reset", answers["transition_reset"] ?? "");
  const resetLevel = (netHoldLevel + transitionLevel) / 2;

  const raw: Record<SkillId, number> = {
    reset: resetLevel,
    third_shot_drop: getSkillLevel("third_shot", answers["third_shot"] ?? ""),
    net_defense: getSkillLevel("net_defense", answers["net_defense"] ?? ""),
    dink_patience: getSkillLevel("dink_patience", answers["dink_patience"] ?? ""),
  };

  return (Object.keys(raw) as SkillId[]).map((skill) => {
    const level = raw[skill];
    const importance = IMPORTANCE[skill];
    return { skill, level, importance, gap: importance * (3 - level) };
  });
}

function inferRootCause(answers: AnswerMap): RootCauseId {
  const masterFlag = getRootCauseFlag("open_play_ratio", answers["open_play_ratio"] ?? "");
  const qualityFlag = getRootCauseFlag("drilling_quality", answers["drilling_quality"] ?? "");
  const partnerFlag = getRootCauseFlag("partner_access", answers["partner_access"] ?? "");

  // open_play_ratio is the master variable
  if (masterFlag === "open_play_only") return "open_play_only";
  if (masterFlag === "well_coached") {
    // Both support signals confirm well_coached
    if (qualityFlag === "well_coached" || partnerFlag === "well_coached") return "well_coached";
    // Master says well_coached but the others suggest otherwise — nuance
    return "random_drilling";
  }

  // Master is "unclear" — break tie with quality + partner
  const votes: RootCauseId[] = [qualityFlag, partnerFlag].filter(Boolean) as RootCauseId[];
  const tally: Partial<Record<RootCauseId, number>> = {};
  for (const v of votes) tally[v] = (tally[v] ?? 0) + 1;

  const sorted = (Object.entries(tally) as [RootCauseId, number][]).sort((a, b) => b[1] - a[1]);
  return sorted[0]?.[0] ?? "unclear";
}

function buildMirror(answers: AnswerMap): string[] {
  const bullets: string[] = [];

  const plateauOption = QUESTIONS.find((q) => q.id === "plateau_duration")
    ?.options?.find((o) => o.id === answers["plateau_duration"]);
  if (plateauOption) {
    bullets.push(`You've been at this level for: ${plateauOption.label.toLowerCase()}.`);
  }

  const ratioOption = QUESTIONS.find((q) => q.id === "open_play_ratio")
    ?.options?.find((o) => o.id === answers["open_play_ratio"]);
  if (ratioOption) {
    bullets.push(`On court, your time looks like: ${ratioOption.label.toLowerCase()}.`);
  }

  const loseReason = answers["lose_reason"];
  if (loseReason?.trim()) {
    bullets.push(`When you lose games you should win, you said: "${loseReason.trim()}"`);
  }

  return bullets;
}

export function diagnose(answers: AnswerMap): Diagnosis {
  const scores = scoreSkills(answers);
  const sorted = [...scores].sort((a, b) => b.gap - a.gap);

  const bottleneckScore = sorted[0];
  const bottleneck = bottleneckScore.skill;
  const runnersUp = sorted.slice(1, 3).map((s) => s.skill);

  const rootCause = inferRootCause(answers);

  const story = STORIES.find(
    (s) => s.match.bottleneck === bottleneck && s.match.rootCause === rootCause
  );

  const sumOfLevels = scores.reduce((sum, s) => sum + s.level, 0);
  const maxLevels = scores.length * 3;
  const readiness = Math.round(40 + (sumOfLevels / maxLevels) * 45);

  const mirror = buildMirror(answers);

  const bottleneckLabel = SKILL_LABELS[bottleneck];

  return {
    bottleneck,
    runnersUp,
    rootCause,
    storyId: story?.id ?? FALLBACK.id,
    readiness,
    mirror,
    bottleneckVerdict: story?.bottleneckVerdict ?? `Right now, ${bottleneckLabel} is the single biggest thing holding your game back.`,
    bottleneckText: story?.bottleneckText ?? `The data points clearly to ${bottleneckLabel} as your primary bottleneck right now.`,
    insightHeadline: story?.insightHeadline ?? FALLBACK.insightHeadline,
    insightBody: story?.insightBody ?? FALLBACK.insightBody,
    absolution: story?.absolution ?? FALLBACK.absolution,
    absolutionClose: story?.absolutionClose ?? FALLBACK.absolutionClose,
  };
}
