import { SkillId } from "./types";

export interface Drill {
  id: string;
  name: string;
  /** Full technique instructions — the guided session's brief screen. */
  description: string;
  /**
   * One plain sentence saying what the drill is, for list cards (Plan tab,
   * plan preview). The technique lives in `description`; this is the line a
   * player scans to decide whether to tap in.
   */
  task: string;
  /** Who or what it needs, as a two- or three-word mono label: "Partner", "Wall", "Solo". */
  setup: string;
  /** One technique cue for the timer screen — the thing to hold in mind while it runs. */
  cue: string;
  /**
   * What gets logged, stated before the timer starts. One protocol for every
   * drill: the last set of ten, so a 15-minute drill with many sets has one
   * unambiguous number at the end.
   */
  logProtocol: string;
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
 * `name` and `duration` are deliberately not overridable: Home, Progress and
 * the reminder email render saved plans by id and show only those two fields,
 * which is correct only while they are the same in both versions.
 */
export type SoloVersion = Pick<Drill, "description" | "task" | "setup"> &
  Partial<Pick<Drill, "cue" | "logProtocol" | "counts" | "practiceTarget" | "logPrompt">>;

export const DRILLS: Record<SkillId, Drill[]> = {
  reset: [
    {
      id: "reset_ladder",
      name: "Reset Ladder",
      description:
        "Partner drives hard balls at your feet from mid-court. Reset each one soft into the kitchen: absorb the pace, don't attack. Count clean resets in a row. At 10, move up a rung — partner hits harder or steps a stride closer — and restart the count. A miss restarts it on the same rung. If the timer ends first, stop there and log your last 10.",
      task: "Reset your partner's drives soft into the kitchen, counting clean ones in a row.",
      setup: "Partner",
      cue: "Paddle out front, soft grip — absorb the pace, don't swing.",
      logProtocol: "Log your last set of 10.",
      counts: "A reset counts if it lands in the kitchen and stays below net height after the bounce.",
      practiceTarget: "7 of 10",
      duration: "15 min",
      logPrompt: "Of your last 10 resets, how many stayed low?",
      requiresPartner: true,
      solo: {
        description: "Drop-feed yourself off the bounce from mid-court and reset into a target zone near the kitchen line. Work in sets of 10 and keep the count. When the timer ends, stop where you are and log how many of your last 10 landed in the zone.",
        task: "Drop-feed yourself from mid-court and reset into a target zone by the kitchen line.",
        setup: "Solo",
        counts: "A reset counts if it lands in your target zone by the kitchen line and stays below net height.",
        logPrompt: "Of your last 10 resets, how many landed in the zone?",
      },
    },
    {
      id: "reset_wall",
      name: "Wall Reset",
      description:
        "Stand 7–8 feet from a wall. Drive the ball into the wall and reset your own return softly. Builds the soft-hands reflex under self-generated pace.",
      task: "Drive into a wall and reset your own return softly, over and over.",
      setup: "Wall",
      cue: "Let the ball come to you — block, don't hit.",
      logProtocol: "Log your last set of 10.",
      counts: "A reset counts if your return lands soft enough that it would drop into the kitchen — knee height or lower off the wall.",
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
        "From the baseline, drop-feed yourself and hit third-shot drops into the kitchen. Work in sets of 10 and keep the count out loud. The number is the feedback.",
      task: "Self-feed third-shot drops from the baseline and count how many land soft.",
      setup: "Solo",
      cue: "Contact low and out front, lift gently — arc, not power.",
      logProtocol: "Log your last set of 10.",
      counts: "A drop counts if it lands in the kitchen and bounces below net height, so it could not be attacked.",
      practiceTarget: "7 of 10",
      duration: "15 min",
      logPrompt: "Out of 10 drops, how many landed clean?",
      requiresPartner: false,
    },
    {
      id: "drop_live",
      name: "Live Drop Practice",
      description:
        "Partner serves, you return, they return deep — you go for the drop. Real game pressure, real feedback. Commit to the drop even when it fails.",
      task: "Serve, return, then go for the drop under real game pressure.",
      setup: "Partner",
      cue: "Commit to the drop every time, even the ugly ones.",
      logProtocol: "Log your last set of 10.",
      counts: "A drop counts if it lands in the kitchen and your partner cannot attack it from above the net.",
      practiceTarget: "6 of 10",
      duration: "15 min",
      logPrompt: "Out of 10 drops, how many landed clean?",
      requiresPartner: true,
      solo: {
        description: "Self-feed from the baseline: toss the ball, let it bounce, hit the drop. Focus on contact point — slightly low, slightly out front, gentle lift.",
        task: "Toss, bounce, and hit the drop from the baseline, working on the contact point.",
        setup: "Solo",
        counts: "A drop counts if it lands in the kitchen and bounces below net height, so it could not be attacked.",
      },
    },
  ],
  net_defense: [
    {
      id: "speedup_defense",
      name: "Speed-Up Defense Drill",
      description:
        "Stand at the kitchen. Partner speeds up at your body and hip repeatedly. Block or counter — don't back up. Goal: stay in the point, not win it. 3 sets of 15.",
      task: "Block your partner's speed-ups at the kitchen without backing up.",
      setup: "Partner",
      cue: "Paddle up and in front, block first — offense second.",
      logProtocol: "Log your last set of 10.",
      counts: "A block counts if the ball goes back over the net and the point continues.",
      practiceTarget: "7 of 10",
      duration: "15 min",
      logPrompt: "Out of 10 speed-ups, how many did you block back?",
      requiresPartner: true,
      solo: {
        description: "Wall drill: stand close to the wall, drive medium-pace balls and block your own returns. Builds the reflex of soft hands on fast balls.",
        task: "Drive medium-pace balls into a wall up close and block your own returns.",
        setup: "Wall",
        counts: "A block counts if the ball comes back off the wall under control and you can play the next one.",
        logPrompt: "Of your last 10 blocks, how many stayed under control?",
      },
    },
    {
      id: "hands_battle",
      name: "Hands Battle",
      description:
        "Both players at the kitchen, speed up freely. First to pop it up loses the point. Purely for reaction and reset reflex. Keep score.",
      task: "Both at the kitchen, speed up freely — first to pop it up loses.",
      setup: "Partner",
      cue: "Short strokes, stay compact — the first pop-up loses.",
      logProtocol: "Log your last 10 exchanges.",
      counts: "An exchange is won if your opponent pops it up or misses first.",
      practiceTarget: "6 of 10",
      duration: "10 min",
      logPrompt: "Out of 10 exchanges, how many did you win?",
      requiresPartner: true,
      solo: {
        description: "Wall volley: stand 5 feet from the wall, volley continuously keeping the ball controlled. Decrease distance as you improve.",
        task: "Volley continuously against a wall from five feet, moving closer as it holds.",
        setup: "Wall",
        cue: "Short strokes, stay compact — keep it under control.",
        logProtocol: "Log your last 10 volleys.",
        counts: "A volley counts if you keep it going under control, with no mishit or pop-up.",
        practiceTarget: "7 of 10",
        logPrompt: "Of your last 10 volleys, how many stayed under control?",
      },
    },
  ],
  dink_patience: [
    {
      id: "dink_50",
      name: "50-Dink Rally",
      description:
        "Both players commit to reaching 50 dinks in a row without attacking. No speed-ups allowed. Purely builds patience and consistency. Count out loud.",
      task: "Reach 50 dinks in a row with your partner, no speed-ups allowed.",
      setup: "Partner",
      cue: "Contact out front, soft wrist — every ball lands in the kitchen.",
      logProtocol: "Log your last 10 rallies.",
      counts: "A rally counts as patient if it ends on their error or reaches the target without you speeding up.",
      practiceTarget: "8 of 10",
      duration: "10 min",
      logPrompt: "Out of 10 rallies, how many did you keep patient?",
      requiresPartner: true,
      solo: {
        description: "Wall dinking: stand at kitchen distance from a wall, dink continuously keeping the ball at net height. Count to 30 before resetting.",
        task: "Dink against a wall at kitchen distance, counting to 30 before resetting.",
        setup: "Wall",
        cue: "Soft wrist, contact out front — keep it at net height.",
        logProtocol: "Log your last 10 dinks.",
        counts: "A dink counts if it comes back off the wall around net height and you keep the rally going.",
        logPrompt: "Of your last 10 dinks, how many stayed at net height?",
      },
    },
    {
      id: "attack_gate",
      name: "Attack Gate Drill",
      description:
        "Dink rally, but you can only speed up if the ball is above net height AND out in front. Any other ball must be reset. Trains the decision, not just the shot.",
      task: "Dink rally where you may only speed up on a ball above the net and out front.",
      setup: "Partner",
      cue: "Only above the net AND out in front — everything else resets.",
      logProtocol: "Log your last 10 attackable balls.",
      counts: "A read counts if you attacked a ball above the net and out front, or reset one that wasn't.",
      practiceTarget: "8 of 10",
      duration: "15 min",
      logPrompt: "Out of 10 attackable balls, how many did you read right?",
      requiresPartner: true,
      solo: {
        description: "Shadow drill: stand at the kitchen, feed yourself imaginary balls, practice the decision out loud — 'attackable' or 'reset' — before swinging.",
        task: "Shadow the decision at the kitchen: call each imagined ball attackable or reset, out loud.",
        setup: "Solo",
        logProtocol: "Log your last 10 calls.",
        counts: "A call counts if it follows the rule: above the net and out front is attackable, anything else is a reset.",
        logPrompt: "Of your last 10 calls, how many matched the rule?",
      },
    },
  ],
};
