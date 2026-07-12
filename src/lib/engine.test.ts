import { diagnose } from "./engine";
import { AnswerMap } from "./types";

// ─── Scenario A: weak reset + pure open play ────────────────────────────────
// Expected: bottleneck=reset, rootCause=open_play_only → story "reset_open_play"
const scenarioA: AnswerMap = {
  rating: "3.5 DUPR",
  plateau_duration: "c",          // 1–2 years
  play_frequency: "4x a week, 1.5 hours",
  open_play_ratio: "a",           // Almost all open play → open_play_only
  drilling_quality: "a",          // I don't really drill → open_play_only
  partner_access: "d",            // Almost only open play → open_play_only
  net_hold: "d",                  // We mostly play from the back → reset level 0
  third_shot: "b",                // ~half find the kitchen → tsd level 2
  transition_reset: "d",          // Handcuffs me → reset level 0; avg = (0+0)/2 = 0
  net_defense: "b",               // Gets it back but floats → nd level 2
  dink_patience: "b",             // Keep going and wait → dp level 2
  lose_reason: "I get stuck at the baseline and can't get to the net.",
};

// ─── Scenario B: good drops but weak reset/patience + well-coached ───────────
// Expected: bottleneck=reset (importance 1.4 × (3-1) = 2.8), rootCause=well_coached
// third_shot_drop level=3 (gap=0), reset level=1 (gap=2.8), patience level=1 (gap=1.8)
const scenarioB: AnswerMap = {
  rating: "3.7 self-rated",
  plateau_duration: "b",          // 6–12 months
  play_frequency: "5x a week, 2 hours",
  open_play_ratio: "d",           // Mostly drilling → well_coached
  drilling_quality: "d",          // Drill specific weaknesses with a plan → well_coached
  partner_access: "a",            // Reliable partner, play up often → well_coached
  net_hold: "b",                  // Get pushed back a lot → reset level 2
  third_shot: "a",                // 7-10 unattackable → tsd level 3
  transition_reset: "c",          // Pop it up → reset level 1; avg = (2+1)/2 = 1.5
  net_defense: "b",               // Gets back but floats → nd level 2
  dink_patience: "c",             // Force speed-up too early → dp level 1
  lose_reason: "I know what to do but fall apart under pressure in close games.",
};

// ─── Scenario C: near-tie across multiple skills ────────────────────────────
// reset level=1.5 → gap 1.4×1.5=2.1, tsd level=1 → gap 1.2×2=2.4 (tsd wins)
// rootCause=random_drilling
const scenarioC: AnswerMap = {
  rating: "3.5 self-rated",
  plateau_duration: "d",          // 2+ years
  play_frequency: "2x a week, 1 hour",
  open_play_ratio: "c",           // Real mix → unclear (master)
  drilling_quality: "c",          // Drill specific shots but pick randomly → random_drilling
  partner_access: "b",            // Sometimes, not consistently → unclear
  net_hold: "b",                  // Get pushed back → reset level 2
  third_shot: "c",                // 1-3 land → tsd level 1
  transition_reset: "c",          // Pop it up → reset level 1; avg = (2+1)/2 = 1.5
  net_defense: "c",               // Flinch, coin flip → nd level 1
  dink_patience: "c",             // Force speed-up → dp level 1
  lose_reason: "Everything falls apart at once — I can't tell what the main problem is.",
};

const scenarios = [
  { name: "A — weak reset + pure open play", answers: scenarioA },
  { name: "B — good drops but reset/patience gap + well-coached", answers: scenarioB },
  { name: "C — near-tie, random drilling", answers: scenarioC },
];

for (const { name, answers } of scenarios) {
  console.log("\n" + "═".repeat(70));
  console.log(`SCENARIO ${name}`);
  console.log("═".repeat(70));
  const result = diagnose(answers);
  console.log(JSON.stringify(result, null, 2));
}
