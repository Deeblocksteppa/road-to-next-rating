import { SkillId, RootCauseId } from "./types";

export const SKILL_LABELS: Record<SkillId, string> = {
  third_shot_drop: "your third-shot drop",
  reset: "resets from the transition zone",
  net_defense: "your hands at the net",
  dink_patience: "your patience in the soft game",
};

// Clean titles for the verdict beat's large display (SKILL_LABELS are in-sentence phrases).
export const SKILL_TITLES: Record<SkillId, string> = {
  third_shot_drop: "Third-shot drop",
  reset: "The reset",
  net_defense: "Hands at the net",
  dink_patience: "Soft-game patience",
};

/**
 * What a story line is allowed to key on: facts read straight from the
 * player's answers, handed over by `diagnose`. Option ids are the ones in
 * `questions.ts`.
 */
export interface StoryFacts {
  skill: SkillId;
  /** No other skill was rated lower than the focus skill (a tie counts). */
  lowest: boolean;
  /** `open_play_ratio` — a: almost all open play, b: mostly games, c: a real mix, d: mostly drilling. */
  ratio?: string;
  /** `drilling_quality` — a: don't really drill, b: warm up and rally, c: shots picked randomly, d: with a plan. */
  drilling?: string;
  /** `dink_patience` — a: patient, b: waits for the miss, c: forces a speed-up, d: dink breaks down first. */
  dink?: string;
}

/** A line of copy: fixed, or chosen from the player's answers. */
export type Line = string | ((facts: StoryFacts) => string);

/**
 * The reveal's authored copy. Each beat has one job and a word budget, and the
 * copy is edited to it:
 *
 *   verdict     — why this shot, traceable to their answers. ≤ 30 words.
 *   insight     — the practice problem: a short headline, then how the way
 *                 they train produced this gap. ≤ 12 + 25–42 words.
 *   absolution  — one sentence turning the problem into a trainable action,
 *                 and a close of a few words naming the plan. ≤ 25 + 10.
 *
 * Nothing claims to have watched them play. The assessment establishes a
 * recommended focus from twelve answers; every line is phrased as that
 * ("based on your answers", "you rated", "you said"), never as a verdict on
 * their game. "Your reset already works", "this was never about talent" and
 * similar lines are gone for that reason. `bottleneckText` is the longer
 * version kept for the roadmap and is not shown on the reveal.
 *
 * One rule on top of that: no line states a specific answer unless every
 * route into the story guarantees the player gave it. A root cause is reached
 * by several answer combinations (`inferRootCause`), and a skill can be the
 * focus on its weight without being the lowest-rated. So a line that depends
 * on an answer is a function of `StoryFacts` with a variant per answer, and
 * everything else is written to hold for every route. "You said you drill
 * with a plan" used to reach players who had answered "I don't really drill".
 *
 * Lines that name the player's level use a `{level}` slot, filled by
 * `diagnose` from question 1: their stated rating ("3.5") when it reads
 * cleanly, else "your current level" (see `lib/rating.ts`). They used to say
 * "3.5" to every player, including a 3.0 and a 3.8.
 */
export interface StoryCopy {
  id: string;
  /**
   * Reveal beat 2, after `VERDICT_OPENER` — why this shot, from their answers.
   * Kept apart from the opener because the saved-result page shows the same
   * sentence on its own (`focusReason`).
   */
  verdictClause: Line;
  bottleneckText: Line;    // deeper version, used later in the roadmap
  insightHeadline: Line;   // reveal beat 3 — the practice problem, in one line
  insightBody: Line;       // reveal beat 3 — how their training produced it
  absolution: Line;        // reveal beat 4 — one sentence, problem → trainable action
  absolutionClose: Line;   // reveal beat 4 close — a few words naming the plan
}

export interface DiagnosisStory extends StoryCopy {
  match: { bottleneck: SkillId; rootCause: RootCauseId };
}

/* ── Lines shared between stories ─────────────────────────────── */

/** How every verdict starts; `diagnose` puts the story's clause after it. */
export const VERDICT_OPENER = "Based on your answers, this is the best place to start.";

// With today's weights only the reset can be the focus without being the
// lowest-rated skill, and it is the heaviest, so "matters most" holds.
const NOT_LOWEST =
  "It isn't the shot you rated lowest, but it matters most for getting to 4.0.";

