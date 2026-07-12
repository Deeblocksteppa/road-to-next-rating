import { SkillId, RootCauseId } from "./types";

export const SKILL_LABELS: Record<SkillId, string> = {
  third_shot_drop: "your third-shot drop",
  reset: "resets from the transition zone",
  net_defense: "your hands at the net",
  dink_patience: "your patience in the soft game",
};

export interface DiagnosisStory {
  id: string;
  match: { bottleneck: SkillId; rootCause: RootCauseId };
  bottleneckVerdict: string; // one-sentence punch line for the reveal (beat 2)
  bottleneckText: string;    // deeper version, used later in the roadmap
  reframeText: string;
  thatsWhyText: string;
}

export const STORIES: DiagnosisStory[] = [
  // 1. reset + open_play_only — the classic
  {
    id: "reset_open_play",
    match: { bottleneck: "reset", rootCause: "open_play_only" },
    bottleneckVerdict:
      "It's the one skill that most separates 3.5 from 4.0 — and right now it's the ceiling on your game.",
    bottleneckText:
      "The reset — staying calm under pressure in the transition zone and neutralizing attacks at the net — is the single most separating skill between 3.5 and 4.0. It's not about hitting a pretty shot. It's about absorbing pace, going soft when your instincts scream 'hit back harder,' and refusing to hand the point away. Players who can reset consistently get to the kitchen, stay there, and run the soft game. Players who can't are permanently pinned in no-man's-land, fighting a battle they can't win.",
    reframeText:
      "You can't build a reliable reset through open play — every point is high-stakes, so your nervous system never gets the low-stakes reps it needs to actually learn the shot. Open play teaches you to survive the moment, not own the skill.",
    thatsWhyText:
      "That's why the reset fails in the moments that count even though you understand what to do — understanding isn't the same as having it in your body. This isn't a talent ceiling; it's a practice structure problem.",
  },

  // 2. reset + well_coached — transfer / pressure gap
  {
    id: "reset_well_coached",
    match: { bottleneck: "reset", rootCause: "well_coached" },
    bottleneckVerdict:
      "The reset is the last thing standing between you and 4.0 — you've built it in practice, but it isn't holding up in games yet.",
    bottleneckText:
      "The reset is the skill that separates 3.5 from 4.0 — absorbing pace in the transition zone, going soft when everything in you wants to hit back hard, and earning your way to the kitchen rather than hoping your opponents miss. It's unglamorous, repetitive, and absolutely decisive. Players who own it control the tempo of nearly every point. Players who haven't cracked it yet are at the mercy of whoever's being aggressive.",
    reframeText:
      "You're doing the work, but there's a transfer gap — the reset holds up in drills where pace is controlled, but breaks down under the chaos of a real game. Under pressure, the body defaults to what's most automatic, and an automated reset isn't there yet.",
    thatsWhyText:
      "That's why you can feel it improving in practice and still watch it collapse when it matters. This isn't a technique problem — it's a transfer problem, and it's completely solvable.",
  },

  // 3. third_shot_drop + open_play_only
  {
    id: "third_shot_open_play",
    match: { bottleneck: "third_shot_drop", rootCause: "open_play_only" },
    bottleneckVerdict:
      "Your third-shot drop is the gate to 4.0 — and right now it isn't reliable enough to walk through.",
    bottleneckText:
      "The third-shot drop is the gateway skill for 3.5-to-4.0. Without a reliable one, you're choosing between driving into a wall or handing the net to your opponents on a silver platter every single serve. It's the shot that converts a defensive position into an offensive one — and at 4.0, everyone expects you to have it. It requires soft hands, a feel for arc and depth, and the nerve to commit to a slow ball when the instinct is to attack.",
    reframeText:
      "The drop is nearly impossible to build through open play — the game moves on whether it was good or not, so you never get the clean feedback your body needs. The shot requires hundreds of isolated reps; games give you maybe 10–15 buried inside 45 minutes of everything else.",
    thatsWhyText:
      "That's why it works sometimes and disappears when you need it — not enough low-stakes practice to make it real. That's a volume problem, and volume is fixable.",
  },

  // 4. dink_patience + well_coached
  {
    id: "dink_patience_well_coached",
    match: { bottleneck: "dink_patience", rootCause: "well_coached" },
    bottleneckVerdict:
      "Patience in the soft game is your ceiling — you have the shots, but the discipline cracks when the point matters.",
    bottleneckText:
      "Patience in the soft game — staying disciplined in a dinking rally, not manufacturing pace when the ball doesn't deserve it — is what separates players who win points at 4.0 from players who donate them. It's not a flashy skill. Nobody clips it for highlights. But at the kitchen, the player who can wait out a long rally and only speed up on a genuinely attackable ball wins a disproportionate number of exchanges. Impatience is the most reliable way to give the point away for free.",
    reframeText:
      "Your mechanics are solid — what breaks down is the internal pressure that builds in a long rally, turning discomfort into urgency and urgency into a bad decision. The ball that felt fine to leave in a drill starts looking attackable when there's a score on the board.",
    thatsWhyText:
      "That's why the patience holds in drills and evaporates in games — you're not undisciplined, you're under-rehearsed under real pressure. That gap closes with the right kind of reps.",
  },

  // 5. net_defense + open_play_only
  {
    id: "net_defense_open_play",
    match: { bottleneck: "net_defense", rootCause: "open_play_only" },
    bottleneckVerdict:
      "Your hands at the net are the gap — and good opponents will find it within a game or two.",
    bottleneckText:
      "Hands at the net — handling a ball that's sped up at your body, hip, or shoulder at close range — is one of the defining skills of the 4.0 level. Speed-ups happen constantly in competitive play, and if you don't have a reliable answer for them, opponents will find that out within a game or two and target you relentlessly. A good hands game lets you neutralize aggression, reset the point, and stay in control. Without it, every speed-up feels like a coin flip.",
    reframeText:
      "Hands at the net are purely reflexive — by the time you consciously decide, the moment is already gone. The only way to build it is repetition at real pace, and open play doesn't give you nearly enough of those reps at the right speed.",
    thatsWhyText:
      "That's why it feels like a reaction problem, like you're just slower than the other person — you're probably not. They've just absorbed thousands more of those specific balls in isolation until the response became automatic.",
  },
];

export const FALLBACK = {
  id: "fallback",
  bottleneckVerdict: "",
  bottleneckText: "",
  reframeText:
    "Your answers point to a gap, but the pattern doesn't fit a single clean story — which usually means more than one thing is holding you back at once. That's common at 3.5–4.0, and it's addressable: start with the bottleneck above, give it four to six weeks, then layer in the next.",
  thatsWhyText: "",
};
