import { SkillId } from "./types";

/**
 * What a player is in the middle of when the timer ends: the word the scoring
 * rule uses ("finish the rally you're on"). Not always what gets logged: a
 * wall rally is finished, and its last ten volleys are what is counted.
 */
export type DrillUnit = "set" | "rep" | "exchange" | "rally";

/** The one scoring rule, on the drill page and the timer, in the drill's own word. */
export function scoringRule(unit: DrillUnit): string {
  return `When the timer ends, finish the ${unit} you're on and log it.`;
}

export interface Drill {
  id: string;
  name: string;
  /** Full technique instructions: behind "View instructions" on the timer. */
  description: string;
  /**
   * One plain sentence saying what the drill is: the drill page's sentence
   * (the guided session's first screen, and what a plan row opens). The
   * technique lives in `description`.
   */
  task: string;
  /** Who or what it needs, as a two- or three-word mono label: "Partner", "Wall", "Solo". */
  setup: string;
  /** One technique cue for the timer screen — the thing to hold in mind while it runs. */
  cue: string;
  /**
   * What gets logged, as the drill page's LOG row reads it ("Your last set of
   * 10 drops"): always the last ten of something, so a 15-minute drill has
   * one unambiguous number at the end. No verb and no full stop; the row's
   * label says "Log".
   */
  logProtocol: string;
  /** The scoring rule's word for this drill (`scoringRule`). */
  unit: DrillUnit;
  /** What counts as a success, observable without a coach — the definition behind `logPrompt`. */
  counts: string;
  /** "7 of 10" — the practice target for this drill. Distinct from the plan's match re-test target. */
  practiceTarget: string;
  duration: string;
  /**
   * The single question the guided session asks when logging a result, phrased
   * as the drill's own re-test metric. Always answerable on a 0–10 scale — the
   * log screen offers exactly those options.
   */
  logPrompt: string;
  requiresPartner: boolean;
  /**
   * The version prescribed to a player with no drilling partner. Complete, not
   * just new instructions: a wall-volley "Hands Battle" can't be logged as
   * "exchanges won", so every field that assumes a partner is overridden here.
   * Anything not listed carries over. See `prescribeDrill` in `roadmap.ts`.
   */
  solo?: SoloVersion;
}

/**
 * A solo version can be a different exercise from the partner drill, so it
 * can carry its own `name`, `cue` and log question (`logPrompt`) along with
 * everything else that assumes a partner. Whatever it leaves out is inherited,
 * which is only right when the partner wording is still true alone: "absorb
 * the pace" was being shown over a self-tossed ball.
 *
 * Because the name can differ, every surface that names a drill has to show
 * the prescribed version (`prescribeDrill`), including the ones that read
 * saved plans by id: Home, Plan, Progress and the reminder email.
 *
 * `duration` is deliberately not overridable. A session's length is promised
 * before the plan is built and is summed by id when counting sessions, so it
 * has to be the same in both versions.
 */
export type SoloVersion = Pick<Drill, "description" | "task" | "setup"> &
  Partial<
    Pick<Drill, "name" | "cue" | "logProtocol" | "unit" | "counts" | "practiceTarget" | "logPrompt">
  >;

