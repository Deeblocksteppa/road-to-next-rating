# Content audit: diagnoses and drills

Read-only audit at commit `d68ea83`, 2026-10-11. No code was changed.
Sources: `src/lib/engine.ts`, `questions.ts`, `diagnoses.ts`, `rating.ts`, `roadmap.ts`, `drills.ts`, and `src/components/diagnosis/Reveal.tsx`.

## Summary

1. **The engine can produce 12 skill × root cause combinations. Five have an authored story; seven show the fallback** ("Your answers don't fit one clean pattern"). Those seven cover about 39% of all possible answer combinations, or about 22% if answers skew the way a typical stuck 3.5 would answer.
2. **Every `random_drilling` result is a fallback.** No story is authored for that cause on any skill.
3. **The fallback is never triggered by mixed answers.** It is shown only because no story exists for the pair. The `unclear` root cause cannot be produced by a completed assessment, so the four `unclear` combinations are dead.
4. **Several story lines say "you said…" about answers the player may not have given** (section 1.4). The largest: 53% of the answer combinations that reach the dink-patience story did not say they force a speed-up.
5. **Two of the four solo sessions repeat one exercise.** Third-shot drop is the same self-fed baseline drop twice (30 minutes). Hands at the net is a close-range wall volley twice (25 minutes).
6. **Solo is the default experience.** Only "I have a reliable drilling partner and play up often" gets partner drills; the other three partner answers get the solo versions.

---

## Table 1: Diagnoses

### 1.1 How the engine picks a combination

**Skill (bottleneck).** Each skill gets a level from 0 to 3 from its question; reset is the average of the kitchen-line and mid-court questions. Gap = weight × (3 − level), with weights reset 1.4, third-shot drop 1.2, hands at the net 1.0, soft-game patience 0.9. The largest gap wins. The only possible tie is all gaps at zero, which goes to reset.

**Root cause.** Decided by the three training questions:

| Open play vs drilling | When you drill | Partner | Root cause | Share of the 64 training combinations |
|---|---|---|---|---|
| Almost all open play, or Mostly games | any | any | `open_play_only` | 32 |
| A real mix of both | I don't really drill | any | `open_play_only` | 4 |
| A real mix of both | Warm up and rally, or Specific shots picked randomly | any | `random_drilling` | 8 |
| A real mix of both | Specific weaknesses with a plan | any | `well_coached` | 4 |
| Mostly drilling | With a plan, or partner is "reliable partner and play up often" | | `well_coached` | 7 |
| Mostly drilling | Anything but "with a plan" | Anything but "reliable partner" | `random_drilling` | 9 |
| | | | `unclear` | 0 |

`unclear` is only returned when the drilling question has no answer, and that question is required. When the ratio answer is "A real mix of both", the drilling answer always wins the vote and the partner answer is ignored.

**Story.** `STORIES.find` needs an exact match on both skill and root cause. There is no partial match on skill alone or cause alone, so any pair without its own story gets the fallback.

### 1.2 Mirror beat (the same for every combination)

The mirror does not depend on the skill or the root cause. Eyebrow "What you told us", heading "In your own words —", then up to three lines:

| Line | Text | Source |
|---|---|---|
| 1 | You've been at this level for: {answer, lowercased}. | Plateau question. One of: "under 6 months", "6–12 months", "1–2 years", "2+ years", "i don't feel stuck, i just want to improve" |
| 2 | On court, your time looks like: {answer, lowercased}. | Ratio question. One of: "almost all open play / games", "mostly games, occasional drilling", "a real mix of both", "mostly drilling and focused practice" |
| 3 | When you lose games you should win, you said: "{their text}" | Optional free-text question. Omitted if left blank |

Note: the fifth plateau option renders as "You've been at this level for: i don't feel stuck, i just want to improve." The sentence doesn't fit that answer and the "I" is lowercased.

### 1.3 Every combination

`{level}` is the player's stated rating when question 1 reads cleanly as a number from 2.0 up to but not including 4.0 (for example "3.5"), otherwise "your current level".

