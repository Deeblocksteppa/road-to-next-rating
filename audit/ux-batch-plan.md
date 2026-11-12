# UX batch D: plan

Written 2026-11-10 from `main` at `e99d3bf`, updated 2026-11-11 (Progress before the first re-test locked, questions l, m, n added; then KC's nine decisions recorded). Read-only investigation: no code changed. To be built on `ux-batch-d`.

The locked design decisions are in the request and are not repeated here. This file says where each one lands, what it risks, and what is still open. Section 6 lists the locked items the code contradicts. Read section 6 and section 4 before approving the build.

## Decisions recorded 2026-11-11 (KC)

1. **Time rows are computed from the drills**, never fixed text: the session's minutes, each drill's minutes, the NEXT line.
2. **Home counter: "n of 2 sessions this week"; the two circles are removed.**
3. **"In your games" and "Re-test goal" render from code.** KC reviews the drafts before the build. No data migration.
4. **Wall drills: one shared wall diagram template for all five wall versions, with per-drill labels.** The partner version of Speed-Up Defense keeps its existing diagram.
5. **Scoring rule: each drill's own unit word in place of "set".** A proposed rule word and LOG line per drill version are in the copy table.
6. **Progress before the first re-test:** this plan's sessions only; "6 of 6" with all six lit past six; the duplicate subscriber READINESS section is dropped; one sentence for everyone, "Your re-test gives you a new score to compare with this one."
7. **Design rules to amend in the docs phase:** legal fine print under a button may be 14px; forms may center vertically at 768px and wider, top-aligned below that.
8. **Email fields: `autoCapitalize` off and `autoCorrect` off.** No further work on question 22.
9. **Reminder toggle: the label states the real cadence.** A change to the cadence itself is undecided and is not in the phases.

## Decisions, second round (2026-11-11, KC). Build approved

Every open question is now answered. Where this block and an older line in the file disagree, this block wins.

**Accepted as recommended:** Q2 (the drill page's sentence is `task`; the full description stays on the timer), Q4 (the rule on the pre-drill and timer screens only), Q5 (keep "Falling short of 7 of 10 still counts."), Q6 (labels mono, values in the body font at 16px), Q9 (the status lines in (g)), Q10 (`?drill=` on `/start` and `/plan`), Q12 (`/home?saved=1`), Q13 (a signed-in retake also lands on `/home`), Q16 (Home keeps "Week 2 of 3", loses the sentence), Q18 (every auth form centers at 768px and wider), Q19 ("Session logged." removed), Q26 (RE-TEST row hidden while open; "Not scheduled" with the sentence kept). The scoring-rule table (rows 63 to 76) and the wall diagram labels (rows 77 to 81). Copy rows 15, 17, 18, 19, 45, 46, 49, 59, 60. Doing drill 2 first is removed. The reminder cadence is unchanged.

**Changed from my recommendation:**

- **Q11:** a drill page opened from a plan row has no start button in any state, back arrow only. Starting lives on the plan's "Start session" and on Home. The drill page has two modes: in a session ("Begin") and read-only.
- **Q7:** wall versions read "SOLO · WALL" on plan rows and Home rows, and "Solo, at a wall" on the drill page.
- **Q8:** a row logged today reads "TODAY · 7/10" in place of the time. "Continue session" on a half-done session.
- **Row 48:** "Next session: any other day this week."
- **Row 51:** label "Session reminders", one grey line under it: "One email a day while a session is left this week. Stops at your re-test."
- **Final week:** a line that says next week's sessions open Monday points to the re-test date instead when no plan week is left. Rule used: the re-test date is on or before next Monday. Lines and wording:

| Where | Normal weeks | Final week |
|---|---|---|
| Session complete, 2 of 2 | "That's the week. Next sessions open Monday, Nov 16." | "That's the week. Your re-test opens Dec 2." |
| Session complete, 1 of 2 on the week's last day | "This week ends today. Next week's sessions open Monday, Nov 16." | "This week ends today. Your re-test opens Dec 2." |
| Plan, done today on the week's last day | "Today's session complete. Next week's sessions open Monday." | "Today's session complete. Your re-test opens Dec 2." |
| Plan, both done earlier this week | "Both sessions done this week. Next week's open Monday." | "Both sessions done this week. Your re-test opens Dec 2." |
| Home caption, week done | "Next sessions unlock Monday, Nov 16" | "Your re-test opens Dec 2." |
| Home caption, 1 of 2 on the week's last day | "This week ends today. Next week's sessions open Monday, Nov 16." | "This week ends today. Your re-test opens Dec 2." |

**Final plan sentences (rendered from code):**

| | In your games | Re-test goal |
|---|---|---|
| Reset | "When you're caught mid-court, reset soft instead of attacking, even if it costs the point." | "Cleanly reset 6 of 10 hard balls at your feet from mid-court." |
| Third-shot drop | "Go for the drop on every third shot, even when it fails." | started 1–3: "In a real game, land 5 or more of 10 drops without getting attacked, up from 1–3." · started 4–6: "In a real game, land 7 or more of 10 drops without getting attacked, up from 4–6." · started 7–10: "Keep landing 7 or more of 10 drops without getting attacked in real games." · started 0, or no readable answer: "In a real game, land 5 or more of 10 drops without getting attacked." |
| Hands at the net | "When someone speeds up at you, block first and look for offense second." | "Block back 6 of 10 speed-ups at your body and stay in the point." |
| Soft-game patience | "In every dink rally, speed up only on a ball above net height and out in front." | "In your next 3 games, speed up on an unattackable ball fewer than 3 times a game." |

**The "0" answer:** it is stored as the option's id, `third_shot: "d"`, in the assessment's `answers` (the `assessments.answers` column, and `rtnr:result` on the device before sign-up). The option is "0: none land, or I usually just drive because the drop isn't reliable", level 0, short "0" (`src/lib/questions.ts`). The goal is chosen by the option's level: level 0 gets the no-answer sentence with no "up from" clause.

---

## 1. Findings

### (a) Drill content: where it lives, what each drill has

**Defined in** `src/lib/drills.ts`. The `Drill` interface is at `:3-43`, the solo override type `SoloVersion` at `:60-63`, the data `DRILLS` at `:65-260`. Two drills per skill, eight in all. Six of the eight have a `solo` version; `reset_wall` and `drop_basket` need no partner and have none. That makes 14 versions a player can be given.

**Fields** (`drills.ts:3-43`): `id`, `name`, `description` (full technique, 2 to 3 sentences), `task` (one plain sentence), `setup` ("Partner" / "Wall" / "Solo"), `cue` (timer screen), `logProtocol`, `counts`, `practiceTarget`, `duration`, `logPrompt`, `requiresPartner`, optional `solo`.

**Which version a player gets:** `prescribeDrill` (`src/lib/roadmap.ts:90-93`). A player gets the partner version only if they answered "I have a reliable drilling partner and play up often" (`hasDrillingPartner`, `roadmap.ts:79-81`). Everyone else gets `{ ...drill, ...drill.solo }`. Saved plans store only drill ids; the choice is recomputed at render from the plan's answers (`src/lib/plan-drills.ts:22-32`).

**There is no diagram field.** The diagram is chosen by skill, not by drill: `shotTypeForDrill` (`src/lib/drill-shot.ts:20-25`) maps a drill to its skill's shot, and `ShotDemo` returns nothing when the prescribed setup is "Wall" (`src/components/session/ShotDemo.tsx:52-53`).

**Every prescribed version** (14 in all). "Diagram" is what a player sees today.

| # | Drill id · version | Name | Setup | Min | Description (today's pre-drill text) | `task` (one sentence) | `logProtocol` | `counts` | Target | Diagram today |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `reset_ladder` · partner | Reset Ladder | Partner | 15 | Your partner drives hard balls at your feet from mid-court. Reset each one softly into the kitchen. After 10 clean in a row, they hit harder or step closer; a miss restarts the count. | Reset your partner's drives soft into the kitchen, counting clean ones in a row. | Log your last set of 10. | A reset counts if it lands in the kitchen and stays below net height after the bounce. | 7 of 10 | Yes (reset) |
| 2 | `reset_ladder` · solo | Reset Ladder | Solo | 15 | Start at the kitchen line. Toss, let it bounce, and reset it softly into the kitchen. Land 7 of 10, then step back a stride and go again. | Toss the ball up at yourself and reset it into the kitchen, stepping back a stride after every 7 of 10. | Log your last set of 10. (inherited) | A reset counts if it lands in the kitchen. | 7 of 10 | Yes, the partner picture (a hard incoming ball that the solo version does not have) |
| 3 | `reset_wall` | Wall Reset | Wall | **10** | Stand 7–8 feet from a wall. Drive the ball into it, then reset the return softly. | Drive into a wall and reset your own return softly, over and over. | Log your last set of 10. | A reset counts if it comes back off the wall at knee height or lower. | 7 of 10 | **No** |
| 4 | `drop_basket` | Basket Drop Drill | Solo | 15 | From the baseline, drop-feed yourself and hit third-shot drops into the kitchen. Count each set of 10 out loud. | Self-feed third-shot drops from the baseline and count how many land soft. | Log your last set of 10. | A drop counts if it lands in the kitchen and bounces below net height. | 7 of 10 | Yes (drop) |
| 5 | `drop_live` · partner | Live Drop Practice | Partner | 15 | Your partner serves, you return, and they hit a deep ball back. Hit the drop off it. | Serve, return, then go for the drop under real game pressure. | Log your last set of 10. | A drop counts if it lands in the kitchen and your partner can't attack it. | 6 of 10 | Yes (drop) |
| 6 | `drop_live` · solo | Drop and Follow | Solo | 15 | From the baseline, toss the ball so it bounces deep, like a return. Hit the drop, then move in and split-step before it lands. | Toss a deep ball, hit the drop, then move in and split-step before it lands. | Log your last 10 reps. | A rep counts if the drop lands in the kitchen and you're set before it bounces. | 6 of 10 (inherited) | Yes (drop; the move in is not drawn) |
| 7 | `speedup_defense` · partner | Speed-Up Defense Drill | Partner | 15 | At the kitchen, your partner speeds up at your body and hip. Block or counter without backing up; the goal is to stay in the point. Do 3 sets of 15. | Block your partner's speed-ups at the kitchen without backing up. | Log the last 10 balls of your final set. | A ball counts if it goes back over the net and the point continues. | 7 of 10 | Yes (speed-up block) |
| 8 | `speedup_defense` · solo | Speed-Up Defense Drill | Wall | 15 | Stand 6–7 feet from a wall. Hit firm into it, then block the return soft so it drops low. | Hit firm into a wall from 6–7 feet and block the return soft so it drops low. | Log your last set of 10. | A block counts if it comes back off the wall low and soft. | 7 of 10 (inherited) | **No** |
| 9 | `hands_battle` · partner | Hands Battle | Partner | **10** | Both players at the kitchen, speeding up freely. The first to pop it up loses the point. | Both at the kitchen, speed up freely. First to pop it up loses. | Log your last 10 exchanges. | An exchange is won if your opponent pops it up or misses first. | 6 of 10 | Yes (same picture as #7) |
| 10 | `hands_battle` · solo | Wall Counters | Wall | **10** | Stand 4–5 feet from a wall. Keep firm volleys going without letting the ball bounce, alternating forehand and backhand every ball. | Volley firm against a wall from 4–5 feet, alternating forehand and backhand every ball. | Log your last 10 volleys. | A volley counts if it's on the right side and under control, with no mishit or pop-up. | 7 of 10 | **No** |
| 11 | `dink_50` · partner | 50-Dink Rally | Partner | **10** | Dink with your partner, counting out loud, and aim for 50 in a row. No speed-ups. | Reach 50 dinks in a row with your partner, no speed-ups allowed. | Log your last 10 rallies. | A rally counts as patient if it ends on their error or reaches the target without you speeding up. | 8 of 10 | Yes (dink) |
| 12 | `dink_50` · solo | Wall Dinking | Wall | **10** | Stand at kitchen distance from a wall and dink, keeping it around net height. Count out loud and aim for 30 in a row; a miss starts you at 1. | Dink against a wall at kitchen distance, counting out loud to 30 in a row. | Log your last 10 dinks. | A dink counts if it comes back around net height and you keep the rally going. | 8 of 10 (inherited) | **No** |
| 13 | `attack_gate` · partner | Attack Gate Drill | Partner | 15 | Dink with your partner. Speed up only on a ball above net height and out in front; reset everything else. | Dink rally where you may only speed up on a ball above the net and out front. | Log your last 10 attackable balls. | A read counts if you attacked a ball above the net and out front, or reset one that wasn't. | 8 of 10 | Yes (same picture as #11) |
| 14 | `attack_gate` · solo | Attack Gate Drill | Wall | 15 | Put tape on the wall at net height, about 35 inches, and dink against it. Hit firm only when the ball comes back above the tape and out in front. | Dink against a wall with tape at net height, hitting firm only on a ball above the tape and out front. | Log your last 10 balls. | A ball counts if you played it by the rule: firm above the tape and out front, a dink otherwise. | 8 of 10 (inherited) | **No** |

**Session length by skill** (`sessionMinutes`, `src/lib/session-plan.ts:37-39`): reset 15 + 10 = **25**; third-shot drop 15 + 15 = **30**; hands at the net 15 + 10 = **25**; soft-game patience 10 + 15 = **25**. `duration` cannot be overridden by a solo version (`drills.ts:56-58`), so these hold for both versions.

**Can the new rows be derived? Yes, with one small new field for the scoring rule's unit word (decision 5).**

- **SOLO / PARTNER** (plan rows, Home): from `setup`, not from `requiresPartner`. `prescribeDrill` spreads `solo` over the drill and `solo` never overrides `requiresPartner`, so a solo-prescribed drill still says `requiresPartner: true` (`roadmap.ts:92`, `drills.ts:60-63`). Rule: `setup === "Partner"` is PARTNER, anything else ("Solo", "Wall") is SOLO. One helper, used by the plan row, Home and the drill page.
- **TIME**: `duration` ("15 min").
- **WHO**: `setup`. Whether a wall drill reads "Solo" or names the wall is Q7.
- **COUNTS**: `counts`, whole. It is a sentence of up to 100 characters, so it cannot be a mono value (hard rule 1: mono labels about three words). Shortening it by cutting the lead ("A reset counts if it…") would mean parsing prose with five different openers ("A reset counts if", "An exchange is won if", "A rally counts as patient if", "A read counts if", "A rep counts if"). Do not parse; show the sentence.
- **LOG**: `logProtocol`. Decision 5: the copy table proposes the row's wording per version, without the verb ("Your last 10 rallies"), since the row's label already says LOG.
- **The scoring rule's unit word** (decision 5): cannot be derived. The thing a player is in the middle of when the timer ends (a set, a rep, an exchange, a rally) is not always the thing they log (the last 10 volleys of a wall rally). One new field, `unit`, on `Drill` and optionally on `SoloVersion`. `drills.ts` is content, not engine scoring.
- **TARGET**: `practiceTarget` ("7 of 10").
- **One instruction sentence**: `task` already is that (`drills.ts:8-13`). See Q2 for what it leaves out.
- **Diagram**: decision 4. Court versions keep the per-skill lookup. Wall versions use one shared template with per-drill labels, so the lookup only needs to know "wall" (the prescribed `setup`) and the drill id for its labels. No field on `Drill` is needed.

### (b) Plan strings stored at creation, and which changes need a migration

**The `plans` table** (`supabase/migrations/20260717185014_init_schema.sql:52-62`): `drill_ids text[]`, `in_game_rule text`, `retest_metric text`, `retest_date date`, `status text`, plus `source_plan_id` from `20261029120000`.

**Written at creation in two places**, both from `generateRoadmap`:

- the anonymous plan: `src/lib/persistence.ts:125-134` (`in_game_rule: roadmap.inGameRule`, `retest_metric: roadmap.retestMetric`, `retest_date` = now + 21 days);
- the re-test's new plan: `src/lib/retest-save.ts:83-92`.

**Stored (frozen text on the row):**

- **In-game rule**: `IN_GAME_RULES[skill]` (`roadmap.ts:16-25`). Four strings, each **two sentences**.
- **Re-test goal**: `RETEST_METRICS[skill]` for three skills (`roadmap.ts:27-34`, two or three sentences each), or `thirdShotRetestMetric` (`roadmap.ts:52-64`, three sentences).
- **"You started at 0" for the third-shot drop is inside the stored goal**: "Out of 10 drops in a real game, count how many land soft without getting attacked. You started at 0. Target: 5+." (`roadmap.ts:63`; the range is the option's `short`, `questions.ts:89-96`). Four variants exist (started at 0, 1–3, 4–6, 7–10) plus a no-answer fallback (`roadmap.ts:59`).

**Not stored (computed at render):**

- **"You started at: “…”."** for the three skills answered in words: `retestStart` (`src/lib/result-copy.ts:75-79`), called at `src/app/(app)/plan/page.tsx:88` and `src/app/start/page.tsx:299`. It quotes the answer's full label.
- The quote paragraph on `/start`: `focusReason` (`result-copy.ts:59-64`), from the engine's `verdictClause`.
- The drills (ids only are stored), solo or partner, session length, week number, this week's count, readiness (computed from `skill_scores`, `src/lib/readiness.ts:58-62`).

**Read back from the row in two places only:** `plan/page.tsx:35,86-87` (shown) and `src/app/session/page.tsx:56,148` (used only to decide whether the pre-drill card shows "The re-test goal is a separate number, on your plan.", `DrillBrief.tsx:57-61`, which the locked list removes).

**Which locked changes need a data migration:**

| Change | Migration? |
|---|---|
| New PlanView order, mono rows, drill rows, action slot | No. All derived. |
| Removing the quote paragraph, device paragraph, Readiness | No. |
| Drill page, diagrams, SOLO / PARTNER | No. Code and derived values. |
| Sign-up lands on `/home` | No. |
| THIS WEEK, session-complete line | No. Derived from `drill_sessions`. |
| **"In your games (one sentence)" and "Re-test goal (one sentence)"** | **No (decision 3).** Both lines render from code at display time, so an old plan and a new plan show the same wording. The stored columns stay as they are and are no longer shown. |

No schema or data migration is needed for anything in the batch.

**How "render from code" lands (decision 3):** both lines are pure functions already: the rule of the skill (`IN_GAME_RULES`, `roadmap.ts:16-25`), the goal of the skill plus the third-shot answer (`retestMetricFor`, `roadmap.ts:66-70`). `/plan` already has both inputs loaded (the skill at `plan/page.tsx:54`, the answers at `:59-69`). Three things to get right in the build: (1) `/plan` takes the skill from the newest diagnosis and the plan from the newest plan, separately (`plan/page.tsx:25-39`); read the skill from the plan's own diagnosis so the sentence always matches the drills; (2) when the answers cannot be read, the third-shot goal uses its no-answer wording (draft in the copy table); (3) new plans keep writing the two columns, so nothing else that reads a plan row breaks.

### (c) Home's one-line summary under the skill title

It is `diagnose(answers).insightHeadline`: `src/app/(app)/home/page.tsx:73-86` builds it, `:179-181` renders it. Home loads the assessment's answers and re-runs the engine; it does not read a stored string or the stored `story_id`.

It is authored story content: `insightHeadline` is one of the six fields of a `StoryCopy` (`src/lib/diagnoses.ts:80`) and is the headline of reveal beat 3 (`src/components/diagnosis/Reveal.tsx:271-273`). It goes through the engine's `fill` (`src/lib/engine.ts:159-160,173`), and three soft-game stories choose the line by the player's dinking answer (`diagnoses.ts:295-298`, `:314`, `:344`). The all-top and fallback stories have their own (`diagnoses.ts:376`, `:397`).

So yes, it falls under hard rule 5 (lines claim only what routing guarantees), and because Home recomputes it, it always matches the current stories. One caveat on "verified": `audit/content-audit.md` covers the insight column but predates the story fixes and has not been re-run (`docs/STATUS.md:11`).

Batch D does not touch this line. The locked list removes the quote paragraph on `/start`, which is a different string (`focusReason`).

### (d) The pre-drill screen today, and the smallest way to show it to an anonymous player

**It is not a route.** It is the `brief` step of client state inside `GuidedSession` (`src/components/session/GuidedSession.tsx:101,143-152`), drawn by `BriefScreen` (`:208-272`) with `DrillBriefContent` (`src/components/session/DrillBrief.tsx:13-66`) and `ShotDemo`. There is no URL for one drill's brief.

**Auth today:** only `/session` renders it. `/session` is in the middleware's protected list (`src/lib/supabase/middleware.ts:10-18,62-67`) and the page redirects again with no user (`src/app/session/page.tsx:47-52`), then loads the latest plan and its prescribed drills (`:54-68`).

**One other consumer:** the landing page renders the same `DrillBriefContent` and `ShotDemo` for its example drill (`src/components/marketing/readouts.tsx:529-554`). Any change to the brief's layout changes the landing with it. That is by design (the comment at `DrillBrief.tsx:7-11`), but it puts a landing check in this batch.

**Smallest way for `/start`:** do not send the anonymous player to `/session` and do not open the route. `/start` already holds the prescribed drills in memory (`roadmap.weeklyDrills`, `src/app/start/page.tsx:164-167`, built from the answers on the device). Extract the brief into one presentational `DrillPage` component that takes a drill, its position, the next drill and a button mode (`begin` | `start-session` | `none`), and render it from `/start` itself. No fetch, no auth, no server action, so no rows. (The three unclaimed rows `/start` writes when the assessment ends, `start/page.tsx:179`, are unchanged; opening a drill must not call `saveResult`.)

**How it opens, recommended (Q10):** a `?drill=<id>` search param on the page that hosts the plan, on both `/start` and `/plan`. `/start` is public, so `/start?drill=drop_basket` needs no middleware change. The phone's back gesture then returns to the plan instead of leaving it, and a reload keeps the drill open. On `/plan` the server page reads the param and renders `DrillPage` in place of `PlanView`. The alternative, plain component state in `PlanView`, is fewer lines but the back gesture on `/start` would leave the result page for the landing.

Build risk with the param: `/start` is a client page, and `useSearchParams` in Next 14 fails the production build unless it sits under a `Suspense` boundary. `npm run build` must be part of that phase's checks.

### (e) "Start drill" on drill 2 today, and what breaks without it

**Today:** each unlogged drill row has a link to `/session?drill=<id>` (`src/components/plan/PlanView.tsx:359-370`), labelled "Start drill", or "Continue session" on the next drill of a half-done session (`:183-189`). `/session` moves the requested drill to the front and the rest follows (`src/app/session/page.tsx:93-96`). So tapping it on drill 2 runs drill 2 first, then drill 1, as one session.

**That path has a wrong label today.** In `GuidedSession`, "next" is the first unlogged drill *after* the current one in plan order (`GuidedSession.tsx:138-139`). With drill 2 first there is none, so its log button reads "Log and finish session" (`:450`) while drill 1 is still to come, and the brief shows no "Next:" line. Removing per-drill starts removes this bug.

**What goes when per-drill starts go:**

1. `?drill=` on `/session` is dead: `session/page.tsx:43` (the prop), `:94-96` (the reorder), and the docblock at `:37-38`. Remove them. If Q10's param is adopted, note that it is a different param on different routes (`/start`, `/plan`); keep the names from colliding in the reader's head by removing this one in the same phase.
2. A player can no longer do drill 2 first. It matters when the two drills need different things (for a player with a partner, the drop plan is one solo drill then one partner drill). Accepted by the locked design; listed so it is a known loss.
3. The plan loses its only signs of a half-done session: the "DUE TODAY" badge (`PlanView.tsx:319-323`), the "LOGGED · 7/10" badge (`:314-318`) and the "Continue session" label. The locked row is name + time + chevron. See Q8.
4. "Start session (always starts at drill 1)": `/session` with no param starts at the first drill **not logged today** (`session/page.tsx:93`). On a fresh day that is drill 1; on a half-done session it is drill 2, which is right. The locked wording is true for the normal case only.
5. The accent rule for the plan is simpler: one button instead of "primary on the next drill, secondary on the others" (`PlanView.tsx:186`). The open re-test rule stays: the banner takes the accent and Start session goes secondary (`plan/page.tsx:73-79`).

### (f) Where the post-sign-up destination is decided, and every path that changes

**The decision is one line:** `window.location.assign(reason === "session" ? "/session" : "/plan")` at `src/components/auth/SaveGate.tsx:253`, in `handleVerified`. `reason` is a prop (`:58,68`) set from `/start`'s `gateReason` state (`src/app/start/page.tsx:63,285`), which is `"session"` only when "Start session" opened the form (`:310` → `saveResult("session")` → `:226,238`).

**Every exit, today and after:**

| # | Path | Where | Today | After |
|---|---|---|---|---|
| 1 | Code typed on the save form | `SaveGate.tsx:205-254` (`how = "code"`) | `/session` or `/plan` | **`/home`** (with `?saved=1`, Q12) |
| 2 | Inline log-in on the save form | same (`how = "login"`) | `/session` or `/plan` | **`/home`** |
| 3 | Code screen notices a sign-in in another tab | same (`how = "elsewhere"`) | `/session` or `/plan` | **`/home`** |
| 4 | Pending line "Enter code" on the plan | `PlanView.tsx:404-411` → `start/page.tsx:312` (`saveResult("save")`) → code screen → row 1 | `/plan` | **`/home`** |
| 5 | Sign-up with email confirmation off (immediate session) | `SaveGate.tsx:151-165` | `/home?saved=1` | unchanged |
| 6 | Device claim fails after the code | `SaveGate.tsx:242-249` | `/home` | unchanged |
| 7 | Sign-up's rows expired | `SaveGate.tsx:225-229` | `/home?expired=1` | unchanged |
| 8 | Signed-in retake taps a button on `/start` | `start/page.tsx:212-218` | `/session` or `/plan` | "Start session" is gone; "Save my plan" → `/plan` today. Whether it follows to `/home` is Q13 |
| 9 | `/start` loads with a session and a device result | `start/page.tsx:95-136` | `/home?saved=1` or `/home` | unchanged |
| 10 | Emailed link, `/auth/confirm` | `src/app/auth/confirm/route.ts:51-64`; the template's link carries `next=/home`; `afterClaimPath` (`src/lib/auth-redirect.ts:55-59`) | `/home?saved=1` after a claim | unchanged. Already Home, so the code and the link now land on the same screen |
| 11 | Old-style link, `/auth/callback` | `src/app/auth/callback/route.ts:22-34` | `/home` (+ flag) | unchanged |
| 12 | `emailRedirectTo` values | `SaveGate.tsx:113`, `src/lib/signup-code.ts:30`, `src/app/auth/actions.ts:150` | `/auth/callback?next=/home` | unchanged |
| 13 | `/login`'s code screen | `src/app/login/LoginScreen.tsx:83-98` | `afterClaimPath(claim, next)`, `/home` by default | unchanged |

**What is deleted with it:** the `reason` prop and its copy branch (`SaveGate.tsx:58,68,316-318`); `gateReason` (`start/page.tsx:63,190,226,238,285`); the `"session"` half of `saving` and `saveFailed` (`start/page.tsx:65-66,200`, `PlanView.tsx:29-30`); `onStartSession` (`PlanView.tsx:32,196-206`, `start/page.tsx:310`); the docblocks that describe two buttons (`start/page.tsx:37-48`, `SaveGate.tsx:32-51`, `PlanView.tsx:60-67`).

**The claim guard is untouched.** `claimIds` and its check are in `src/lib/persistence.ts:298-312` (`assertPendingBelongsToCaller` at `:265-271`). Nothing in batch D needs to edit `persistence.ts`. The two explicit-choice callers stay exactly as they are: `SaveGate.tsx:159` and `:241`. The only edits near them are the destination string at `:253` and the removal of `reason`; `handleVerified`'s order (metadata claim, drop the note on an explicit choice, device claim, then go) must not change. The reviewer pass for that phase checks that `git diff main -- src/lib/persistence.ts src/lib/claim-signup.ts src/lib/signup-pending.ts` is empty.

### (g) How "this week" is computed, and the last-day case

**Week:** Monday 00:00 UTC to the next Monday (`startOfWeekUTC`, `src/lib/drill-sessions.ts:18-26`). `getWeeklyProgress` (`:195-211`) reads this plan's rows since then and counts sessions with `countSessions` (`src/lib/session-plan.ts:86-124`): a session is every drill on the plan logged in one sitting. The total is `SESSIONS_PER_WEEK = 2` (`session-plan.ts:28`). Home, Plan and the recap all read this one function.

**Today:** "done today" is the current sitting, from `startOfSittingUTC` (`drill-sessions.ts:40-42`): midnight UTC, or six hours back, whichever is earlier. A drill can be logged once per UTC day per plan (`recordDrillSession`, `:77-94`), so **a second session on the same UTC day is impossible**.

**The gap:** when today is the last UTC day of the week (Sunday UTC) and the player finishes their first session of the week, no other day is left. All three screens still tell them there is one:

- recap: "Next session / Any day but today." (`GuidedSession.tsx:484-485`);
- plan: "Next session: any other day this week (1 to go)." (`PlanView.tsx:161`);
- Home: "1 more session this week. Pick any other day." (`home/page.tsx:119,122`).

The locked plan line "Today's session complete. 1 to go this week." has the same problem on that day. (UTC Sunday ends at 7pm Eastern, so for US players this is Sunday daytime.)

**Recommended lines (need KC review, Q9):** one pure helper, `weekStatus(now, weekly, todayDone)`, used by all three screens, with `now` as a parameter so the Sunday case can be checked without waiting for a Sunday.

| State | Session complete (main line, then support) | Plan status line |
|---|---|---|
| Done today, 1 of 2, another day left | "1 of 2 sessions this week." · "Next session: any day but today." | "Today's session complete. 1 to go this week." (locked) |
| Done today, 1 of 2, **last day of the week** | "1 of 2 sessions this week." · "This week ends today. Next week's sessions open Monday, Nov 16." | "Today's session complete. Next week's sessions open Monday." |
| Done today, 2 of 2 | "2 of 2 sessions this week." · "That's the week. Next sessions open Monday, Nov 16." | "Today's session complete. Both sessions done this week." |
| 2 of 2, re-test opens before Monday | "2 of 2 sessions this week." · "Your re-test opens Nov 14." | same as above |
| 2 of 2 earlier this week, nothing today | (not reached; `/session` shows "You're done for the week.", `session/page.tsx:112-135`) | "Both sessions done this week. Next week's open Monday." No button |
| Re-test open | week line, then the re-test block, "Back to my plan" secondary (as now, `GuidedSession.tsx:507-514`) | banner above; Start session secondary (as now) |

"Monday, Nov 16" is the existing `nextWeek` string (`session/page.tsx:177,185`). The check for "last day" is `startOfTodayUTC + 1 day >= next week's start`.

### (h) The real cadence of session reminders

- **Schedule:** one cron run a day at 18:00 UTC (`vercel.json:3-6`), route `src/app/api/cron/drill-reminders/route.ts`.
- **Who gets one on a given day** (`src/lib/reminders.ts:135-204`): `drill_reminder_enabled` is on and the profile has an email (`:61-65`); their newest plan is not completed or abandoned (`:137`); **nothing at all was logged today** (`:160`, any one drill is enough to skip); **fewer than two full sessions this week** (`:166-174`); and the re-test date has not passed (`:145-149`).
- **When they stop:** after the plan's re-test date. On the date itself the re-test email goes instead, unless re-test reminders are off, in which case the session reminder still goes that day (`:146`). After a re-test the new plan starts them again.
- **So:** at most one email a day, on every day the player has not logged, until both of the week's sessions are done, then again from Monday. A player who never logs gets one every day for three weeks, about 21.
- **The label today:** "Email me while a session is still due" (`src/app/settings/page.tsx:204`, and the toggle's `aria-label`, `src/components/settings/DrillReminderToggle.tsx:29`). It does not say daily and does not say when they stop.
- **What the rest of the product says:** the consent line, "We'll email you session reminders while your plan is active; turn them off anytime." (`src/components/legal/ConsentLine.tsx:9-10`, words locked); Privacy, "Session reminders are on by default while your plan is active, and they stop after your re-test date." (`src/app/privacy/page.tsx:126-127`). Both stay true.
- **Recommended label (Q20):** "Email me once a day while a session is left this week. Stops after my re-test date." Decision 9: the label states the cadence as it is today. Changing the cadence is undecided and is not in the phases; if it changes later, this label changes with it.

### (i) Where diagrams are authored, and Speed-Up Defense

**All in one file:** `src/components/session/ShotDemo.tsx`. Four hand-written SVG diagrams in `DEMOS` (`:200-318`), one per skill: `drop` (`:203-230`), `reset` (`:237-266`), `dink` (`:270-291`), `net_defense` (`:295-317`). Shared parts: ground and net (`:65-72`), `KitchenBand`, `Tick`, `Target`, `CourtLabel` (`:106-141`), the animated ball (`:157-183`, SMIL), and a static reduced-motion state (`:92-98,158-160`).

**Was a Speed-Up Defense diagram ever written? Yes.** `DEMOS.net_defense` is it ("Side view of a speed-up block", `ShotDemo.tsx:297-298`), there since the first version of the file (`eea00a1`). It shows today for the **partner** version of Speed-Up Defense, and for Hands Battle, which shares it.

**Why a player sees none:** the **solo** version of Speed-Up Defense is a wall drill (`drills.ts:169-177`), and wall drills were deliberately hidden in `807fc3d` ("ShotDemo hidden for wall drills", the `setup === "Wall"` line at `ShotDemo.tsx:53`) because the court picture with a net was wrong for a wall. No wall diagram has ever been drawn. Every player who did not pick the first of the four answers to the partner question gets the solo versions (`roadmap.ts:79-81`).

**The stale comment:** `drill-shot.ts:16-18` says only "drop" has a built demo. All four have had one since `eea00a1`.

**What "every drill gets a diagram" needs (decision 4).** Five prescribed versions show nothing today (table in (a), rows 3, 8, 10, 12, 14). They get **one shared wall template with per-drill labels**. The partner version of Speed-Up Defense keeps its existing court diagram, and so do the other court versions.

**The template:** the same visual language as the court diagrams (muted lines, one optic ball on a dotted path, mono labels under the ground line). A wall at one side labelled WALL, a tick where the player stands, one ball path to the wall and back, an optional height line on the wall, and two label slots: where to stand and what the return should do.

**Proposed labels (KC review; each is three words or fewer, from the drill's own description):**

| Version | Stand | Return | Line on the wall |
|---|---|---|---|
| Wall Reset (`reset_wall`) | 7–8 FT | KNEE HEIGHT | none |
| Speed-Up Defense, solo | 6–7 FT | LOW AND SOFT | none |
| Wall Counters (`hands_battle` solo) | 4–5 FT | NO BOUNCE | none |
| Wall Dinking (`dink_50` solo) | KITCHEN DISTANCE | NET HEIGHT | at net height |
| Attack Gate Drill, solo | (the description gives no distance) | ABOVE TAPE: FIRM | TAPE · 35 IN |

**What one template gives up:** one ball path for five drills, so the picture cannot show the difference between a volley with no bounce, a soft block and a dink. The labels carry it. Accepted with the decision; noted so nobody expects five different animations.

The locked list named three of the five wall versions. Wall Dinking and the solo Attack Gate Drill are in the same position and are covered by the same template. Two court pictures are reused for a solo version they do not quite fit (rows 2 and 6 in (a)); they are left as they are.

### (j) Does the 5-beat reveal show the Readiness score?

**Yes.** Beat 5 is `ReadinessBeat` → `ReadinessReading` (`src/components/diagnosis/Reveal.tsx:305-398`): the eyebrow "Readiness", the number at 96px with "/100", the bar, "A score from your answers, not a DUPR estimate." and "{n} is your baseline from these answers. The plan starts on {skill}, and the re-test in three weeks shows what moved." The first run plays all five beats (`FIRST_RUN`, `Reveal.tsx:10`).

So an anonymous player still sees the score once before the plan, and again through "Replay your diagnosis", which replays all five (`start/page.tsx:313`).

After sign-up it is a different story. Replay is `/start` only. A re-test's new-focus reveal plays three beats and skips readiness (`src/components/retest/RetestReveal.tsx:19`). See the next section.

### Progress before the first re-test (locked 2026-11-11)

**Locked order:** "Progress" title → hero: "SESSIONS DONE", "n of 6", a row of 6 plain segments (completed ones in optic, not grouped by week) → READINESS row "45 /100" with "A score from your answers, not a DUPR estimate." → RE-TEST row "{date} · in {n} days" with one sentence, the same for everyone (decision 6): "Your re-test gives you a new score to compare with this one."

**Locked removals:** the large date, "Into the plan · Day 1", the separate "Week 1 of 3", "This is the day you find out if your third-shot drop moved.", and the dot-and-line graphic.

**Subscribers** before their first re-test get the same top block, then RE-TEST HISTORY and "Weeks with both sessions" from batch C, unchanged. Their batch C READINESS section is dropped (decision 6): the top block's READINESS and RE-TEST rows say what it said, and the dot-and-line graphic goes with it. Progress after the first re-test is unchanged.

**What decides the state:** `hasCompletedRetest` (`src/lib/retest-gate.ts:46-55`): the player owns a plan a re-test made. Until then Progress is "Day One" for every tier (`src/app/(app)/progress/page.tsx:94-122`).

**Where each locked removal is today** (`src/components/progress/ProgressView.tsx`): the large date `:118-120`; "IN 13 DAYS · WEEK 1 OF 3" `:121-126`; "This is the day you find out if {skill} moved." `:127-129`; "INTO THE PLAN / Day 8" `:148`; the dot-and-line graphic `BaselineMark` `:185-192`, used on the free screen at `:159` and **inside the subscriber's READINESS section at `:225`**.

**Where Readiness comes from:** the page already computes it. It selects `readiness, skill_scores` for every diagnosis (`progress/page.tsx:55`) and runs `readinessOfRow` on each (`:76`). The baseline is the latest diagnosis's number (`diags[diags.length - 1]`, the one this plan was built from, `:95-97`). One new field on the `day-one` view data (`ProgressView.tsx:26-51`), no new query.

**Design-rule notes for the build** (not open questions, existing rules applied):

- The segments are this screen's one accent. While the re-test is open, the re-test block at the top holds the accent (`ProgressView.tsx:84-86`), so lit segments go neutral, as the paid chart does (`ProgressView.tsx:265`). With nothing completed, nothing is optic.
- "of 6" and "/100" drop to `ink-3` (`DESIGN.md:330`); `tabular-nums` on both numbers.
- The segments are decoration for "n of 6"; hide them from screen readers so the count is read once.

#### (l) How sessions count toward the plan, and what "n of 6" should show

**What a session is:** every drill on the plan logged in one sitting; one drill alone counts as nothing (`countSessions`, `src/lib/session-plan.ts:86-124`).

**Nothing in the code ties sessions to "the plan's six" today.** There is no column and no constant for it. Six is `weeksTarget` (3: `src/lib/roadmap.ts:108`, or derived from the dates in `src/lib/plan-timeline.ts:33`) times `SESSIONS_PER_WEEK` (2: `session-plan.ts:28`).

**What "SESSIONS DONE" counts today: every session the player has ever completed, on every plan.** `getTotalSessions` reads all of the caller's `drill_sessions` rows with no plan filter and no date bound (`src/lib/drill-sessions.ts:218-227`), called at `progress/page.tsx:88`. Before the first re-test that equals this plan's count in the usual case. It differs after a signed-in retake: the retake makes a new plan, and the old plan's sessions would be counted toward the new plan's six. Decided (decision 6): "n of 6" counts the current plan's sessions only, the same query with the plan's id.

**Can a week hold more than 2?**

- In the data, yes. The only limit is one log per drill per UTC day per plan (`recordDrillSession`, `drill-sessions.ts:77-94`, and the unique index in `20260717194800_drill_session_dedup.sql`). The logging action has no weekly check (`src/app/(app)/plan/actions.ts:35-64`). So seven sessions in a week are possible for anyone calling the action directly.
- Through the app's own buttons, no. Home's button is disabled once the week's two are done (`TodaySession.tsx:19,123-131`), and `/session` shows "You're done for the week." (`src/app/session/page.tsx:112-135`).

**But the plan can still hold more than 6, through those same buttons.** The cap is per calendar week, Monday to Sunday UTC (`drill-sessions.ts:18-26`). The plan is 21 days from the moment it is made (`src/lib/persistence.ts:122-124`). A plan started on any day except Monday touches four calendar weeks. Example: made Wednesday Nov 11, re-test Dec 2. Nov 11–15: 2. Nov 16–22: 2. Nov 23–29: 2. Nov 30–Dec 1: 2. That is 8 before the re-test date. Sessions also stay open after the re-test date if the player has not taken the re-test (nothing in `/session` checks it), so the count can keep rising.

**Do missed sessions leave the total at 6?** Yes. Nothing is carried over or subtracted: the weekly counter simply starts again on Monday (`getWeeklyProgress`, `drill-sessions.ts:195-211`). The total is the plan's target, not what is still possible, so a player who misses a week reaches the re-test at, say, 4 of 6. They can catch up only as far as the two-a-week cap allows.

**What "n of 6" shows** (decision 6):

| Case | Show |
|---|---|
| Normal | Sessions completed on the current plan, "3 of 6", three segments lit from the left |
| One of the two drills logged today | Not counted until the second is logged (the session rule above) |
| Missed sessions, re-test date arrives | The true count, "4 of 6", two segments unlit. No line about what was missed |
| More than 6 completed | "6 of 6", all six lit. Never "7 of 6" |
| Signed-in retake before any re-test (a new plan) | Starts again at "0 of 6": this plan's sessions only |
| Plan with no re-test date | Still "n of 6" |
| Re-test open | Count unchanged; lit segments neutral (the re-test block holds the accent) |

The 6 should come from the same weeks value the plan screen's PLAN row uses ("3 weeks · 2 sessions a week"), so the two screens cannot disagree.

Known and unchanged: "Week 2 of 3" on Home counts 7-day blocks from the plan's start (`plan-timeline.ts:34`), while "this week's sessions" uses calendar weeks. With the separate "Week 1 of 3" leaving Progress, this screen no longer shows the mismatch.

#### (m) What the free screen is sent before the first re-test

**Confirmed for today's code, and it holds for the locked design if two rules are kept.**

**Why nothing leaks by accident:** `ProgressView` and everything it renders are server components. No file in `src/components/progress/`, nor `ui/locked-card.tsx`, nor `retest/RetestOpen.tsx`, has `"use client"`. So the browser receives rendered markup only; no data object is serialized to it. What a free player is sent is exactly what the `day-one` branch draws.

**What the `day-one` branch builds** (`progress/page.tsx:103-122`): the re-test date label, days until it, week number, weeks target, days elapsed; the skill phrase; the session count; the number of diagnoses (`readingCount`, a count used only to choose "second" or "next"); and the weekly streak, which is `null` unless the player is a subscriber (`:121`).

**What is never built in that branch:** the readiness series (`buildReadinessSeries`, `:167`), the re-test history rows (`buildHistoryRows`, `:173`), and the logged-session series (`getScoredSessionsByDrill` and `pickSessionSeries`, `:150-163`). All three sit in the `full` branch (`:137-175`), reached only by a subscriber with a completed re-test. The page does query every diagnosis with its readiness on the server in every state (`:53-57`), but those rows are not handed to the view.

**After the change, a free player before the first re-test is sent:** the session count (this plan's, one integer), the baseline readiness (one integer, the latest diagnosis's), and the re-test date and days. Nothing else. After a signed-in retake there are two diagnoses; only the latest one's number is sent, not the earlier one, so no history can be read from it. With one sentence for everyone (decision 6), the number of diagnoses (`readingCount`) is no longer needed in this state and leaves the data too.

**The baseline number is free.** The plan screen shows it to everyone today with no tier check (`src/app/(app)/plan/page.tsx:96`), the reveal shows it before sign-up, and `PRODUCT.md:37-38` lists the current number as free. No tier check is added (hard rule 8).

**The two rules for the build:**

1. Pass the one number to the view (`baselineReadiness`), never the `diags` or `plans` arrays.
2. Keep `ProgressView` a server component. If a later change makes any part of it a client component, its props are serialized to the browser, and rule 1 is then the only protection.

**How the phase proves it** (as batch C did): a free test user with two diagnoses of different readiness and scored sessions on both drills. Fetch `/progress` as HTML and as the RSC payload. Assert the earlier diagnosis's number, any per-drill result, "Readiness now", "Since start", the history labels ("Baseline", "Full re-test", "Mid-plan check"), "Logged sessions", `/paywall`, "Unlock" and "Upgrade" are all absent.

#### (n) What else reads Readiness from the plan screen

**In code, nothing.** The plan screen's readiness has exactly two feeders and no other consumer:

- `/plan`: `src/app/(app)/plan/page.tsx:96` (`readinessOfRow(diagnosis)`), with its import at `:10` and the `readiness, skill_scores` columns in the select at `:27`. All three go once `PlanView` stops taking the prop; the query still needs `bottleneck` and `assessment_id`.
- `/start`: `src/app/start/page.tsx:301` (`diagnosis.readiness`).
- The prop and its block: `PlanView.tsx:76,89,231-246`, and the docblock at `:59`.

**Checked and unaffected:**

- **Home** does not read readiness at all: its diagnosis select is `id, bottleneck, assessment_id, created_at` (`src/app/(app)/home/page.tsx:37-43`).
- **Emails**: neither reminder mentions readiness (`src/lib/email.ts:60-99`).
- **The reveal** takes it from the engine (`Reveal.tsx:305-398`). Its closing line, "the re-test in three weeks shows what moved", agrees with the new RE-TEST sentence.
- **The re-test result and the delta screen** compute their own from stored skill scores.
- **Landing**: "Your current readiness" in the free list (`src/components/marketing/sections.tsx:389`) and "roll up into one readiness score" (`:256`) stay true; arguably truer, since the number is now on Progress from day one.
- **Terms** (`src/app/terms/page.tsx:50`), **paywall** (`PaywallView.tsx:31`), **checkout success** (`paywall/success/page.tsx:98`), **delete account** (`settings/delete/page.tsx:61`): none says where the number is shown.

**Needs updating when it moves** (wording and comments only):

| Where | Says | Change |
|---|---|---|
| `Design/DESIGN_SYSTEM.md:290-296` | Progress, Day One: large date, strip, one-point line, subscriber variant | Rewrite to the locked order |
| `DESIGN.md:331` | "Progress's readiness-now (72) and Day One re-test date (56) are full Metrics" | The 56px date is gone; name the new hero and the READINESS row's size |
| `PRODUCT.md:38` | Free users see their current readiness and "+N since start" on Progress | Split it: the baseline from day one; "+N since start" after the first re-test |
| `docs/STATUS.md:13` | Phase B: "readiness moved to the plan screen" | Superseded; say so in the batch D entry |
| `src/components/marketing/sections.tsx:374-376` (comment) | Progress shows the current readiness "to everyone once there is a re-test" | Now before one too |
| `progress/page.tsx:30-41`, `ProgressView.tsx:96-101,194-199` (comments) | Describe the old Day One | Rewrite |

### (k) Lines that go stale

**`DESIGN.md`**

| Line | Says | Why stale |
|---|---|---|
| 286, 435 | Nothing is centered except the reveal | Decision 7: forms may center vertically at 768px and wider, top-aligned below that. Amend in the docs phase |
| 338 | Headline, complete: "the session recap's next step ("Any day but today.", with "Session logged." above it at 20px…)" | Item 6: the main line becomes "1 of 2 sessions this week." |
| 341-342 | Every sentence is 16px; Small (15px) is a single line that is not a sentence | Decision 7: legal fine print under a button may be 14px. Amend in the docs phase |
| 352 | Uppercase-Mono limit: about three words | The new "mono label/value rows": values like "3 weeks · 2 sessions a week" exceed it if set in mono (Q6) |
| 331 | "Day One re-test date (56)" is a full Metric | The 56px date is removed; see (n) |
| 404-405 | Inputs: no focus treatment beyond the ring | Add the autofill rule (flat `surface`, `ink` text, no `box-shadow`) |
| 393 | Disabled/Done example "Session logged today · done" | Already stale; Home's done states are worded differently (`TodaySession.tsx:129`) |
| 401 | Accent-tinted card "used for the in-game-rule card" | Already stale since batch 2 Phase B (no cards on the plan). Fix while here |

**`Design/DESIGN_SYSTEM.md`**

| Line | Says | Why stale |
|---|---|---|
| 157 | Button caption is mono 11px, centered | The "NEXT:" line under the button is centered today (`GuidedSession.tsx:265`); left-align it in the new layout and fix this line |
| 271-275 | Home: bottleneck card, Readiness card, "2/3" card, "Start today's session" + "18 MIN" | Already stale since Phase B. Rewrite with item 5: gear, drill rows with SOLO / PARTNER, the counter's label |
| 277-282 | My Plan: task cards with checkboxes, IN-GAME RULE card, RE-TEST METRIC card | Already stale. Rewrite to the locked PlanView order |
| 290-296 | Progress Day One: large date, readings strip, one-point line | Locked 2026-11-11: rewrite to the new order (table in (n)) |
| 323 | Auth screens: "never vertically centered" | Decision 7: centered at 768px and wider, top-aligned below |
| 324 | "The plan's Start session, Save my plan and pending line follow the same rule." | No Start session on `/start` |
| 327 | Save Gate top row: a small text link "Log in" | "Already have an account? Log in" |
| 328 | Opened from "Start session": "Sessions need a free account…" | Variant removed |
| 330 | consent line → "Not now" | "Back to my plan"; consent line smaller |
| 332 | "no bottom "Already have an account?" line" | The wording returns, at the top |
| 342 | Inline log-in ends with "Back" | "Back to save your plan" |
| 350 | Log in: Email input → Password input (with mono "FORGOT?" inline) | CredentialFields block, "Forgot password?" under it |
| 352 | Footer, left-aligned: "New here? Take the assessment" | Directly under the form |
| 361 | NOTIFICATIONS lists only the re-test toggle | Add the session-reminder label |
| (none) | There is no section for the guided session's screens | Add "Drill page" and "Session complete" |

**`docs/STATUS.md`** (the entries are dated history; do not rewrite them. Add a "UX batch D" entry that names what it supersedes, and fix the Outstanding items.)

| Line | Statement superseded |
|---|---|
| 13 | Phase B: "readiness moved to the plan screen"; "every Start goes secondary" |
| 14 | Phase C: the recap's "main element is what comes next" |
| 15 | Fix round: the save form's line from "Start session"; "wall drills show no court diagram" |
| 16 | "Start session" and "Save my plan" both wait on the save |
| 19 | Signed-in retake: both buttons, then `/plan` or `/session` |
| 24 | Sign-up Phase 1: goes on to `/session` or `/plan` |
| 34 | Phase 3: "Log in" top right, "Not now" |
| 41 | "Enter code" from the plan always finishes on `/plan` |
| 48, 136 | Owner decision: the "Start session" line on the save form |
| 188 | Outstanding "M7, M9: simplify targets on brief and plan": M7 is done by item 2 |

**Also stale, outside the three files asked about:** `CLAUDE.md:32` (nothing centered) and `:34` (sentences 16px), both amended by decision 7; `.claude/skills/verify/SKILL.md:86-98` (the 16px check needs an exemption for legal fine print, or it reports the consent line on every later run); `PRODUCT.md:38` (free users see readiness and "+N since start" on Progress; see (n)); code comments at `drill-shot.ts:16-18`, `PlanView.tsx:51-68`, `start/page.tsx:29-49`, `SaveGate.tsx:25-52`, `session/page.tsx:26-39`, `DrillBrief.tsx:3-12`, `TodaySession.tsx:23-39`.

---

## 2. Copy table

Every string that changes. **Locked** = wording fixed by the request. **KC** = needs KC's review (new wording from me, or a locked intent with no wording). Proposed text is marked "proposed".

### Plan (`src/components/plan/PlanView.tsx`)

| # | Where | Old | New | Status |
|---|---|---|---|---|
| 1 | `:128` (`/start`) | `{verdict clause}` You said: “{answer}.” | removed | Locked |
| 2 | `:131-133` | "2 sessions a week, 25 minutes each. Each session is both drills, back to back." | rows: PLAN "3 weeks · 2 sessions a week" · SESSION "25 min · both drills" (30 for the drop) | Locked; minutes computed from the drills (decision 1) |
| 3 | `:107-108` | "Week 2 of 3 · Same drills each week. Beat your last numbers." / "3 weeks · Same drills each week. Beat your last numbers." | removed (the week number leaves `/plan`; Home keeps it) | Locked |
| 4 | `:150-153` | "THIS WEEK" … "1 OF 2 SESSIONS" (header above the drills) | row: THIS WEEK "1 of 2 sessions", signed in only | Locked |
| 5 | `:300` in `start/page.tsx`, `:89-95` in `plan/page.tsx` | re-test date beside "Re-test goal" | row: RE-TEST "Nov 29" / "Open now" / "In 3 weeks" (anonymous) | Locked |
| 6 | `:325-327` | "15 MIN · PARTNER" / "· WALL" / "· SOLO" | "15 MIN · PARTNER" or "15 MIN · SOLO" (wall reads SOLO; minutes per drill, 10 or 15) | Locked; wall → SOLO is Q7 |
| 7 | `:329` | the drill's `task` sentence under the name | removed | Locked |
| 8 | `:338` | "View instructions" / "Hide instructions" | removed (the whole row opens the drill page) | Locked |
| 9 | `:346-354` | fold-out: "When the timer ends", `{logProtocol} {counts}`, "Practice target 7 of 10" | removed from the plan | Locked |
| 10 | `:187` | "Start drill" / "Continue session" (per drill) | one button: "Start session" | Locked. Half-done session label is Q8 |
| 11 | `:316`, `:321` | "LOGGED · 7/10", "DUE TODAY" badges | not in the locked row | KC (Q8) |
| 12 | `:203` (`/start`) | "Start session" (optic) | removed | Locked |
| 13 | `:263` | "Save my plan" (secondary) | "Save my plan" (optic, the only action) | Locked |
| 14 | `:254` | "Your plan is saved on this device. A free account runs your sessions, keeps what you log, and opens your plan on any device." | "A free account keeps your plan and lets you start your sessions." | Locked |
| 15 | `:253` (signed-in retake) | "This plan isn't on your account yet. Saving it, or starting a session, makes it your current plan." | proposed: "This plan isn't on your account yet. Saving it makes it your current plan." | KC (the old line was owner-approved) |
| 16 | `:158-161` | "Today's session complete. Next session: any other day this week (1 to go)." | "Today's session complete. 1 to go this week." | Locked |
| 17 | `:160` | "Today's session complete. Both sessions done this week. Next week starts Monday." | proposed: "Today's session complete. Both sessions done this week." | KC |
| 18 | new | (last day of the week, 1 of 2) | proposed: "Today's session complete. Next week's sessions open Monday." | KC |
| 19 | new | (2 of 2 earlier this week, nothing today) | proposed: "Both sessions done this week. Next week's open Monday." | KC |
| 20 | `:213-216` | "In your games" + the stored two-sentence rule | "In your games" + one sentence | Label locked; sentences KC, drafts below |
| 21 | `:222-228` | "Re-test goal" + date + "You started at: “…”." + the stored goal | "Re-test goal" + one sentence | Label locked; sentences KC, drafts below |
| 22 | `:235-244` | "Readiness" · "42 /100" · "A score from your answers, not a DUPR estimate." | removed from the plan | Locked |

Drafts for rows 20 and 21 (all proposed, all KC, to be reviewed before the build). Decision 3: both lines render from code, so these apply to every plan, old and new. Today's text is at `src/lib/roadmap.ts:16-34,52-64`. There are eleven strings, not eight: four rules, three goals, and four third-shot goals (three starting ranges and the no-answer case).

| Skill | In your games, today | Proposed one sentence |
|---|---|---|
| Reset | "When you're caught mid-court, reset soft instead of attacking, even if you lose the point. You're trading this week's games for next month's level." | "When you're caught mid-court, reset soft instead of attacking, even if it costs the point." |
| Third-shot drop | "Commit to the drop on every third shot this week, even when it fails. You need the reps more than the wins right now." | "Hit the drop on every third shot this week, even when it fails." |
| Hands at the net | "When someone speeds up at you, your first job is to stay in the point, not counter-attack. Block first, look for offense second." | "When someone speeds up at you, block first and look for offense second." |
| Soft-game patience | "In every dink rally, wait for a ball that is above net height AND out in front before you speed up. Reset everything else, no exceptions." | "In every dink rally, speed up only on a ball above net height and out in front." |

| Skill | Re-test goal, today | Proposed one sentence |
|---|---|---|
| Reset | "Can you reset a hard ball at your feet from mid-court without it floating up? Count 10 attempts. Aim for 6+ clean." | "Reset 6 of 10 hard balls at your feet from mid-court without floating one up." |
| Hands at the net | "When someone speeds up at your body, can you block it back and stay in the point? Aim for 6 of 10." | "Block back 6 of 10 speed-ups at your body and stay in the point." |
| Soft-game patience | "In your next 3 games, count how many times you speed up on a ball that wasn't actually attackable. Aim for fewer than 3 per game." | "Across your next 3 games, speed up on a ball that wasn't attackable fewer than 3 times a game." |
| Third-shot drop, started 0 or 1–3 | "Out of 10 drops in a real game, count how many land soft without getting attacked. You started at 1–3. Target: 5+." | "Land 5 or more of 10 drops soft in a real game, up from 1–3." |
| Third-shot drop, started 4–6 | "… You started at 4–6. Target: 7+." | "Land 7 or more of 10 drops soft in a real game, up from 4–6." |
| Third-shot drop, started 7–10 | "… You started at 7–10. Hold 7+ under game pressure." | "Hold 7 or more of 10 drops soft under game pressure." |
| Third-shot drop, answer unreadable | "… Target: 5+." | "Land 5 or more of 10 drops soft in a real game." |

Each draft keeps the number the re-test can register; none adds a claim. They still need the rule 5 trace when built, since "up from 1–3" quotes an answer.

### Drill page (`src/components/session/GuidedSession.tsx`, `DrillBrief.tsx`)

| # | Where | Old | New | Status |
|---|---|---|---|---|
| 23 | `GuidedSession.tsx:242` | "DRILL 1 OF 2 · 15 MIN · PARTNER" | "DRILL 1 OF 2" | Locked |
| 24 | `DrillBrief.tsx:35-37` | the drill's `description` (2 to 3 sentences) | one instruction sentence (the drill's `task`) | Locked as "one sentence"; which field is Q2 |
| 25 | `DrillBrief.tsx:45-51` | card "WHEN THE TIMER ENDS" · "**Log your last set of 10.** A reset counts if…" | removed; rows COUNTS and LOG carry it | Locked |
| 26 | `DrillBrief.tsx:53-55` | "PRACTICE TARGET 7 OF 10" | row TARGET "7 of 10" | Locked |
| 27 | `DrillBrief.tsx:58-60` | "The re-test goal is a separate number, on your plan." | removed | Locked |
| 28 | new | | row labels TIME, WHO, COUNTS, LOG, TARGET | Locked. Values: Q6, Q7; LOG wording in the table below |
| 29 | new | | "When the timer ends, finish the {set / rep / exchange / rally} you're on and log it." | Form locked (decision 5); the word per version is KC, table below |
| 30 | `GuidedSession.tsx:262` | "Begin" / "Begin drill 2" | in a session: "Begin". From a plan row with a session available: "Start session". Done today or not signed in: no button | Locked |
| 31 | `GuidedSession.tsx:266` | "NEXT: LIVE DROP PRACTICE · 15 MIN" (centered) | same words, left-aligned | Locked |

### Timer and log (`GuidedSession.tsx`)

| # | Where | Old | New | Status |
|---|---|---|---|---|
| 32 | `:346-347` | "{Log your last set of 10.} When the clock hits zero, stop where you are and log it. Falling short of 7 of 10 still counts." | the same rule sentence as row 29, with the drill's unit word | Form locked (decision 5). Whether "Falling short of 7 of 10 still counts." stays is Q5 |
| 33 | `:415` | under the question: `{counts}` only | adds the scoring rule (locked: "logging") | Locked; placement and tense are Q4 |

### Scoring rule word and LOG row, per drill version (decision 5; all proposed, all KC)

The rule: "When the timer ends, finish the {word} you're on and log it." The LOG row replaces `logProtocol` (`src/lib/drills.ts`, line given per row); the row's label says LOG, so the value drops the verb.

| # | Version | `drills.ts` | Rule word | LOG row, old → new |
|---|---|---|---|---|
| 63 | Reset Ladder, partner | `:75` | set | "Log your last set of 10." → "Your last set of 10 resets" |
| 64 | Reset Ladder, solo | inherits `:75` | set | "Log your last set of 10." → "Your last set of 10 resets" |
| 65 | Wall Reset | `:100` | set | "Log your last set of 10." → "Your last set of 10 resets" |
| 66 | Basket Drop Drill | `:117` | set | "Log your last set of 10." → "Your last set of 10 drops" |
| 67 | Live Drop Practice, partner | `:132` | set | "Log your last set of 10." → "Your last set of 10 drops" |
| 68 | Drop and Follow (solo) | `:146` | rep | "Log your last 10 reps." → "Your last 10 reps" |
| 69 | Speed-Up Defense, partner | `:161` | set | "Log the last 10 balls of your final set." → "The last 10 balls of your final set" |
| 70 | Speed-Up Defense, solo | `:174` | set | "Log your last set of 10." → "Your last set of 10 blocks" |
| 71 | Hands Battle, partner | `:187` | exchange | "Log your last 10 exchanges." → "Your last 10 exchanges" |
| 72 | Wall Counters (solo) | `:199` | rally | "Log your last 10 volleys." → "Your last 10 volleys" |
| 73 | 50-Dink Rally, partner | `:215` | rally | "Log your last 10 rallies." → "Your last 10 rallies" |
| 74 | Wall Dinking (solo) | `:227` | rally | "Log your last 10 dinks." → "Your last 10 dinks" |
| 75 | Attack Gate Drill, partner | `:240` | rally | "Log your last 10 attackable balls." → "Your last 10 attackable balls" |
| 76 | Attack Gate Drill, solo | `:254` | rally | "Log your last 10 balls." → "Your last 10 balls" |

Two things for KC to check in this table. In rows 72, 74, 75 and 76 the rule word ("rally") is not the thing that is logged (volleys, dinks, balls): the player finishes the rally in progress, then logs the last ten. And "resets", "drops" and "blocks" after "set of 10" are my additions, so the row reads on its own.

### Wall diagram labels (decision 4; all proposed, all KC)

| # | Version | Labels |
|---|---|---|
| 77 | Wall Reset | WALL · 7–8 FT · KNEE HEIGHT |
| 78 | Speed-Up Defense, solo | WALL · 6–7 FT · LOW AND SOFT |
| 79 | Wall Counters | WALL · 4–5 FT · NO BOUNCE |
| 80 | Wall Dinking | WALL · KITCHEN DISTANCE · NET HEIGHT |
| 81 | Attack Gate Drill, solo | WALL · TAPE · 35 IN · ABOVE TAPE: FIRM |

### Save form, log-in (`SaveGate.tsx`, `InlineLogIn.tsx`, `LoginScreen.tsx`, `ConsentLine.tsx`)

| # | Where | Old | New | Status |
|---|---|---|---|---|
| 34 | `SaveGate.tsx:306` | "Log in" (top right) | "Already have an account? Log in" | Locked |
| 35 | `SaveGate.tsx:317` | "Sessions need a free account. Your plan and session numbers stay with you." | removed (the other variant stays) | Locked |
| 36 | `SaveGate.tsx:381` | "Not now" | "Back to my plan" | Locked |
| 37 | `ConsentLine.tsx:6-11` | 16px, under the button | same words, 14px, under the button (colour unchanged, `ink-2`) | Locked (decision 7) |
| 38 | `InlineLogIn.tsx:131` | "Back" | "Back to save your plan" | Locked |
| 39 | `LoginScreen.tsx:138-146,161-169` | hidden labels, placeholders "Email address", "Password" | the block's EMAIL / PASSWORD labels, placeholder "you@example.com", Show / Hide | Follows from the locked change |
| 40 | `LoginScreen.tsx:176-181` | "FORGOT?" (mono, inside the password row) | "Forgot password?" (link under the block) | Locked |
| 41 | `LoginScreen.tsx:215-220` | "New here? Take the assessment" (page bottom) | same words, directly under the form | Locked |

### Home (`src/app/(app)/home/page.tsx`, `src/components/home/TodaySession.tsx`)

| # | Where | Old | New | Status |
|---|---|---|---|---|
| 42 | `home/page.tsx:158-166` | icon: a circle with eight rays (reads as a sun) | a gear; `aria-label="Settings"` unchanged | Locked |
| 43 | `TodaySession.tsx:112` | "15 MIN" | "15 MIN · SOLO" / "15 MIN · PARTNER" | Locked |
| 44 | `TodaySession.tsx:73-91` | "0 OF 2" (+ screen-reader text " sessions this week") and two circles | "0 of 2 sessions this week"; the circles are removed | Locked (decision 2) |
| 45 | `home/page.tsx:184-185` | "Week 2 of 3 · Same drills each week. Beat your last numbers." | not in the locked list | KC (Q16) |
| 46 | `home/page.tsx:119,122` | "1 more session this week. Pick any other day." | unchanged on a normal day; on the last day of the week, proposed: "This week ends today. Next week's sessions open Monday, Nov 16." | KC (Q9) |

### Session complete (`GuidedSession.tsx:472-532`)

| # | Where | Old | New | Status |
|---|---|---|---|---|
| 47 | `:517-520` | label "NEXT SESSION", then at 28px "Any day but today." / "Monday, Nov 16." / "Nov 14." | main line at 28px: "1 of 2 sessions this week." | Locked |
| 48 | `:521-524` | "1 of 2 sessions this week." (+ " That's the week. Rest counts too.") as the supporting line | support, proposed: "Next session: any day but today." / "That's the week. Next sessions open Monday, Nov 16." / "Your re-test opens Nov 14." / last day: "This week ends today. Next week's sessions open Monday, Nov 16." | KC |
| 49 | `:494-496` | "Session logged." (20px) | proposed: removed; the eyebrow "SESSION COMPLETE" and the new main line say it | KC (Q19) |
| 50 | `:505` | a flexible gap between the results and the next step | removed; one group | Locked |

### Progress before the first re-test (`src/components/progress/ProgressView.tsx`)

| # | Where | Old | New | Status |
|---|---|---|---|---|
| 52 | `:147` | "SESSIONS DONE" · "4" (one cell of a two-cell strip) | hero: "SESSIONS DONE" · "4 of 6" · six segments. This plan's sessions; "6 of 6" past six | Locked (decision 6) |
| 53 | `:148` | "INTO THE PLAN" · "Day 8" | removed | Locked |
| 54 | `:115-120` | "FIRST RE-TEST" · "Nov 29" at 56px | row: RE-TEST "Nov 29 · in 13 days" ("in 1 day" for one) | Locked |
| 55 | `:121-126` | "IN 13 DAYS · WEEK 1 OF 3" | removed (the days move into row 54) | Locked |
| 56 | `:127-129` | "This is the day you find out if {skill} moved." | "Your re-test gives you a new score to compare with this one." | Locked (decision 6) |
| 57 | `:158-178` | the dot-and-line graphic + "One point so far: your baseline. Your first re-test on Nov 29 adds the second reading." | row: READINESS "45 /100" · "A score from your answers, not a DUPR estimate." | Locked |
| 58 | `:161-166` | after a signed-in retake: "Your first re-test on Nov 29 adds the next reading." | no variant: the same sentence as row 56 | Locked (decision 6) |
| 59 | `:134` | no re-test date: "Not scheduled" at 32px, nothing more | proposed: RE-TEST "Not scheduled", sentence kept | KC (Q26) |
| 60 | `:113`, `:163`, `:171` | re-test open: the date block is hidden; "Your re-test, open now, adds the second reading." | proposed: the RE-TEST row is hidden while the re-test block shows above | KC (Q26) |
| 61 | `:223-228` (subscribers) | "READINESS" · graphic · "Your second reading lands Nov 29." | removed | Locked (decision 6) |
| 62 | `:229-231` (subscribers) | "RE-TEST HISTORY" · "Your first entry lands Nov 29." and "Weeks with both sessions" | unchanged | Locked |

### Settings (`src/app/settings/page.tsx`, `DrillReminderToggle.tsx`)

| # | Where | Old | New | Status |
|---|---|---|---|---|
| 51 | `settings/page.tsx:204`, `DrillReminderToggle.tsx:29` | "Email me while a session is still due" | proposed: "Email me once a day while a session is left this week. Stops after my re-test date." | KC (Q20). States today's cadence (decision 9) |

---

## 3. Phases

Branch `ux-batch-d`, cut from `main`. One commit per phase, in this order. Every phase ends with: `npx tsc --noEmit`, `npm run lint`, `/verify` (375px and 1440px screenshots of every screen the phase touched, saved under `audit/screens/batch-d/`), any `/test-user` account deleted with its cleanup confirmed, a `reviewer` subagent pass on the phase's diff, the docs lines for that phase's screens updated, and `docs/STATUS.md`. Scratch routes and seed scripts live in the scratchpad and are never committed.

Nothing starts until the open questions marked "blocks" in section 4 are answered.

### Phase 1: wall diagrams and the SOLO / PARTNER helper

- `ShotDemo.tsx`: one wall template with per-drill labels for the five wall versions (decision 4); court versions keep their diagrams; remove the `setup === "Wall"` early return; fix the stale comment in `drill-shot.ts`.
- One helper for SOLO / PARTNER from `setup`.
- Nothing else moves: the diagrams appear on today's pre-drill screen and the plan's fold-out.
- **Check:** a scratch page that renders all 14 prescribed versions, animated and with reduced motion, at 375 and 1440. Each diagram read against its drill's description (distances, what the ball does). Safari check of the animation (SMIL) on the iOS Simulator. The landing's example drill is unchanged (it is a court drill).

### Phase 2: the drill page and the one scoring rule

- New presentational `DrillPage` (header, diagram, name, one sentence, rows, button by mode, NEXT line). `GuidedSession`'s brief step uses it with mode `begin`. `DrillBriefContent` goes, or becomes the part the landing shares.
- The scoring rule with each drill's unit word (decision 5): a `unit` field in `drills.ts`, the LOG row wording, on the pre-drill and timer screens; the log screen per Q4; "Falling short…" per Q5. "View instructions" stays on the timer.
- `session/page.tsx`: stop selecting and passing `retest_metric`.
- The landing's `SessionBriefReadout` follows the new layout: `ExampleTag` stays beside the example (hard rule 6), no new link (rule 7).
- **Check:** `/test-user`, a real guided session through both drills for one court skill and one wall skill: pre-drill, timer, log, at 375 and 1440. Landing "plan" section at both widths. Mono-label length and body-size results from `/verify`.

### Phase 3: Progress before the first re-test (locked 2026-11-11). Codex review

- `progress/page.tsx`: the `day-one` data carries the baseline readiness (latest diagnosis, one number) and this plan's session count; it drops the fields nothing draws any more (week number, days elapsed, the skill phrase, the count of diagnoses).
- `ProgressView.tsx`: the locked order (hero with six segments capped at 6, READINESS row, RE-TEST row and the one sentence); the removals, `BaselineMark` included; subscribers get the same top block, then RE-TEST HISTORY and "Weeks with both sessions" unchanged, without their old READINESS section. Stays a server component.
- A plan-scoped session count beside `getTotalSessions` in `drill-sessions.ts`.
- Ships before Phase 4, so no commit leaves the signed-in app without the readiness number.
- Touches free versus paid: this phase is marked for the Codex review.
- **Check:** `/test-user` accounts, free and subscriber (Stripe test Checkout, as in batch C), before a re-test, at 0, 3, 6 and 8 sessions (sessions on separate days are seeded with a scratch script, in the scratchpad). Also: one drill of two logged (count does not move); a signed-in retake (count restarts, sentence variant); the re-test open (one accent: the re-test block; segments neutral); a plan with no re-test date. 375 and 1440 for each. The payload check in (m) on the free account, HTML and RSC. After a re-test, free (locked) and subscriber (full) screens are compared with batch C's screenshots to confirm they did not change. Test users and Stripe test subscriptions cleaned up.

### Phase 4: PlanView rebuild, rows open the drill page, no Start session on `/start`

- `PlanView.tsx`: the locked order; mono rows; drill rows as whole-row links; one action slot; the week-status helper (pure, takes `now`).
- Rows open the drill page on `/start` and `/plan` (Q10): mode `none` when anonymous or done today, `start-session` when a session is available.
- `/start`: "Start session" removed, "Save my plan" optic. `start/page.tsx` loses `onStartSession`. The save form still sends the player to `/plan` in this commit; the destination changes in Phase 5.
- `/session`: remove the `?drill=` reorder.
- In your games and Re-test goal render from code (decision 3), from the plan's own diagnosis. No migration. KC has approved the eleven sentences before this phase starts.
- Remove what is now unused: `focusReason`, `retestStart` if dropped, the readiness prop.
- **Check:** `/start` anonymous at 375 and 1440: plan, each drill opened and closed (no network writes while doing so: read the network log), back gesture, reload on a drill, pending sign-up line. `/plan` with `/test-user` in each state: nothing today, half-done, done today 1 of 2, 2 of 2, re-test open (seed with a scratch script, as batch 2 did). The Sunday case through the helper with a fixed `now` (`npx tsx`, scratchpad). One accent per screen in every state. `npm run build` (the search-param boundary).

### Phase 5: sign-up lands on Home; save form copy

- `SaveGate.tsx`: `handleVerified` goes to `/home` (Q12); `reason` and its copy variant removed; "Not now" → "Back to my plan"; top-right link wording; consent line at 14px (decision 7).
- `start/page.tsx`: `gateReason` removed; `saving` and `saveFailed` collapse; the signed-in retake's destination (Q13) and line (copy row 15).
- `InlineLogIn.tsx`: "Back to save your plan".
- No edit to `persistence.ts`, `claim-signup.ts` or `signup-pending.ts`.
- **Check, with real sign-ups** (plus-tag test addresses, as in the `signup-otp` phases): code typed → `/home` with "Plan saved", 1/1/1 rows claimed, `pending_*` cleared, device cleared; the emailed link on a second browser → `/home?saved=1`; inline log-in with an existing account → `/home`, new result current; "Enter code" from the pending line → `/home`; wrong code stays put; "Back to my plan" from the form, the code screen and the log-in; a sign-in for another account in a second tab while a sign-up is pending still claims nothing (the batch's regression check on the claim guard); signed-in retake. 375 and 1440 on the form, its existing-account note, the code screen, the log-in.

### Phase 6: `/login` and the input fixes

- `LoginScreen.tsx` on `CredentialFields`. `CredentialFields` gains `name` attributes (the page posts a server action that reads `email` and `password` from the form, `auth/actions.ts:27-35`) and pass-through for `aria-invalid` and `aria-describedby` (the redirect-error rule, `DESIGN_SYSTEM.md:324`). "Forgot password?" under the block; "New here?" under the form; centered at `md` and up only.
- `globals.css`: the autofill rule, without `box-shadow` (hard rule 1 and `/verify` flag shadows). Use the long background-color transition or `background-clip: text` technique with `-webkit-text-fill-color`.
- `autoCapitalize="off"` and `autoCorrect="off"` on all four email inputs (decision 8): `CredentialFields.tsx:48`, `forgot-password/page.tsx:50`, `auth/link-error/page.tsx:70`, and `/login` through the block.
- **Check:** `/login` at 375 (top-aligned; primary button above a 300px keyboard, i.e. within 512px) and 768 and 1440 (centered); wrong password (error named by the fields); `?next=/settings` honoured; unconfirmed account → code screen; the "account deleted" notice. Autofill on the iOS Simulator's Safari and in Chrome. No further reproduction work on where the two were first seen (decision 8).

### Phase 7: Home

- Gear icon; SOLO / PARTNER on each drill row; the counter becomes "n of 2 sessions this week" and the two circles go (decision 2); the "Same drills each week" sentence (Q16); the last-day caption.
- Build notes for the counter: at six words it is body text at 16px, not a mono label, and it will not fit on one line beside "TODAY · 25 MINUTES, 2 DRILLS" at 375px, so it takes its own line. With the circles gone, the done states have no optic mark (`TodaySession.tsx:64,85`); nothing is accented then, which the One Accent Rule allows.
- **Check:** `/test-user` in the same states as Phase 4, 375 and 1440.

### Phase 8: session complete

- `SessionCompleteScreen`: main line, supporting line by state, results and next step as one group.
- **Check:** real guided sessions to reach 1 of 2 and 2 of 2; the re-test-open variant; the fresh-load path (`/session` when today is done, `session/page.tsx:102-108`) shows the identical screen; 375 and 1440.

### Phase 9: Settings label and the docs sweep

- The session-reminder label and the toggle's `aria-label`, stating today's cadence (decision 9). No change to who is emailed or when.
- `DESIGN.md`, `Design/DESIGN_SYSTEM.md` (every line in (k) not already fixed by its phase), `PRODUCT.md:38`, `docs/STATUS.md` entry and Outstanding items.
- The two rule amendments (decision 7), in `CLAUDE.md` (rules 1 and 3), `DESIGN.md`, `Design/DESIGN_SYSTEM.md:323` and the `/verify` skill: legal fine print under a button may be 14px; forms may center vertically at 768px and wider, top-aligned below that. Until this phase lands, `/verify` and the reviewer will report the 14px consent line (Phase 5) and the centered `/login` (Phase 6); those two findings are expected.
- **Check:** Settings at 375 and 1440 (the label wraps; the toggle stays aligned); a dry run of the reminder cron (`?dry=1`) to confirm nothing about who is emailed changed.

---

## 4. Open questions for KC

"Blocks" names the first phase that cannot start without the answer.

1. **In your games and Re-test goal.** Answered (decision 3): render from code, no migration. KC reviews the eleven drafts in the copy table before Phase 4.

2. **The drill page's one sentence.** Answered: `task`; the full description stays on the timer.

3. **The scoring rule's "set".** Answered (decision 5): each drill's own unit word. Proposed word and LOG row per version are copy rows 63 to 76, for KC's review before Phase 2.

4. **The rule on the logging screen.** Answered: pre-drill and timer screens only.

5. **"Falling short of 7 of 10 still counts."** Answered: kept, after the rule on the timer.

6. **Mono rows.** Answered: labels mono, values in the body font at 16px.

7. **Wall drills.** Answered: "SOLO · WALL" on plan and Home rows; "Solo, at a wall" on the drill page.

8. **Logged rows and the half-done button.** Answered: "TODAY · 7/10" in place of the time; "Continue session".

9. **Status lines.** Answered: the table in (g), with the final-week wording in the second-round block.

10. **How a plan row opens the drill page.** Answered: `?drill=` on `/start` and `/plan`.

11. **A start button on the drill page.** Answered: none. Opened from a plan row it is read-only, back arrow only.

12. **The code path's landing.** Answered: `/home?saved=1` when the claim went through.

13. **Signed-in retake.** Answered: "Save my plan" also lands on `/home`.

14. **Readiness before the first re-test.** Answered 2026-11-11: locked. Progress shows the baseline in a READINESS row. See "Progress before the first re-test" and Q23 to Q26.

15. **Home's "0 of 2".** Answered (decision 2): "n of 2 sessions this week", circles removed.

16. **Home's "Same drills each week…".** Answered: removed; "Week 2 of 3" stays.

17. **The consent line's size.** Answered (decision 7): 14px.

18. **Vertical centering at 768px and wider.** Answered: every auth form.

19. **"Session logged."** Answered: removed.

20. **The session-reminder label.** Answered: "Session reminders", with "One email a day while a session is left this week. Stops at your re-test." under it.

21. **Diagram scope.** Answered (decision 4): one wall template with per-drill labels for the five wall versions; court diagrams unchanged. The labels are copy rows 77 to 81.

22. **Where the capitalised email and yellow autofill were seen.** Closed (decision 8): add `autoCapitalize` off and `autoCorrect` off; no further work.

23. **"n of 6" past six.** Answered (decision 6): "6 of 6", all six lit.

24. **Which sessions "n of 6" counts.** Answered (decision 6): this plan's only.

25. **The subscriber's duplicate READINESS section.** Answered (decision 6): dropped.

26. **The RE-TEST row while open and with no date.** Answered: hidden while open; "Not scheduled" with the sentence kept.

---

## 5. Risks, and which phases need Codex

**Codex review** (CLAUDE.md: sign-up, claim or auth; engine, stories or readiness; a main screen rebuilt):

- **Phase 5** (sign-up entry and destination). The highest-risk commit: it edits `handleVerified`, a few lines from the explicit-choice claim that Codex round 1 of `signup-otp` was about.
- **Phase 4** (PlanView rebuilt at `/start` and `/plan`; the anonymous entry to sign-up changes shape; the two plan sentences are rewritten and rendered from code).
- **Phase 6** (`/login` rebuilt on a shared component, with a server action behind it).
- **Phase 3** (Progress before the first re-test: a free and paid screen rebuilt, a new number shown to free players). Marked for Codex by KC, 2026-11-11.
- **Phase 2** (the guided session's first screen rebuilt, shared with the landing).
- Suggested: one Codex review after Phase 5 (covers 1 to 5, Phase 3 included), one of the whole branch after Phase 9. Phases 1, 7, 8 and 9 alone would not need one.

**Risks**

1. **Claim guard regression.** The destination edit sits inside the function that decides explicit versus automatic claims. Mitigation: no edits to `persistence.ts`; the Phase 5 two-tab check; the empty-diff check in (f).
2. **Readiness disappears** if Phase 4 ships without Phase 3. Mitigation: phase order.
3. **`/login` stops submitting.** `CredentialFields` inputs have no `name`; the page's server action reads the form. Password managers also key on `name` and `autocomplete`. Mitigation: Phase 6 checks, including a saved-password fill.
4. **The landing changes without anyone asking for it**, because it renders the app's drill brief. Mitigation: the Phase 2 landing check; `ExampleTag` adjacency.
5. **Plan sentences rendered from code** (decision 3). No migration, but `/plan` reads the skill and the plan separately today; if the sentence is built from a different diagnosis than the plan's drills, the two disagree. Mitigation: read the skill from the plan's own diagnosis; check a signed-in retake in Phase 4.
6. **Drill page by search param fails the production build** without a `Suspense` boundary, and a deep link to `/start?drill=x` with no result on the device must fall through to the assessment. Mitigation: `npm run build` and that case in Phase 4.
7. **The wall template is one drawing for five drills** (decision 4). The labels, not the picture, say what differs. Mitigation: KC reads the five label sets (copy rows 77 to 81) before Phase 2 builds on them.
8. **The one-sentence drill page hides setup detail** (distances, "3 sets of 15", the ladder rule). Mitigation: Q2 keeps the full text on the timer.
9. **Week-status edge cases** are date-dependent and cannot be screenshotted on demand. Mitigation: a pure helper with `now` as a parameter, checked by script.
10. **Autofill fix versus the no-shadow rule.** The common fix is an inset `box-shadow`, which hard rule 1 bans and `/verify` flags. Mitigation: the transition or background-clip technique; real-device check.
11. **Two rule amendments land in the last phase** (decision 7), after the phases that use them. Until then `/verify` and the reviewer report the 14px consent line and the centered `/login`. Mitigation: both are named as expected in Phases 5 and 6.
12. **Loss of "do drill 2 first"** for players whose two drills need different setups. Accepted by the locked design; say so in the report.
13. **The pending sign-up state has no button** in the action slot (the account block is hidden while a code is pending, `PlanView.tsx:249`; "Enter code" at the top is the way on). Unchanged, but the new layout must not leave an empty slot there.
14. **Paid data reaching a free player through the rebuilt Progress screen.** Nothing leaks today because the view is a server component that is handed only what it draws. Mitigation: the two rules in (m), and the payload check in Phase 3.
15. **"n of 6" is a new claim about the plan.** Counted across plans, or left uncapped, it shows a number the plan never asked for. Mitigation: decision 6 (this plan only, capped at 6); the 0, 3, 6 and 8 session checks in Phase 3.

---

## 6. Locked items the evidence contradicts

1. **"SESSION 30 min · both drills", "15 MIN · SOLO", "NEXT: {drill} · 15 MIN".** Resolved (decision 1): all computed from the drills. A session is 30 minutes only for the third-shot drop; the other three plans are 25 (`drills.ts:103,190,218`).

2. **Home: "0 OF 2" becomes "0 of 2 drills".** Resolved (decision 2): the number counts this week's sessions (`TodaySession.tsx:73-91`), so it reads "n of 2 sessions this week" and the circles go.

3. **"In your games (one sentence)" and "Re-test goal (one sentence)".** Resolved (decision 3): rendered from code from new one-sentence copy; KC reviews the drafts first.

4. **"Readiness (moves to Progress)".** Resolved 2026-11-11: Progress before the first re-test is locked and shows it. Kept here so the numbering holds.

5. **"Every drill gets a diagram… including Speed-Up Defense, Wall Reset and Wall Counters."** Resolved (decision 4): one wall template covers all five wall versions, the two unnamed ones included; Speed-Up Defense's partner version keeps the diagram it has had since the first build.

6. **"One scoring rule everywhere… (pre-drill, active drill, logging)".** Half resolved (decision 5): the rule uses each drill's own unit word. Still open: on the logging screen the rule describes a moment already past (Q4).

7. **The consent line "smaller".** Resolved (decision 7): 14px, with the rule amended. It already sits under the button (`SaveGate.tsx:356-373`), so only the size changes.

8. **"Start session (always starts at drill 1)".** `/session` starts at the first drill not logged today (`session/page.tsx:93`). That is drill 1 on a fresh day and drill 2 on a half-done session, which is the right behaviour; the wording is true only for the first case.

9. **"Mono label/value rows".** Mono values of four to six words break the three-word limit that hard rule 1 and `DESIGN.md:352` set for mono caps (Q6).

10. **`/login` "vertically centered at 768px and wider".** Resolved (decision 7): the rule is amended to allow it for forms. Which forms get it in this batch is Q18.

11. **Save form: "Already have an account? Log in".** For the record: batch `signup-otp` Phase 3 removed "Already have an account? Sign in" from this form on purpose and the design doc lists its absence (`DESIGN_SYSTEM.md:332`). The locked change brings the wording back at the top. Nothing breaks; the doc line flips.

12. **"n of 6".** Resolved (decision 6): this plan's sessions only, shown as "6 of 6" past six. For the record, 8 sessions fit in a plan that did not start on a Monday (worked example in (l)).

13. **"Subscribers… batch C sections unchanged" and "Removed: the dot-and-line graphic".** Resolved (decision 6): the subscriber's READINESS section is dropped, and the graphic with it.

14. **"Your re-test gives you a second score to compare with this one."** Resolved (decision 6): "a new score", the same sentence for everyone.

---

## What this means

Most of batch D is rearranging things the app already knows: the drill page, the plan rows and the session lines are all built from data that exists today, so nothing in the database has to change unless the two plan sentences are rewritten. The one part that touches how accounts get their plans is small (a single destination line and the removal of one button), but it sits right next to the check that stops a plan being saved to the wrong account, so that commit gets the most testing and an outside review. A handful of the locked strings describe a number or a screen slightly differently from what the code does, and those need an answer before building so the new screens do not state something untrue.