export const DRILLS: Record<SkillId, Drill[]> = {
  reset: [
    {
      id: "reset_ladder",
      name: "Reset Ladder",
      description:
        "Your partner drives hard balls at your feet from mid-court. Reset each one softly into the kitchen. After 10 clean in a row, they hit harder or step closer; a miss restarts the count.",
      task: "Reset your partner's drives soft into the kitchen, counting clean ones in a row.",
      setup: "Partner",
      cue: "Paddle out front, soft grip. Absorb the pace, don't swing.",
      logProtocol: "Your last set of 10 resets",
      unit: "set",
      counts: "A reset counts if it lands in the kitchen and stays below net height after the bounce.",
      practiceTarget: "7 of 10",
      duration: "15 min",
      logPrompt: "Of your last 10 resets, how many stayed low?",
      requiresPartner: true,
      // The ladder here is distance: each rung is a stride further from the
      // kitchen, which is what makes a self-tossed reset harder.
      solo: {
        description: "Start at the kitchen line. Toss, let it bounce, and reset it softly into the kitchen. Land 7 of 10, then step back a stride and go again.",
        task: "Toss the ball up at yourself and reset it into the kitchen, stepping back a stride after every 7 of 10.",
        setup: "Solo",
        cue: "Soft grip, open face. Lift it, don't swing.",
        counts: "A reset counts if it lands in the kitchen.",
        logPrompt: "Of your last 10 resets, how many landed in the kitchen?",
      },
    },
    {
      id: "reset_wall",
      name: "Wall Reset",
      description:
        "Stand 7–8 feet from a wall. Drive the ball into it, then reset the return softly.",
      task: "Drive into a wall and reset your own return softly, over and over.",
      setup: "Wall",
      cue: "Let the ball come to you. Block, don't hit.",
      logProtocol: "Your last set of 10 resets",
      unit: "set",
      counts: "A reset counts if it comes back off the wall at knee height or lower.",
      practiceTarget: "7 of 10",
      duration: "10 min",
      logPrompt: "Of your last 10 resets, how many stayed low?",
      requiresPartner: false,
    },
  ],
  third_shot_drop: [
    {
      id: "drop_basket",
      name: "Basket Drop Drill",
      description:
        "From the baseline, drop-feed yourself and hit third-shot drops into the kitchen. Count each set of 10 out loud.",
      task: "Self-feed third-shot drops from the baseline and count how many land soft.",
      setup: "Solo",
      cue: "Contact low and out front, lift gently. Arc, not power.",
      logProtocol: "Your last set of 10 drops",
      unit: "set",
      counts: "A drop counts if it lands in the kitchen and bounces below net height.",
      practiceTarget: "7 of 10",
      duration: "15 min",
      logPrompt: "Out of 10 drops, how many landed clean?",
      requiresPartner: false,
    },
    {
      id: "drop_live",
      name: "Live Drop Practice",
      description:
        "Your partner serves, you return, and they hit a deep ball back. Hit the drop off it.",
      task: "Serve, return, then go for the drop under real game pressure.",
      setup: "Partner",
      cue: "Commit to the drop every time, even the ugly ones.",
      logProtocol: "Your last set of 10 drops",
      unit: "set",
      counts: "A drop counts if it lands in the kitchen and your partner can't attack it.",
      practiceTarget: "6 of 10",
      duration: "15 min",
      logPrompt: "Out of 10 drops, how many landed clean?",
      requiresPartner: true,
      // Not a second self-fed drop: Basket Drop Drill already is that. This
      // one trains what the live drill is for, getting to the net behind it.
      solo: {
        name: "Drop and Follow",
        description: "From the baseline, toss the ball so it bounces deep, like a return. Hit the drop, then move in and split-step before it lands.",
        task: "Toss a deep ball, hit the drop, then move in and split-step before it lands.",
        setup: "Solo",
        cue: "Hit, then go. Split-step before it lands.",
        logProtocol: "Your last 10 reps",
        unit: "rep",
        counts: "A rep counts if the drop lands in the kitchen and you're set before it bounces.",
        logPrompt: "Out of 10, how many drops landed in the kitchen with you set in time?",
      },
    },
  ],
  net_defense: [
    {
      id: "speedup_defense",
      name: "Speed-Up Defense Drill",
      description:
        "At the kitchen, your partner speeds up at your body and hip. Block or counter without backing up; the goal is to stay in the point. Do 3 sets of 15.",
      task: "Block your partner's speed-ups at the kitchen without backing up.",
      setup: "Partner",
      cue: "Paddle up and in front. Block first, offense second.",
      logProtocol: "The last 10 balls of your final set",
      unit: "set",
      counts: "A ball counts if it goes back over the net and the point continues.",
      practiceTarget: "7 of 10",
      duration: "15 min",
      logPrompt: "Of the last 10 balls in your final set, how many did you keep in play?",
      requiresPartner: true,
      // The two solo hands drills share a wall and nothing else: this one
      // takes pace off a single ball, Wall Counters keeps pace on.
      solo: {
        description: "Stand 6–7 feet from a wall. Hit firm into it, then block the return soft so it drops low.",
        task: "Hit firm into a wall from 6–7 feet and block the return soft so it drops low.",
        setup: "Wall",
        cue: "Absorb it. Soft grip, let it die.",
        logProtocol: "Your last set of 10 blocks",
        counts: "A block counts if it comes back off the wall low and soft.",
        logPrompt: "Of your last 10 blocks, how many came back low and soft?",
      },
    },
    {
      id: "hands_battle",
      name: "Hands Battle",
      description:
        "Both players at the kitchen, speeding up freely. The first to pop it up loses the point.",
      task: "Both at the kitchen, speed up freely. First to pop it up loses.",
      setup: "Partner",
      cue: "Short strokes, stay compact. The first pop-up loses.",
      logProtocol: "Your last 10 exchanges",
      unit: "exchange",
      counts: "An exchange is won if your opponent pops it up or misses first.",
      practiceTarget: "6 of 10",
      duration: "10 min",
      logPrompt: "Out of 10 exchanges, how many did you win?",
      requiresPartner: true,
      solo: {
        name: "Wall Counters",
        description: "Stand 4–5 feet from a wall. Keep firm volleys going without letting the ball bounce, alternating forehand and backhand every ball.",
        task: "Volley firm against a wall from 4–5 feet, alternating forehand and backhand every ball.",
        setup: "Wall",
        cue: "Short strokes. Forehand, backhand, repeat.",
        logProtocol: "Your last 10 volleys",
        unit: "rally",
        counts: "A volley counts if it's on the right side and under control, with no mishit or pop-up.",
        practiceTarget: "7 of 10",
        logPrompt: "Of 10 alternating volleys, how many stayed controlled?",
      },
    },
  ],
  dink_patience: [
    {
      id: "dink_50",
      name: "50-Dink Rally",
      description:
        "Dink with your partner, counting out loud, and aim for 50 in a row. No speed-ups.",
      task: "Reach 50 dinks in a row with your partner, no speed-ups allowed.",
      setup: "Partner",
      cue: "Contact out front, soft wrist. Every ball lands in the kitchen.",
      logProtocol: "Your last 10 rallies",
      unit: "rally",
      counts: "A rally counts as patient if it ends on their error or reaches the target without you speeding up.",
      practiceTarget: "8 of 10",
      duration: "10 min",
      logPrompt: "Out of 10 rallies, how many did you keep patient?",
      requiresPartner: true,
      solo: {
        name: "Wall Dinking",
        description: "Stand at kitchen distance from a wall and dink, keeping it around net height. Count out loud and aim for 30 in a row; a miss starts you at 1.",
        task: "Dink against a wall at kitchen distance, counting out loud to 30 in a row.",
        setup: "Wall",
        cue: "Soft wrist, contact out front. Keep it at net height.",
        logProtocol: "Your last 10 dinks",
        counts: "A dink counts if it comes back around net height and you keep the rally going.",
        logPrompt: "Of your last 10 dinks, how many stayed at net height?",
      },
    },
    {
      id: "attack_gate",
      name: "Attack Gate Drill",
      description:
        "Dink with your partner. Speed up only on a ball above net height and out in front; reset everything else.",
      task: "Dink rally where you may only speed up on a ball above the net and out front.",
      setup: "Partner",
      cue: "Only above the net AND out in front. Everything else resets.",
      logProtocol: "Your last 10 attackable balls",
      unit: "rally",
      counts: "A read counts if you attacked a ball above the net and out front, or reset one that wasn't.",
      practiceTarget: "8 of 10",
      duration: "15 min",
      logPrompt: "Out of 10 attackable balls, how many did you read right?",
      requiresPartner: true,
      // A real ball and a line on the wall, so the logged number is a
      // result. The shadow version it replaced had the player imagine each
      // ball and then grade their own call on it.
      solo: {
        description: "Put tape on the wall at net height, about 35 inches, and dink against it. Hit firm only when the ball comes back above the tape and out in front.",
        task: "Dink against a wall with tape at net height, hitting firm only on a ball above the tape and out front.",
        setup: "Wall",
        cue: "Only above the tape AND out in front. Everything else is a dink.",
        logProtocol: "Your last 10 balls",
        counts: "A ball counts if you played it by the rule: firm above the tape and out front, a dink otherwise.",
        logPrompt: "Of 10 balls, how many did you play by the rule?",
      },
    },
  ],
};

/**
 * Who a drill needs, from the prescribed version's `setup`. Not from
 * `requiresPartner`: a solo version is spread over the partner drill and keeps
 * that flag, so it says "partner" about a drill done alone.
 */
export function isSoloSetup(setup: string): boolean {
  return setup !== "Partner";
}

/** The mono reading beside a drill's time on plan and Home rows: "PARTNER", "SOLO", "SOLO · WALL". */
export function setupRowLabel(setup: string): string {
  if (!isSoloSetup(setup)) return "PARTNER";
  return setup === "Wall" ? "SOLO · WALL" : "SOLO";
}

/** The drill page's WHO value: "Partner", "Solo", "Solo, at a wall". */
export function setupWho(setup: string): string {
  if (!isSoloSetup(setup)) return "Partner";
  return setup === "Wall" ? "Solo, at a wall" : "Solo";
}