Each beat also shows a fixed eyebrow: verdict "Your bottleneck" plus the skill title in large type, insight "Why it hasn't improved", absolution "The part that matters". A fifth beat follows in every case: "{readiness} is your baseline from these answers. The plan starts on {skill}, and the re-test in three weeks shows what moved."

Frequency columns: **Even** is the share of all 65,536 combinations of the eight scored answers. **Typical** is my estimate for a stuck 3.5 who mostly plays open play; the weights are assumptions, listed in 1.5.

| # | Skill (title shown) | Root cause | Story | Verdict | Insight | Absolution | Even | Typical |
|---|---|---|---|---|---|---|---|---|
| 1 | The reset | `open_play_only` | `reset_open_play` | Based on your answers, this is the best place to start. The reset separates {level} from 4.0 more than any other shot, and it's where you rated yourself lowest. | **Games don't teach the reset.**<br>Almost all of your court time is open play. Every point there is live, so a reset gets one rushed attempt and no second try — the shot never gets the calm, repeated reps it needs to form. | **This isn't a ceiling on your game — it's a shot that never got its reps, and reps are something you can schedule.**<br>Three weeks of low-stakes resets is the plan. | 21.5% | 32.0% |
| 2 | The reset | `random_drilling` | **Fallback.** No story is authored for `random_drilling` on any skill. Reset has stories for the other two causes only. | Based on your answers, this is the best place to start: resets from the transition zone is where you rated yourself lowest, weighted by how much it matters for 4.0. | **Your answers don't fit one clean pattern.**<br>More than one thing is pulling at once, which is common at {level}. The skill above is where you rated yourself lowest, so it's where a plan pays off first. | **This isn't a ceiling — it's a few small gaps, and the way through is one at a time.**<br>Start with this one; the next comes after the re-test. | 10.1% | 6.1% |
| 3 | The reset | `well_coached` | `reset_well_coached` | Based on your answers, this is the best place to start. You drill with structure, but the reset is still where you said your points break down. | **The reset holds in practice and slips in games.**<br>You said you drill with a plan, and that the reset still fails mid-court when the ball comes fast. That pattern points to a transfer gap: the shot exists at drill pace, not yet at game pace. | **This isn't a technique problem to start over on — it's a shot that needs rehearsing under game chaos, and chaos can be rehearsed.**<br>Three weeks of resets at real pace is the plan. | 6.6% | 1.3% |
| 4 | Third-shot drop | `open_play_only` | `third_shot_open_play` | Based on your answers, this is the best place to start. The drop is the shot that gets you to the kitchen, and it's the one you rated least reliable. | **Games give the drop almost no clean reps.**<br>Most of your court time is open play. A game moves on whether a drop was good or bad, so there's no feedback and maybe a dozen attempts an hour — far too few for a touch shot to settle. | **This isn't a ceiling — it's a shot that has never had measured reps, and measured reps are the whole plan.**<br>Count the drops, and the drop shows up. | 20.4% | 33.6% |
| 5 | Third-shot drop | `random_drilling` | **Fallback.** No story is authored for `random_drilling` on any skill. | Based on your answers, this is the best place to start: your third-shot drop is where you rated yourself lowest, weighted by how much it matters for 4.0. | **Your answers don't fit one clean pattern.**<br>More than one thing is pulling at once, which is common at {level}. The skill above is where you rated yourself lowest, so it's where a plan pays off first. | **This isn't a ceiling — it's a few small gaps, and the way through is one at a time.**<br>Start with this one; the next comes after the re-test. | 9.6% | 6.4% |
| 6 | Third-shot drop | `well_coached` | **Fallback.** The drop has one story, for `open_play_only`. `well_coached` stories exist only for reset and patience. | Based on your answers, this is the best place to start: your third-shot drop is where you rated yourself lowest, weighted by how much it matters for 4.0. | **Your answers don't fit one clean pattern.**<br>More than one thing is pulling at once, which is common at {level}. The skill above is where you rated yourself lowest, so it's where a plan pays off first. | **This isn't a ceiling — it's a few small gaps, and the way through is one at a time.**<br>Start with this one; the next comes after the re-test. | 6.2% | 1.3% |
| 7 | Hands at the net | `open_play_only` | `net_defense_open_play` | Based on your answers, this is the best place to start. Speed-ups at your body are where you rated yourself weakest, and 4.0 opponents will find that. | **It feels like slow hands. It's fewer reps.**<br>Hands at the net are reflex, and a reflex only builds from seeing the same ball many times at real pace. Open play hands you a few speed-ups an hour, spread among everything else. | **This isn't about reflexes you weren't born with — it's a ball you've seen too rarely, and you can see it on purpose.**<br>Three weeks of speed-ups in isolation. | 11.5% | 11.4% |
| 8 | Hands at the net | `random_drilling` | **Fallback.** No story is authored for `random_drilling` on any skill. | Based on your answers, this is the best place to start: your hands at the net is where you rated yourself lowest, weighted by how much it matters for 4.0. | **Your answers don't fit one clean pattern.**<br>More than one thing is pulling at once, which is common at {level}. The skill above is where you rated yourself lowest, so it's where a plan pays off first. | **This isn't a ceiling — it's a few small gaps, and the way through is one at a time.**<br>Start with this one; the next comes after the re-test. | 5.4% | 2.2% |
| 9 | Hands at the net | `well_coached` | **Fallback.** Hands at the net has one story, for `open_play_only`. | Based on your answers, this is the best place to start: your hands at the net is where you rated yourself lowest, weighted by how much it matters for 4.0. | **Your answers don't fit one clean pattern.**<br>More than one thing is pulling at once, which is common at {level}. The skill above is where you rated yourself lowest, so it's where a plan pays off first. | **This isn't a ceiling — it's a few small gaps, and the way through is one at a time.**<br>Start with this one; the next comes after the re-test. | 3.5% | 0.5% |
| 10 | Soft-game patience | `open_play_only` | **Fallback.** Patience has one story, for `well_coached`. It is the only skill with no `open_play_only` story, although that is the most common cause. | Based on your answers, this is the best place to start: your patience in the soft game is where you rated yourself lowest, weighted by how much it matters for 4.0. | **Your answers don't fit one clean pattern.**<br>More than one thing is pulling at once, which is common at {level}. The skill above is where you rated yourself lowest, so it's where a plan pays off first. | **This isn't a ceiling — it's a few small gaps, and the way through is one at a time.**<br>Start with this one; the next comes after the re-test. | 2.8% | 4.3% |
| 11 | Soft-game patience | `random_drilling` | **Fallback.** No story is authored for `random_drilling` on any skill. | Based on your answers, this is the best place to start: your patience in the soft game is where you rated yourself lowest, weighted by how much it matters for 4.0. | **Your answers don't fit one clean pattern.**<br>More than one thing is pulling at once, which is common at {level}. The skill above is where you rated yourself lowest, so it's where a plan pays off first. | **This isn't a ceiling — it's a few small gaps, and the way through is one at a time.**<br>Start with this one; the next comes after the re-test. | 1.3% | 0.8% |
| 12 | Soft-game patience | `well_coached` | `dink_patience_well_coached` | Based on your answers, this is the best place to start. You have the shots; you said the long rallies end when patience runs out first. | **Patience holds in drills and cracks when there's a score.**<br>You drill with a plan, and you said long rallies end with you forcing a speed-up. That's a pressure pattern, not a stroke problem: in a drill the ball you leave feels fine; with a score on it, it starts looking attackable. | **This isn't a discipline flaw — it's a decision that has never been rehearsed with something on the line, and that can be rehearsed.**<br>Three weeks of long rallies with a score attached. | 0.9% | 0.2% |
| 13–16 | Any of the four | `unclear` | **Fallback, but unreachable.** A completed assessment never returns `unclear` (see 1.1). | Same as the fallback rows for that skill | Same as the fallback rows | Same as the fallback rows | 0% | 0% |

