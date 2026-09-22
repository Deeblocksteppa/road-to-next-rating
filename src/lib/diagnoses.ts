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
 */
export interface DiagnosisStory {
  id: string;
  match: { bottleneck: SkillId; rootCause: RootCauseId };
  bottleneckVerdict: string; // reveal beat 2 — why this shot, from their answers
  bottleneckText: string;    // deeper version, used later in the roadmap
  insightHeadline: string;   // reveal beat 3 — the practice problem, in one line
  insightBody: string;       // reveal beat 3 — how their training produced it
  absolution: string;        // reveal beat 4 — one sentence, problem → trainable action
  absolutionClose: string;   // reveal beat 4 close — a few words naming the plan
}

export const STORIES: DiagnosisStory[] = [
  // 1. reset + open_play_only — the classic
  {
    id: "reset_open_play",
    match: { bottleneck: "reset", rootCause: "open_play_only" },
    bottleneckVerdict:
      "Based on your answers, this is the best place to start. The reset separates 3.5 from 4.0 more than any other shot, and it's where you rated yourself lowest.",
    bottleneckText:
      "The reset — staying calm under pressure in the transition zone and neutralizing attacks at the net — is the single most separating skill between 3.5 and 4.0. It's not about hitting a pretty shot. It's about absorbing pace, going soft when your instincts scream 'hit back harder,' and refusing to hand the point away. Players who can reset consistently get to the kitchen, stay there, and run the soft game. Players who can't are pinned in no-man's-land, fighting a battle they can't win.",
    insightHeadline: "Games don't teach the reset.",
    insightBody:
      "Almost all of your court time is open play. Every point there is live, so a reset gets one rushed attempt and no second try — the shot never gets the calm, repeated reps it needs to form.",
    absolution:
      "This isn't a ceiling on your game — it's a shot that never got its reps, and reps are something you can schedule.",
    absolutionClose: "Three weeks of low-stakes resets is the plan.",
  },

  // 2. reset + well_coached — transfer / pressure gap
  {
    id: "reset_well_coached",
    match: { bottleneck: "reset", rootCause: "well_coached" },
    bottleneckVerdict:
      "Based on your answers, this is the best place to start. You drill with structure, but the reset is still where you said your points break down.",
    bottleneckText:
      "The reset is the skill that separates 3.5 from 4.0 — absorbing pace in the transition zone, going soft when everything in you wants to hit back hard, and earning your way to the kitchen rather than hoping your opponents miss. It's unglamorous, repetitive, and absolutely decisive. Players who own it control the tempo of nearly every point. Players who haven't cracked it yet are at the mercy of whoever's being aggressive.",
    insightHeadline: "The reset holds in practice and slips in games.",
    insightBody:
      "You said you drill with a plan, and that the reset still fails mid-court when the ball comes fast. That pattern points to a transfer gap: the shot exists at drill pace, not yet at game pace.",
    absolution:
      "This isn't a technique problem to start over on — it's a shot that needs rehearsing under game chaos, and chaos can be rehearsed.",
    absolutionClose: "Three weeks of resets at real pace is the plan.",
  },

  // 3. third_shot_drop + open_play_only
  {
    id: "third_shot_open_play",
    match: { bottleneck: "third_shot_drop", rootCause: "open_play_only" },
    bottleneckVerdict:
      "Based on your answers, this is the best place to start. The drop is the shot that gets you to the kitchen, and it's the one you rated least reliable.",
    bottleneckText:
      "The third-shot drop is the gateway skill for 3.5-to-4.0. Without a reliable one, you're choosing between driving into a wall or handing the net to your opponents on a silver platter every single serve. It's the shot that converts a defensive position into an offensive one — and at 4.0, everyone expects you to have it. It requires soft hands, a feel for arc and depth, and the nerve to commit to a slow ball when the instinct is to attack.",
    insightHeadline: "Games give the drop almost no clean reps.",
    insightBody:
      "Most of your court time is open play. A game moves on whether a drop was good or bad, so there's no feedback and maybe a dozen attempts an hour — far too few for a touch shot to settle.",
    absolution:
      "This isn't a ceiling — it's a shot that has never had measured reps, and measured reps are the whole plan.",
    absolutionClose: "Count the drops, and the drop shows up.",
  },

  // 4. dink_patience + well_coached
  {
    id: "dink_patience_well_coached",
    match: { bottleneck: "dink_patience", rootCause: "well_coached" },
    bottleneckVerdict:
      "Based on your answers, this is the best place to start. You have the shots; you said the long rallies end when patience runs out first.",
    bottleneckText:
      "Patience in the soft game — staying disciplined in a dinking rally, not manufacturing pace when the ball doesn't deserve it — is what separates players who win points at 4.0 from players who donate them. It's not a flashy skill. Nobody clips it for highlights. But at the kitchen, the player who can wait out a long rally and only speed up on a genuinely attackable ball wins a disproportionate number of exchanges. Impatience is the most reliable way to give the point away for free.",
    insightHeadline: "Patience holds in drills and cracks when there's a score.",
    insightBody:
      "You drill with a plan, and you said long rallies end with you forcing a speed-up. That's a pressure pattern, not a stroke problem: in a drill the ball you leave feels fine; with a score on it, it starts looking attackable.",
    absolution:
      "This isn't a discipline flaw — it's a decision that has never been rehearsed with something on the line, and that can be rehearsed.",
    absolutionClose: "Three weeks of long rallies with a score attached.",
  },

  // 5. net_defense + open_play_only
  {
    id: "net_defense_open_play",
    match: { bottleneck: "net_defense", rootCause: "open_play_only" },
    bottleneckVerdict:
      "Based on your answers, this is the best place to start. Speed-ups at your body are where you rated yourself weakest, and 4.0 opponents will find that.",
    bottleneckText:
      "Hands at the net — handling a ball that's sped up at your body, hip, or shoulder at close range — is one of the defining skills of the 4.0 level. Speed-ups happen constantly in competitive play, and if you don't have a reliable answer for them, opponents will find that out within a game or two and target you relentlessly. A good hands game lets you neutralize aggression, reset the point, and stay in control. Without it, every speed-up feels like a coin flip.",
    insightHeadline: "It feels like slow hands. It's fewer reps.",
    insightBody:
      "Hands at the net are reflex, and a reflex only builds from seeing the same ball many times at real pace. Open play hands you a few speed-ups an hour, spread among everything else.",
    absolution:
      "This isn't about reflexes you weren't born with — it's a ball you've seen too rarely, and you can see it on purpose.",
    absolutionClose: "Three weeks of speed-ups in isolation.",
  },
];

/**
 * Used when no story matches the (bottleneck × root cause) pair. The verdict
 * fields are empty on purpose: `diagnose` builds those from the skill label.
 */
export const FALLBACK = {
  id: "fallback",
  bottleneckVerdict: "",
  bottleneckText: "",
  insightHeadline: "Your answers don't fit one clean pattern.",
  insightBody:
    "More than one thing is pulling at once, which is common at 3.5–4.0. The skill above is where you rated yourself lowest, so it's where a plan pays off first.",
  absolution:
    "This isn't a ceiling — it's a few small gaps, and the way through is one at a time.",
  absolutionClose: "Start with this one; the next comes after the re-test.",
};
