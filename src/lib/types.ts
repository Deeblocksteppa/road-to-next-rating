export type SkillId = "third_shot_drop" | "reset" | "net_defense" | "dink_patience";

export type RootCauseId =
  | "open_play_only"
  | "random_drilling"
  | "well_coached"
  | "unclear";

export type QuestionType = "skill" | "training" | "context" | "text";

export interface AnswerOption {
  id: string;
  label: string;
  skillLevel?: number;          // 0–3, skill questions only
  rootCauseFlag?: RootCauseId;  // training questions only
}

export interface Question {
  id: string;
  prompt: string;
  helperText?: string;
  type: QuestionType;
  measures?: SkillId;
  options?: AnswerOption[];
  required: boolean;
}

export type AnswerMap = Record<string, string>;

export interface SkillScore {
  skill: SkillId;
  level: number;
  importance: number;
  gap: number;
}

export interface Diagnosis {
  bottleneck: SkillId;
  runnersUp: SkillId[];
  rootCause: RootCauseId;
  storyId: string;
  readiness: number;
  mirror: string[];
  bottleneckVerdict: string;
  bottleneckText: string;
  insightHeadline: string; // reveal beat 3 hook — "why it hasn't improved"
  insightBody: string;     // reveal beat 3 body — the non-obvious mechanism
  absolution: string;      // reveal beat 4 headline — talent-ceiling → structure reframe
  absolutionClose: string; // reveal beat 4 close (below divider) — 1 sentence, story-specific
}