Totals:

| | Even | Typical |
|---|---|---|
| Authored story shown | 60.9% | 78.4% |
| Fallback shown | 39.1% | 21.6% |
| By skill: reset / third-shot drop / hands at the net / patience | 38.2% / 36.3% / 20.5% / 5.0% | 39.3% / 41.3% / 14.1% / 5.3% |
| By cause: open play only / random drilling / well coached | 56.3% / 26.6% / 17.2% | 81.3% / 15.4% / 3.3% |

Patience is rare as a bottleneck because it has the lowest weight and its worst answer scores 1, not 0. It only wins when reset, the drop, and hands at the net are all at level 2 or better. The one authored patience story is the rarest outcome in the table.

### 1.4 Story lines that can contradict the player's answers

Percentages are the share of the answer combinations that reach that story, with every answer equally likely.

| Story | Line | When it is not true | Share |
|---|---|---|---|
| `reset_open_play` | "Almost all of your court time is open play." | The player chose "Mostly games, occasional drilling" (44%), or "A real mix of both" with "I don't really drill" (11%) | 56% |
| `third_shot_open_play` | "Most of your court time is open play." | The player chose "A real mix of both" with "I don't really drill" | 11% |
| `reset_open_play`, reset fallback | "it's where you rated yourself lowest" / "The skill above is where you rated yourself lowest" | Reset won on its 1.4 weight while another skill was rated lower (for example reset 1.5, hands at the net 1) | 22.5% of reset results |
| `reset_well_coached` | "You said you drill with a plan" | `well_coached` was reached through "Mostly drilling" plus a reliable partner, while the drilling answer was "I don't really drill", "warm up and rally", or "pick them randomly" | 27% |
| `reset_well_coached` | "the reset still fails mid-court when the ball comes fast" | The player answered the mid-court question "I reset it softly into the kitchen and keep coming"; the gap came from the kitchen-line question | 9% |
| `dink_patience_well_coached` | "You drill with a plan" | Same route as above | 27% |
| `dink_patience_well_coached` | "you said the long rallies end when patience runs out first" / "you said long rallies end with you forcing a speed-up" | The player chose "My dink breaks down first…" or "I just keep it going and wait for them to miss" | 53% |
| Any reset result | "where you rated yourself lowest" | The player rated all four skills at the top. Every gap is zero and reset wins by position | 64 combinations (0.1%) |
| Fallback | "Your answers don't fit one clean pattern." / "More than one thing is pulling at once" / "it's a few small gaps" | None of this is computed from the answers. It shows the same way for a player with exactly one weak skill and an unambiguous cause | All fallback results |
| Fallback verdict, reset | "resets from the transition zone is where you rated yourself lowest" | Grammar: plural subject with "is" | All reset fallbacks |