/** Each skill's verdict clause: why this skill, from their answers. */
const SKILL_CLAUSE: Record<SkillId, (f: StoryFacts) => string> = {
  reset: (f) =>
    f.lowest
      ? "The reset separates {level} from 4.0 more than any other shot, and it's where you rated yourself lowest."
      : NOT_LOWEST,
  third_shot_drop: (f) =>
    f.lowest
      ? "The drop is the shot that gets you to the kitchen, and it's the one you rated least reliable."
      : NOT_LOWEST,
  net_defense: (f) =>
    f.lowest
      ? "Speed-ups at your body are where you rated yourself weakest, and 4.0 opponents will find that."
      : NOT_LOWEST,
  // The dinking question has three different ways of falling short, and only
  // one of them is impatience, so the clause quotes the one they chose.
  dink_patience: (f) => {
    if (f.dink === "c") return "You said the long rallies end when your patience runs out first.";
    if (f.dink === "d") return "You said your dinks break down before the rally is decided.";
    if (f.dink === "b")
      return "You said you keep the rally going and wait for the miss; choosing the ball to attack is the part still to build.";
    return f.lowest ? "The soft game is where you rated yourself lowest." : NOT_LOWEST;
  },
};

/**
 * How much of their court time is games, in the words of the ratio answer
 * they gave. `open_play_only` is also reached from "a real mix of both" plus
 * "I don't really drill", which says nothing about court time overall — only
 * that this shot's reps come from games.
 */
const gameTime = (f: StoryFacts): string => {
  if (f.ratio === "a") return "Almost all of your court time is open play.";
  if (f.ratio === "b") return "Most of your court time goes to games.";
  return "Most of your reps on this shot come in games.";
};

/** `well_coached` is reached without the "with a plan" answer too. */
const drillsWithPlan = (f: StoryFacts): boolean => f.drilling === "d";

// The longer skill descriptions (`bottleneckText`). They describe the skill,
// not the player, so one per skill serves every root cause.
const DEPTH: Record<SkillId, string> = {
  reset:
    "The reset — staying calm under pressure in the transition zone and neutralizing attacks at the net — is the single most separating skill between {level} and 4.0. It's not about hitting a pretty shot. It's about absorbing pace, going soft when your instincts scream 'hit back harder,' and refusing to hand the point away. Players who can reset consistently get to the kitchen, stay there, and run the soft game. Players who can't are pinned in no-man's-land, fighting a battle they can't win.",
  third_shot_drop:
    "The third-shot drop is the gateway skill from {level} to 4.0. Without a reliable one, you're choosing between driving into a wall or handing the net to your opponents on a silver platter every single serve. It's the shot that converts a defensive position into an offensive one — and at 4.0, everyone expects you to have it. It requires soft hands, a feel for arc and depth, and the nerve to commit to a slow ball when the instinct is to attack.",
  net_defense:
    "Hands at the net — handling a ball that's sped up at your body, hip, or shoulder at close range — is one of the defining skills of the 4.0 level. Speed-ups happen constantly in competitive play, and if you don't have a reliable answer for them, opponents will find that out within a game or two and target you relentlessly. A good hands game lets you neutralize aggression, reset the point, and stay in control. Without it, every speed-up feels like a coin flip.",
  dink_patience:
    "Patience in the soft game — staying disciplined in a dinking rally, not manufacturing pace when the ball doesn't deserve it — is what separates players who win points at 4.0 from players who donate them. It's not a flashy skill. Nobody clips it for highlights. But at the kitchen, the player who can wait out a long rally and only speed up on a genuinely attackable ball wins a disproportionate number of exchanges. Impatience is the most reliable way to give the point away for free.",
};

