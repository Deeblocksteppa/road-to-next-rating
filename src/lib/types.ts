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
  /**
   * A full sentence shown under the prompt, in the body voice. `helperText` is
   * the mono eyebrow above it and only suits a few words; this is for a
   * question that owes the player an explanation — what an answer is used for,
   * or that it can be skipped.
   */
  note?: string;
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
  bottleneckVerdict: string; // reveal beat 2 — why this shot, from their answers
  bottleneckText: string;    // longer version for the roadmap; not on the reveal
  insightHeadline: string;   // reveal beat 3 — the practice problem, one line
  insightBody: string;       // reveal beat 3 — how their training produced it
  absolution: string;        // reveal beat 4 — one sentence, problem → trainable action
  absolutionClose: string;   // reveal beat 4 close — a few words naming the plan
}