One related dead line: `focusReason` in `result-copy.ts` adds "Your answers about how you practice were mixed, so the plan is built on the skill alone" when the cause is `unclear`. Since `unclear` is unreachable, that sentence never shows.

### 1.5 How the frequencies were estimated

I compiled the engine unchanged into a scratch directory and ran all 65,536 combinations of the eight scored multiple-choice answers through `diagnose`. Rating, plateau, play frequency and the free-text answer do not affect the outcome.

- **Even** treats every option as equally likely. It is exact as a count of combinations and unrealistic as a picture of real players.
- **Typical** weights each option with my own guess at how a stuck 3.5 who mostly plays open play would answer, and treats the questions as independent. These weights are assumptions, not data:

| Question | a | b | c | d |
|---|---|---|---|---|
| Open play vs drilling | 40% | 35% | 18% | 7% |
| When you drill | 35% | 30% | 25% | 10% |
| Partner access | 12% | 33% | 30% | 25% |
| Kitchen line hold | 15% | 45% | 30% | 10% |
| Third-shot drop | 10% | 35% | 35% | 20% |
| Mid-court reset | 8% | 37% | 40% | 15% |
| Hands at the net | 15% | 40% | 33% | 12% |
| Dink rally | 15% | 25% | 35% | 25% |

For real numbers, the `diagnoses` table stores `bottleneck`, `root_cause` and `story_id` for every saved result. A count grouped by those three columns would replace both estimates. I did not query the database.