/** One story per skill × root cause the engine can produce. */
export const STORIES: DiagnosisStory[] = [
  /* ── The reset ── */
  {
    id: "reset_open_play",
    match: { bottleneck: "reset", rootCause: "open_play_only" },
    verdictClause: SKILL_CLAUSE.reset,
    bottleneckText: DEPTH.reset,
    insightHeadline: "Games don't teach the reset.",
    insightBody: (f) =>
      `${gameTime(f)} Every point there is live, so a reset gets one rushed attempt and no second try — the shot never gets the calm, repeated reps it needs to form.`,
    absolution:
      "This isn't a ceiling on your game — it's a shot that never got its reps, and reps are something you can schedule.",
    absolutionClose: "Three weeks of low-stakes resets is the plan.",
  },
  {
    id: "reset_random_drilling",
    match: { bottleneck: "reset", rootCause: "random_drilling" },
    verdictClause: SKILL_CLAUSE.reset,
    bottleneckText: DEPTH.reset,
    insightHeadline: "You practice, but not this ball.",
    // `random_drilling` is also reached from "mostly drilling" plus "I don't
    // really drill"; that player never said warm-ups or random shots.
    insightBody: (f) =>
      f.drilling === "a"
        ? "You said you don't really drill, so nothing in your week is built to send this ball. The reset only shows up when a hard ball arrives mid-court, so the shot you need most gets the fewest reps."
        : "Your drilling time goes to warm-up rallies or whatever shot comes to mind that day. The reset only shows up when a hard ball arrives mid-court, and that almost never happens in a warm-up, so the shot you need most gets the fewest reps.",
    absolution:
      "This isn't a lack of effort. The hours are already there; they just need a target.",
    absolutionClose: "Three weeks pointed at one ball.",
  },
  {
    id: "reset_well_coached",
    match: { bottleneck: "reset", rootCause: "well_coached" },
    verdictClause: SKILL_CLAUSE.reset,
    bottleneckText:
      "The reset is the skill that separates {level} from 4.0 — absorbing pace in the transition zone, going soft when everything in you wants to hit back hard, and earning your way to the kitchen rather than hoping your opponents miss. It's unglamorous, repetitive, and absolutely decisive. Players who own it control the tempo of nearly every point. Players who haven't cracked it yet are at the mercy of whoever's being aggressive.",
    insightHeadline: "The reset holds in practice and slips in games.",
    // Says only that the reset isn't reliable in games, which either reset
    // question can establish; it used to say "fails mid-court" to players
    // whose gap came from the kitchen-line question.
    insightBody: (f) =>
      `${drillsWithPlan(f) ? "You said you drill with a plan" : "Your practice has structure"}, and your answers say the reset still isn't reliable in games. That pattern points to a transfer gap: the shot exists at drill pace, not yet at game pace.`,
    absolution:
      "This isn't a technique problem to start over on — it's a shot that needs rehearsing under game chaos, and chaos can be rehearsed.",
    absolutionClose: "Three weeks of resets at real pace is the plan.",
  },

  /* ── Third-shot drop ── */
  {
    id: "third_shot_open_play",
    match: { bottleneck: "third_shot_drop", rootCause: "open_play_only" },
    verdictClause: SKILL_CLAUSE.third_shot_drop,
    bottleneckText: DEPTH.third_shot_drop,
    insightHeadline: "Games give the drop almost no clean reps.",
    insightBody: (f) =>
      `${gameTime(f)} A game moves on whether a drop was good or bad, so there's no feedback and maybe a dozen attempts an hour — far too few for a touch shot to settle.`,
    absolution:
      "This isn't a ceiling — it's a shot that has never had measured reps, and measured reps are the whole plan.",
    absolutionClose: "Count the drops, and the drop shows up.",
  },
  {
    id: "third_shot_random_drilling",
    match: { bottleneck: "third_shot_drop", rootCause: "random_drilling" },
    verdictClause: SKILL_CLAUSE.third_shot_drop,
    bottleneckText: DEPTH.third_shot_drop,
    insightHeadline: "The drop gets practiced, never measured.",
    // "Picked by feel" is the random-shots answer; the other two routes get
    // the same point in the words of the answer they gave.
    insightBody: (f) => {
      const opening =
        f.drilling === "c"
          ? "When you drill, the drop is one shot among several, picked by feel and never counted."
          : f.drilling === "b"
            ? "When you practice, it's a warm-up rally, so the drop is one shot among several and never counted."
            : "You said you don't really drill, so the drop is one shot among several and never counted.";
      return `${opening} Without a number, a good session and a bad one feel the same, so the drop stays as reliable as it was.`;
    },
    absolution: "This isn't a talent gap. It's a missing scoreboard.",
    absolutionClose: "Same practice time, one shot, every rep counted.",
  },
  {
    id: "third_shot_well_coached",
    match: { bottleneck: "third_shot_drop", rootCause: "well_coached" },
    verdictClause: SKILL_CLAUSE.third_shot_drop,
    bottleneckText: DEPTH.third_shot_drop,
    insightHeadline: "The drop holds in practice and slips in games.",
    insightBody:
      "Your practice has structure, so the drop gets real reps. But a deep return in a game, with opponents waiting at the net, is a harder ball than a fed one, and that's the version that isn't holding yet.",
    absolution:
      "This isn't a technique problem to start over on. The shot is built; it needs rehearsing against the balls games actually give you.",
    absolutionClose: "Three weeks of drops under harder conditions.",
  },

  /* ── Hands at the net ── */
  {
    id: "net_defense_open_play",
    match: { bottleneck: "net_defense", rootCause: "open_play_only" },
    verdictClause: SKILL_CLAUSE.net_defense,
    bottleneckText: DEPTH.net_defense,
    insightHeadline: "It feels like slow hands. It's fewer reps.",
    insightBody:
      "Hands at the net are reflex, and a reflex only builds from seeing the same ball many times at real pace. Open play hands you a few speed-ups an hour, spread among everything else.",
    absolution:
      "This isn't about reflexes you weren't born with — it's a ball you've seen too rarely, and you can see it on purpose.",
    absolutionClose: "Three weeks of speed-ups in isolation.",
  },
  {
    id: "net_defense_random_drilling",
    match: { bottleneck: "net_defense", rootCause: "random_drilling" },
    verdictClause: SKILL_CLAUSE.net_defense,
    bottleneckText: DEPTH.net_defense,
    insightHeadline: "Your practice rarely sends this ball.",
    insightBody:
      "Warm-up rallies and mixed drills are mostly slow, friendly balls. Hands sharpen only against pace at your body, repeated until the block is automatic, and that ball rarely shows up in practice without a plan.",
    absolution:
      "This isn't about reflexes you weren't born with. It's a ball your practice hasn't been feeding you.",
    absolutionClose: "Three weeks of feeding it on purpose.",
  },
  {
    id: "net_defense_well_coached",
    match: { bottleneck: "net_defense", rootCause: "well_coached" },
    verdictClause: SKILL_CLAUSE.net_defense,
    bottleneckText: DEPTH.net_defense,
    insightHeadline: "Your hands are trained for drill pace.",
    insightBody:
      "Structured practice gives you speed-ups you can see coming. In games they arrive mid-rally, at your hip, without warning, and a block that works when you're ready breaks down when you're surprised.",
    absolution:
      "This isn't slow hands. It's hands that haven't been tested at game pace often enough.",
    absolutionClose: "Three weeks of speed-ups at real pace.",
  },

  /* ── Soft-game patience ── */
  {
    id: "dink_patience_open_play",
    match: { bottleneck: "dink_patience", rootCause: "open_play_only" },
    verdictClause: SKILL_CLAUSE.dink_patience,
    bottleneckText: DEPTH.dink_patience,
    // "My dink breaks down first" is a consistency answer, not an attack
    // decision, so that player gets the same cause told about the dink.
    insightHeadline: (f) =>
      f.dink === "d"
        ? "Games don't build a steady dink."
        : "Games give patience almost no practice.",
    insightBody: (f) =>
      f.dink === "d"
        ? "Most of your kitchen reps come in games, where a dink that breaks down just costs the point and the rally moves on. A steady dink is built in long, calm rallies, and games rarely give you one."
        : "Most of your kitchen reps come in games, where every rally has a score and pressure to end it. Patience is a decision about which ball to attack, and a game gives you one rushed try at that decision, then moves on.",
    absolution: (f) =>
      f.dink === "d"
        ? "This isn't a discipline flaw. It's a dink that has never had calm, repeated practice."
        : "This isn't a discipline flaw. It's a decision that has never had calm, repeated practice.",
    absolutionClose: "Three weeks of dinking with a rule.",
  },
  {
    id: "dink_patience_random_drilling",
    match: { bottleneck: "dink_patience", rootCause: "random_drilling" },
    verdictClause: SKILL_CLAUSE.dink_patience,
    bottleneckText: DEPTH.dink_patience,
    insightHeadline: (f) =>
      f.dink === "d"
        ? "Your dinking practice has no target."
        : "Practice without a rule doesn't build judgment.",
    // The dink-breaks-down version says how they practice, so it is keyed to
    // the drilling answer like the other random-drilling stories.
    insightBody: (f) => {
      if (f.dink !== "d")
        return "In a warm-up, dinking has no consequence, so any ball can be attacked or left alone. Patience at the kitchen is a decision about which ball to attack, and a decision only sharpens when practice has a rule and a score.";
      const opening =
        f.drilling === "b"
          ? "When you practice, dinking is a warm-up, not a drill with a count."
          : f.drilling === "c"
            ? "When you drill, dinking is one shot among several, picked by feel and never counted."
            : "You said you don't really drill, so dinking never comes with a count.";
      return `${opening} A steady dink is built by counting how long it holds and pushing that number up, and nothing in your practice asks for that.`;
    },
    absolution: (f) =>
      f.dink === "d"
        ? "This isn't a personality trait. It's a count your practice never asked you to keep."
        : "This isn't a personality trait. It's a decision your practice never asked you to make.",
    absolutionClose: "Three weeks of dinking with a rule attached.",
  },
  {
    // Keyed to the dinking answer throughout: "patience cracks" is true of
    // one of the three answers that reach this story.
    id: "dink_patience_well_coached",
    match: { bottleneck: "dink_patience", rootCause: "well_coached" },
    verdictClause: SKILL_CLAUSE.dink_patience,
    bottleneckText: DEPTH.dink_patience,
    insightHeadline: (f) => {
      if (f.dink === "d") return "The dink holds in drills and breaks down when there's a score.";
      if (f.dink === "b") return "You can wait. Choosing the ball to attack is the open part.";
      return "Patience holds in drills and cracks when there's a score.";
    },
    insightBody: (f) => {
      const practice = drillsWithPlan(f) ? "You drill with a plan" : "Your practice has structure";
      if (f.dink === "d")
        return `${practice}, and you said your dink breaks down first in long rallies. With that structure behind it, the pattern points to pressure more than the stroke: a dink that holds in a drill tightens when the rally counts.`;
      if (f.dink === "b")
        return `${practice}, and you said you keep the rally going and wait for them to miss. At 4.0 the rally goes to whoever reads the attackable ball first, and that read only sharpens with a score on it.`;
      return `${practice}, and you said long rallies end with you forcing a speed-up. That's a pressure pattern, not a stroke problem: in a drill the ball you leave feels fine; with a score on it, it starts looking attackable.`;
    },
    absolution: (f) =>
      f.dink === "d"
        ? "This isn't a discipline flaw — it's a soft game that has never been rehearsed with something on the line, and that can be rehearsed."
        : "This isn't a discipline flaw — it's a decision that has never been rehearsed with something on the line, and that can be rehearsed.",
    absolutionClose: "Three weeks of long rallies with a score attached.",
  },
];

