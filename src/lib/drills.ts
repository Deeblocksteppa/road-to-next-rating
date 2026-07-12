import { SkillId } from "./types";

export interface Drill {
  id: string;
  name: string;
  description: string;
  duration: string;
  requiresPartner: boolean;
  soloVariant?: string;
}

export const DRILLS: Record<SkillId, Drill[]> = {
  reset: [
    {
      id: "reset_ladder",
      name: "Reset Ladder",
      description:
        "Partner drives hard balls at your feet from mid-court. Your only job: reset soft into the kitchen. Do 10 in a row before advancing. Focus on absorbing pace, not attacking.",
      duration: "15 min",
      requiresPartner: true,
      soloVariant:
        "Drop-feed yourself off the bounce from mid-court and reset into a target zone near the kitchen line. 3 sets of 10.",
    },
    {
      id: "reset_wall",
      name: "Wall Reset",
      description:
        "Stand 7–8 feet from a wall. Drive the ball into the wall and reset your own return softly. Builds the soft-hands reflex under self-generated pace.",
      duration: "10 min",
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
      duration: "15 min",
      requiresPartner: false,
      soloVariant: "This drill is already solo.",
    },
    {
      id: "drop_live",
      name: "Live Drop Practice",
      description:
        "Partner serves, you return, they return deep — you go for the drop. Real game pressure, real feedback. Commit to the drop even when it fails.",
      duration: "15 min",
      requiresPartner: true,
      soloVariant:
        "Self-feed from the baseline: toss the ball, let it bounce, hit the drop. Focus on contact point — slightly low, slightly out front, gentle lift.",
    },
  ],
  net_defense: [
    {
      id: "speedup_defense",
      name: "Speed-Up Defense Drill",
      description:
        "Stand at the kitchen. Partner speeds up at your body and hip repeatedly. Block or counter — don't back up. Goal: stay in the point, not win it. 3 sets of 15.",
      duration: "15 min",
      requiresPartner: true,
      soloVariant:
        "Wall drill: stand close to the wall, drive medium-pace balls and block your own returns. Builds the reflex of soft hands on fast balls.",
    },
    {
      id: "hands_battle",
      name: "Hands Battle",
      description:
        "Both players at the kitchen, speed up freely. First to pop it up loses the point. Purely for reaction and reset reflex. Keep score.",
      duration: "10 min",
      requiresPartner: true,
      soloVariant:
        "Wall volley: stand 5 feet from the wall, volley continuously keeping the ball controlled. Decrease distance as you improve.",
    },
  ],
  dink_patience: [
    {
      id: "dink_50",
      name: "50-Dink Rally",
      description:
        "Both players commit to reaching 50 dinks in a row without attacking. No speed-ups allowed. Purely builds patience and consistency. Count out loud.",
      duration: "10 min",
      requiresPartner: true,
      soloVariant:
        "Wall dinking: stand at kitchen distance from a wall, dink continuously keeping the ball at net height. Count to 30 before resetting.",
    },
    {
      id: "attack_gate",
      name: "Attack Gate Drill",
      description:
        "Dink rally, but you can only speed up if the ball is above net height AND out in front. Any other ball must be reset. Trains the decision, not just the shot.",
      duration: "15 min",
      requiresPartner: true,
      soloVariant:
        "Shadow drill: stand at the kitchen, feed yourself imaginary balls, practice the decision out loud — 'attackable' or 'reset' — before swinging.",
    },
  ],
};