---

## Table 2: Drills

### 2.1 Every drill in `drills.ts`

"Setup" is the label the app shows. A drill marked Partner is swapped for its solo version when the player has no reliable partner; name and duration stay the same.

| Skill | Drill | Solo or partner | Duration | Setup | What the player does | Solo version |
|---|---|---|---|---|---|---|
| Reset | Reset Ladder | Partner, with a solo version | 15 min | Partner | Partner drives hard balls at your feet from mid-court. Reset each one soft into the kitchen: absorb the pace, don't attack. Count clean resets in a row. At 10, move up a rung — partner hits harder or steps a stride closer — and restart the count. A miss restarts it on the same rung. If the timer ends first, stop there and log your last 10. | **Solo.** Drop-feed yourself off the bounce from mid-court and reset into a target zone near the kitchen line. Work in sets of 10 and keep the count. When the timer ends, stop where you are and log how many of your last 10 landed in the zone. |
| Reset | Wall Reset | Solo | 10 min | Wall | Stand 7–8 feet from a wall. Drive the ball into the wall and reset your own return softly. Builds the soft-hands reflex under self-generated pace. | None needed |
| Third-shot drop | Basket Drop Drill | Solo | 15 min | Solo | From the baseline, drop-feed yourself and hit third-shot drops into the kitchen. Work in sets of 10 and keep the count out loud. The number is the feedback. | None needed |
| Third-shot drop | Live Drop Practice | Partner, with a solo version | 15 min | Partner | Partner serves, you return, they return deep — you go for the drop. Real game pressure, real feedback. Commit to the drop even when it fails. | **Solo.** Self-feed from the baseline: toss the ball, let it bounce, hit the drop. Focus on contact point — slightly low, slightly out front, gentle lift. |
| Hands at the net | Speed-Up Defense Drill | Partner, with a solo version | 15 min | Partner | Stand at the kitchen. Partner speeds up at your body and hip repeatedly. Block or counter — don't back up. Goal: stay in the point, not win it. 3 sets of 15. | **Wall.** Wall drill: stand close to the wall, drive medium-pace balls and block your own returns. Builds the reflex of soft hands on fast balls. |
| Hands at the net | Hands Battle | Partner, with a solo version | 10 min | Partner | Both players at the kitchen, speed up freely. First to pop it up loses the point. Purely for reaction and reset reflex. Keep score. | **Wall.** Wall volley: stand 5 feet from the wall, volley continuously keeping the ball controlled. Decrease distance as you improve. |
| Soft-game patience | 50-Dink Rally | Partner, with a solo version | 10 min | Partner | Both players commit to reaching 50 dinks in a row without attacking. No speed-ups allowed. Purely builds patience and consistency. Count out loud. | **Wall.** Wall dinking: stand at kitchen distance from a wall, dink continuously keeping the ball at net height. Count to 30 before resetting. |
| Soft-game patience | Attack Gate Drill | Partner, with a solo version | 15 min | Partner | Dink rally, but you can only speed up if the ball is above net height AND out in front. Any other ball must be reset. Trains the decision, not just the shot. | **Solo.** Shadow drill: stand at the kitchen, feed yourself imaginary balls, practice the decision out loud — 'attackable' or 'reset' — before swinging. |

### 2.2 What a solo player's full session contains

Who counts as solo: anyone who did not answer "I have a reliable drilling partner and play up often". That is three of the four partner answers, including "Sometimes, but not consistently".

A session is both of the skill's drills, back to back, twice a week. Each drill runs as a brief, a countdown for the duration with one cue on screen, then a 0 to 10 log.