/**
 * For the player who rated all four skills at the top. Every gap is zero, the
 * engine lands on the reset (first in scoring order, and the heaviest), and
 * no cause story is true of them: each one explains a gap their answers say
 * isn't there. `diagnose` uses this in place of the matched story.
 */
export const ALL_TOP: StoryCopy = {
  id: "all_top",
  verdictClause:
    "You rated yourself at the top on all four skills, so no gap stands out. The reset matters most for getting to 4.0.",
  bottleneckText: DEPTH.reset,
  insightHeadline: "Your answers don't point to a weak shot.",
  insightBody:
    "You rated yourself at the top on all four skills, so there is no low answer to build a diagnosis on. The plan starts on the reset because it is the shot 4.0 play leans on most.",
  absolution:
    "Nothing in your answers needs fixing, so the plan is about pressure-testing the shot that matters most.",
  absolutionClose: "The re-test in three weeks shows whether it holds.",
};

/**
 * Safety net for a (bottleneck × root cause) pair with no story. Every pair a
 * completed assessment can produce has one, so this is reached only when the
 * root cause comes back `unclear` (the drilling question unanswered) or a
 * skill or cause is added without its story. It claims nothing beyond what
 * the engine established: which skill has the largest weighted gap.
 */
export const FALLBACK: StoryCopy = {
  id: "fallback",
  verdictClause: (f) =>
    `Weighted by how much each skill matters for 4.0, the largest gap in your answers is ${SKILL_LABELS[f.skill]}.`,
  bottleneckText: (f) =>
    `Your answers point to ${SKILL_LABELS[f.skill]} as the skill to work on first.`,
  insightHeadline: "Your answers point to the skill, not the cause.",
  insightBody:
    "They show where the largest gap is. They don't settle why it has stalled, so the plan is built on the skill alone.",
  absolution:
    "This isn't a ceiling. It's one skill with room in it, and that is what the plan works on.",
  absolutionClose: "Start here; the re-test shows what moved.",
};
