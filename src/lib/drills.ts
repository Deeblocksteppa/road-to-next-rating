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
  duration: string;
  /**
   * The single question the guided session asks when logging a result, phrased
   * as the drill's own re-test metric. Always answerable on a 0–10 scale — the
   * log screen offers exactly those options.
   */
  logPrompt: string;
  requiresPartner: boolean;
  soloVariant?: string;
  /** One-sentence `task` for the solo variant, so a no-partner plan's cards stay one line. */
  soloTask?: string;
}

export const DRILLS: Record<SkillId, Drill[]> = {
  reset: [
    {
      id: "reset_ladder",
      name: "Reset Ladder",
      description:
        "Partner drives hard balls at your feet from mid-court. Reset each one soft into the kitchen: absorb the pace, don't attack. Count clean resets in a row. At 10, move up a rung — partner hits harder or steps a stride closer — and restart the count. A miss restarts it on the same rung. If the timer ends first, stop there and log your last 10.",
      task: "Reset your partner's drives soft into the kitchen, counting clean ones in a row.",
      setup: "Partner",
      duration: "15 min",
      logPrompt: "Of your last 10 resets, how many stayed low?",
      requiresPartner: true,
      soloVariant:
        "Drop-feed yourself off the bounce from mid-court and reset into a target zone near the kitchen line. Work in sets of 10 and keep the count. When the timer ends, stop where you are and log how many of your last 10 landed in the zone.",
      soloTask: "Drop-feed yourself from mid-court and reset into a target zone by the kitchen line.",
    },
    {
      id: "reset_wall",
      name: "Wall Reset",
      description:
        "Stand 7–8 feet from a wall. Drive the ball into the wall and reset your own return softly. Builds the soft-hands reflex under self-generated pace.",
      task: "Drive into a wall and reset your own return softly, over and over.",
      setup: "Wall",
      duration: "10 min",
      logPrompt: "Of your last 10 resets, how many stayed low?",
      requiresPartner: false,
      soloVariant: "This drill is already solo.",
    },
  ],
  third_shot_drop: [
    {
      id: "drop_basket",
      name: "Basket Drop Drill",
      description:
        "From the baseline, drop-feed yourself and hit third-shot drops into the kitchen. Goal: 7 of 10 land soft and unattackable. Track your count — the number is the feedback.",
      task: "Self-feed third-shot drops from the baseline and count how many land soft.",
      setup: "Solo",
      duration: "15 min",
      logPrompt: "Out of 10 drops, how many landed clean?",
      requiresPartner: false,
      soloVariant: "This drill is already solo.",
    },
    {
      id: "drop_live",
      name: "Live Drop Practice",
      description:
        "Partner serves, you return, they return deep — you go for the drop. Real game pressure, real feedback. Commit to the drop even when it fails.",
      task: "Serve, return, then go for the drop under real game pressure.",
      setup: "Partner",
      duration: "15 min",
      logPrompt: "Out of 10 drops, how many landed clean?",
      requiresPartner: true,
      soloVariant:
        "Self-feed from the baseline: toss the ball, let it bounce, hit the drop. Focus on contact point — slightly low, slightly out front, gentle lift.",
      soloTask: "Toss, bounce, and hit the drop from the baseline, working on the contact point.",
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
      duration: "15 min",
      logPrompt: "Out of 10 speed-ups, how many did you block back?",
      requiresPartner: true,
      soloVariant:
        "Wall drill: stand close to the wall, drive medium-pace balls and block your own returns. Builds the reflex of soft hands on fast balls.",
      soloTask: "Drive medium-pace balls into a wall up close and block your own returns.",
    },
    {
      id: "hands_battle",
      name: "Hands Battle",
      description:
        "Both players at the kitchen, speed up freely. First to pop it up loses the point. Purely for reaction and reset reflex. Keep score.",
      task: "Both at the kitchen, speed up freely — first to pop it up loses.",
      setup: "Partner",
      duration: "10 min",
      logPrompt: "Out of 10 exchanges, how many did you win?",
      requiresPartner: true,
      soloVariant:
        "Wall volley: stand 5 feet from the wall, volley continuously keeping the ball controlled. Decrease distance as you improve.",
      soloTask: "Volley continuously against a wall from five feet, moving closer as it holds.",
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
      duration: "10 min",
      logPrompt: "Out of 10 rallies, how many did you keep patient?",
      requiresPartner: true,
      soloVariant:
        "Wall dinking: stand at kitchen distance from a wall, dink continuously keeping the ball at net height. Count to 30 before resetting.",
      soloTask: "Dink against a wall at kitchen distance, counting to 30 before resetting.",
    },
    {
      id: "attack_gate",
      name: "Attack Gate Drill",
      description:
        "Dink rally, but you can only speed up if the ball is above net height AND out in front. Any other ball must be reset. Trains the decision, not just the shot.",
      task: "Dink rally where you may only speed up on a ball above the net and out front.",
      setup: "Partner",
      duration: "15 min",
      logPrompt: "Out of 10 attackable balls, how many did you read right?",
      requiresPartner: true,
      soloVariant:
        "Shadow drill: stand at the kitchen, feed yourself imaginary balls, practice the decision out loud — 'attackable' or 'reset' — before swinging.",
      soloTask: "Shadow the decision at the kitchen: call each imagined ball attackable or reset, out loud.",
    },
  ],
};