| Skill | Drill 1 | Drill 2 | Total | Same exercise? |
|---|---|---|---|---|
| Reset | **Reset Ladder**, Solo, 15 min. Drop-feed from mid-court and reset into a target zone by the kitchen line, in sets of 10. Cue: "Paddle out front, soft grip — absorb the pace, don't swing." Logs "Of your last 10 resets, how many landed in the zone?" Target 7 of 10. | **Wall Reset**, Wall, 10 min. From 7–8 feet, drive into the wall and reset your own return softly. Cue: "Let the ball come to you — block, don't hit." Logs "Of your last 10 resets, how many stayed low?" Target 7 of 10. | 25 min | No. One is a self-fed touch shot to a target, the other absorbs pace off a wall. |
| Third-shot drop | **Basket Drop Drill**, Solo, 15 min. Drop-feed from the baseline and hit drops into the kitchen, in sets of 10, counting out loud. Cue: "Contact low and out front, lift gently — arc, not power." Logs "Out of 10 drops, how many landed clean?" Target 7 of 10. | **Live Drop Practice**, Solo, 15 min. Toss, bounce, hit the drop from the baseline, focusing on contact point. Cue: "Commit to the drop every time, even the ugly ones." Logs "Out of 10 drops, how many landed clean?" Target 6 of 10. | 30 min | **Yes. Flagged.** Both are a self-fed drop from the baseline into the kitchen, with the same success rule and the same log question. |
| Hands at the net | **Speed-Up Defense Drill**, Wall, 15 min. Close to the wall, drive medium-pace balls and block your own returns. Cue: "Paddle up and in front, block first — offense second." Logs "Of your last 10 blocks, how many stayed under control?" Target 7 of 10. | **Hands Battle**, Wall, 10 min. Volley continuously against the wall from 5 feet, moving closer as it holds. Cue: "Short strokes, stay compact — keep it under control." Logs "Of your last 10 volleys, how many stayed under control?" Target 7 of 10. | 25 min | **Yes, near enough. Flagged.** Both are continuous close-range volleys against a wall, scored on "stayed under control". The only stated difference is medium pace versus continuous. |
| Soft-game patience | **50-Dink Rally**, Wall, 10 min. Dink against a wall at kitchen distance, keeping the ball at net height, counting to 30 before resetting. Cue: "Soft wrist, contact out front — keep it at net height." Logs "Of your last 10 dinks, how many stayed at net height?" Target 8 of 10. | **Attack Gate Drill**, Solo, 15 min. No ball. Stand at the kitchen, imagine each ball and call "attackable" or "reset" out loud before swinging. Cue: "Only above the net AND out in front — everything else resets." Logs "Of your last 10 calls, how many matched the rule?" Target 8 of 10. | 25 min | No. One is wall dinking, the other is a shadow decision drill. |

### 2.3 Flags

**Same exercise twice in one session**

1. **Third-shot drop, solo.** Basket Drop Drill and solo Live Drop Practice are the same drill with different wording. The success rule is word for word identical and so is the log question. The practice targets differ (7 of 10, then 6 of 10) for the same exercise. Nothing in the second drill is "live".
2. **Hands at the net, solo.** Solo Speed-Up Defense and solo Hands Battle are both close-range wall volleys with the same success measure. A solo player spends the whole 25 minutes on one wall exercise.

**Other things a solo player will notice**

- **Reset Ladder, solo:** the cue says "absorb the pace", but a drop-fed ball has no pace. There is also no ladder in the solo version; the name carries over because names can't be overridden.
- **50-Dink Rally, solo:** the name says 50, the instructions say count to 30.
- **Attack Gate Drill, solo:** the player invents each ball and then grades their own call on it, so the logged number will nearly always be 10 of 10.
- **Across skills:** Wall Reset (reset) and solo Speed-Up Defense (hands at the net) are close to the same exercise: drive into a wall and soft-block your own return. They never appear in the same session.

**Partner version**

- **Speed-Up Defense Drill:** the instructions say "3 sets of 15", the log protocol says "Log your last set of 10".
