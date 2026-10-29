# Batch 2 plan: one product, one language

Read-only investigation on branch `batch-2` (off `main` at `fad4f6b`), 2026-10-27. No app code changed. Sources: `audit/app-critique.md` (H7, M1, M2, M4, M6, M8, M3), `DESIGN.md`, `Design/DESIGN_SYSTEM.md`, `PRODUCT.md`, `docs/STATUS.md`, and the landing components in `src/components/marketing/`.

Copy marked **UNREVIEWED** is new or rewritten text you haven't read yet. Nothing marked that way ships until you've read it.

**Decisions settled 2026-10-27.** Every open decision below now has your answer recorded, with any conditions you added. The decision tables keep the reasoning; the phase sections are updated to match.

---

## 0. What the landing page does that the app doesn't

This is the visual reference for Phases B and C, taken from `sections.tsx`, `readouts.tsx` and `primitives.tsx`.

| Landing pattern | Where | App today |
|---|---|---|
| **Hairline lists**: `border-t border-line py-5` rows inside a `border-b` list, no card | `Plan()` points, `PriorityTable`, `RootCauseSplit` | Every list is a `rounded-2xl border bg-surface` card |
| **One dominant object per section**, set straight on the page (a 72–96px number, a table, a statement) | `ReadingCenterpiece`, `RetestNumbers` | Two or three same-weight cards per screen |
| **Cards only for real product objects** (hero reading, drill brief) | `Panel` used twice on the page | Cards everywhere |
| **Numbered rows**: mono `01` index, accent only on the row that matters | `PriorityTable` | Plain card stack |
| **Strip of readings**: `dl` grid split by hairlines (`border-y`, `border-l`) | `RetestStrip` | Two side-by-side stat cards (Home, Progress Day One) |
| **16px for every sentence**, `ink-1`/`ink-2`; mono only for short labels | `Body`, `Caption` | 13–15px sentences in 170+ places |
| **No eyebrow on every block**: the heading opens the section | `SectionHeading` | A mono eyebrow above every card |
| **Accent marks one point**: a bar, a 2px rule, a marker, the CTA | `BreakMark`, accent rule in `RootCauseSplit` | Optic-tinted cards (`bg-optic/[0.05]`), and two optic buttons on one screen in some states (below) |

The fonts already match (Archivo / Instrument Sans / IBM Plex Mono via `next/font`), and so does the accent (`#D8E34C`). The gap is composition: cards versus hairlines, and type size.

---

## Phase A: mechanical (sweeps and small fixes)

**DONE 2026-10-28 on `batch-2`.** Em dashes (every row except 11), option `short` labels, 16px, `SkillTitle`, hero glow, `/verify` rules. Migration `supabase/migrations/20261028120000_plan_text_em_dashes.sql` written, **not run**: run it on production yourself (counts query in its header). Notes on what landed differently from the text below:
- Em-dash rows 1–7 and 10 were applied now too, as copy edits only, inside the files Phases B and C rebuild. Their 16px and layout work still waits for those rebuilds.
- `SkillTitle` is on the Reveal verdict, the Home h1 and the `SavedResult` h1. The merged plan screen (Phase B) should keep it.
- Beyond the listed files: the landing's header "Sign in" and footer links went 14 → 15px (text links, decision A5), and the paywall price line went to 16px because `/verify` counts it as running text.

Four items: the em-dash sweep, 16px body text, the "Third-shot drop" wrap, and the hero glow. To avoid doing the work twice, Phase A **skips the files Phases B and C rebuild**, and those get the 16px fix as part of their rebuild: `home/page.tsx`, `plan/page.tsx`, `TodaySession.tsx`, `SessionDrills.tsx`, `Roadmap.tsx`, `SavedResult.tsx`, `ProgressView.tsx`, `RetestOpen.tsx`, and `SessionCompleteScreen` in `GuidedSession.tsx`.

### A1. Em-dash sweep: every hit

`grep -rn "—" src`, minus code comments. No hits for `&mdash;` or `—`. 97 raw lines; after removing comments, these are the strings a player can read.

**REVIEWED 2026-10-28**, with your corrections to rows 2, 4 and 13 applied. Row 11 is skipped (screen removed in Phase B). All other rows, including 1–7 and 10, are applied in Phase A. Rows 46–48 are also stored in the database (decision A2). Rows 57–61 are `bottleneckText`, which no screen renders today (`engine.ts:172` sets it; nothing reads it); only the sentence with the dash changes, and `…` stands for the unchanged rest.

| # | Where | Current | Proposed |
|---|---|---|---|
| 1 | `home/page.tsx:107` | Re-test ready — take it now | Re-test ready. Take it now |
| 2 | `home/page.tsx:123, 126` | {n} more session(s) this week — any other day | {n} more session(s) this week. Pick any other day. |
| 3 | `home/page.tsx:187` | Week {n} of 3 — {Volume and feedback} | Week {n} of 3 · Same drills each week. Beat your last numbers. |
| 4 | `SessionDrills.tsx:45` | Both sessions done this week — week resets Monday. | Both sessions done this week. Next week starts Monday. |
| 5 | `ProgressView.tsx:265` | READINESS — {n} WEEKS | READINESS · {n} WEEKS |
| 6 | `ProgressView.tsx:306` | YOUR LOGGED SESSIONS — {drill name} | LOGGED SESSIONS (label), {drill name} (own line) |
| 7 | `progress/page.tsx:97`, `ProgressView.tsx:149` | — (missing re-test date) | Not scheduled |
| 8 | `GuidedSession.tsx:151` | Couldn't save that — you may have been signed out. Sign in and try again. | Couldn't save that. You may have been signed out. Sign in and try again. |
| 9 | `GuidedSession.tsx:318` | {logProtocol} When the clock hits zero, stop where you are and log it — falling short of {target} still counts. | {logProtocol} When the clock hits zero, stop where you are and log it. Falling short of {target} still counts. |
| 10 | `GuidedSession.tsx:449` | That's the week — rest counts too. | That's the week. Rest counts too. |
| 11 | `Roadmap.tsx:99` | I'm in — let's go | Skipped (screen removed in Phase B) |
| 12 | `Reveal.tsx:231` | In your own words — | In your own words |
| 13 | `SaveGate.tsx:332` | Not now — keep it on this device | Not now, keep it on this device |
| 14 | `PaywallView.tsx:138` | Continue — $79/year | Continue · $79/year |
| 15 | `PaywallView.tsx:139` | Continue — $7.99/month | Continue · $7.99/month |
| 16 | `paywall/success/page.tsx:99` | Stripe has your payment and we're waiting on final confirmation. This usually takes a few seconds — refresh if it doesn't clear. | Stripe has your payment and we're waiting on final confirmation. This usually takes a few seconds. Refresh if it doesn't clear. |
| 17 | `settings/manage/page.tsx:47–48` | You'll keep Progress access until {date} — the time you've already paid for — then move to the free plan. Nothing is charged again. | You'll keep Progress access until {date}, the time you've already paid for, then move to the free plan. Nothing is charged again. |
| 18 | `terms/page.tsx:6` | Terms — Road to Next Rating | Terms · Road to Next Rating |
| 19 | `terms/page.tsx:27` | Summary — full terms pending | Summary: full terms pending |
| 20 | `terms/page.tsx:32` | A plain-language summary of how the product works, not the final legal terms — that document is still being written and will replace this page before launch. | A plain-language summary of how the product works, not the final legal terms. That document is still being written and will replace this page before launch. |
| 21 | `terms/page.tsx:39` | Your DUPR or self-rating is whatever you tell it — nothing here is verified against, or reported to, any official rating system. | Your DUPR or self-rating is whatever you tell it. Nothing here is verified against, or reported to, any official rating system. |
| 22 | `terms/page.tsx:51` | A subscription — $79 per year or $7.99 per month — adds per-skill re-test deltas, your readiness chart and re-test history, and session streaks. | A subscription ($79 per year or $7.99 per month) adds per-skill re-test deltas, your readiness chart and re-test history, and session streaks. |
| 23 | `privacy/page.tsx:6` | Privacy — Road to Next Rating | Privacy · Road to Next Rating |
| 24 | `privacy/page.tsx:29` | Summary — full policy pending | Summary: full policy pending |
| 25 | `privacy/page.tsx:35` | It is a plain-language summary, not the final legal policy — that document is still being written, and this page will be replaced by it before launch. | It is a plain-language summary, not the final legal policy. That document is still being written, and this page will be replaced by it before launch. |
| 26 | `privacy/page.tsx:51` | Stripe handles payment if you subscribe — card details go to Stripe, never to us. | Stripe handles payment if you subscribe. Card details go to Stripe, never to us. |
| 27 | `questions.ts:76` | Almost every point — we get up and stay there | Almost every point: we get up and stay there |
| 28 | `questions.ts:78` | Inconsistent — we're often stuck mid-court or at the baseline | Inconsistent: we're often stuck mid-court or at the baseline |
| 29 | `questions.ts:89` | 7–10 — soft and unattackable most of the time | 7–10: soft and unattackable most of the time |
| 30 | `questions.ts:90` | 4–6 — about half find the kitchen | 4–6: about half find the kitchen |
| 31 | `questions.ts:91` | 1–3 — most sit up or go into the net | 1–3: most sit up or go into the net |
| 32 | `questions.ts:96` | 0 — none land, or I usually just drive because the drop isn't reliable | 0: none land, or I usually just drive because the drop isn't reliable |
| 33 | `questions.ts:112` | I don't get it back — it handcuffs me, or goes into the net or out | I don't get it back: it handcuffs me, or goes into the net or out |
| 34 | `questions.ts:124` | I flinch or mishit — it's a coin flip | I flinch or mishit: it's a coin flip |
| 35 | `questions.ts:141` | My dink breaks down first — into the net, out, or it sits up and gets attacked | My dink breaks down first: into the net, out, or it sits up and gets attacked |
| 36 | `drills.ts:74` | Paddle out front, soft grip — absorb the pace, don't swing. | Paddle out front, soft grip. Absorb the pace, don't swing. |
| 37 | `drills.ts:99` | Let the ball come to you — block, don't hit. | Let the ball come to you. Block, don't hit. |
| 38 | `drills.ts:116` | Contact low and out front, lift gently — arc, not power. | Contact low and out front, lift gently. Arc, not power. |
| 39 | `drills.ts:160` | Paddle up and in front, block first — offense second. | Paddle up and in front. Block first, offense second. |
| 40 | `drills.ts:184` | Both at the kitchen, speed up freely — first to pop it up loses. | Both at the kitchen, speed up freely. First to pop it up loses. |
| 41 | `drills.ts:186` | Short strokes, stay compact — the first pop-up loses. | Short strokes, stay compact. The first pop-up loses. |
| 42 | `drills.ts:214` | Contact out front, soft wrist — every ball lands in the kitchen. | Contact out front, soft wrist. Every ball lands in the kitchen. |
| 43 | `drills.ts:226` | Soft wrist, contact out front — keep it at net height. | Soft wrist, contact out front. Keep it at net height. |
| 44 | `drills.ts:239` | Only above the net AND out in front — everything else resets. | Only above the net AND out in front. Everything else resets. |
| 45 | `drills.ts:253` | Only above the tape AND out in front — everything else is a dink. | Only above the tape AND out in front. Everything else is a dink. |
| 46 | `roadmap.ts:29` **[DB-stored: `plans.in_game_rule`]** | When you're caught mid-court, reset soft instead of attacking — even if you lose the point. You're trading this week's games for next month's level. | When you're caught mid-court, reset soft instead of attacking, even if you lose the point. You're trading this week's games for next month's level. |
| 47 | `roadmap.ts:33` **[DB-stored: `plans.in_game_rule`]** | When someone speeds up at you, your first job is to stay in the point — not counter-attack. Block first, look for offense second. | When someone speeds up at you, your first job is to stay in the point, not counter-attack. Block first, look for offense second. |
| 48 | `roadmap.ts:40` **[DB-stored: `plans.retest_metric`]** | Can you reset a hard ball at your feet from mid-court without it floating up? Count 10 attempts — aim for 6+ clean. | Can you reset a hard ball at your feet from mid-court without it floating up? Count 10 attempts. Aim for 6+ clean. |
| 49 | `diagnoses.ts:165` | {gameTime} Every point there is live, so a reset gets one rushed attempt and no second try — the shot never gets the calm, repeated reps it needs to form. | {gameTime} Every point there is live, so a reset gets one rushed attempt and no second try. The shot never gets the calm, repeated reps it needs to form. |
| 50 | `diagnoses.ts:167` | This isn't a ceiling on your game — it's a shot that never got its reps, and reps are something you can schedule. | This isn't a ceiling on your game. It's a shot that never got its reps, and reps are something you can schedule. |
| 51 | `diagnoses.ts:199` | This isn't a technique problem to start over on — it's a shot that needs rehearsing under game chaos, and chaos can be rehearsed. | This isn't a technique problem to start over on. It's a shot that needs rehearsing under game chaos, and chaos can be rehearsed. |
| 52 | `diagnoses.ts:211` | {gameTime} A game moves on whether a drop was good or bad, so there's no feedback and maybe a dozen attempts an hour — far too few for a touch shot to settle. | {gameTime} A game moves on whether a drop was good or bad, so there's no feedback and maybe a dozen attempts an hour. That's far too few for a touch shot to settle. |
| 53 | `diagnoses.ts:213` | This isn't a ceiling — it's a shot that has never had measured reps, and measured reps are the whole plan. | This isn't a ceiling. It's a shot that has never had measured reps, and measured reps are the whole plan. |
| 54 | `diagnoses.ts:259` | This isn't about reflexes you weren't born with — it's a ball you've seen too rarely, and you can see it on purpose. | This isn't about reflexes you weren't born with. It's a ball you've seen too rarely, and you can see it on purpose. |
| 55 | `diagnoses.ts:359` | This isn't a discipline flaw — it's a soft game that has never been rehearsed with something on the line, and that can be rehearsed. | This isn't a discipline flaw. It's a soft game that has never been rehearsed with something on the line, and that can be rehearsed. |
| 56 | `diagnoses.ts:360` | This isn't a discipline flaw — it's a decision that has never been rehearsed with something on the line, and that can be rehearsed. | This isn't a discipline flaw. It's a decision that has never been rehearsed with something on the line, and that can be rehearsed. |
| 57 | `diagnoses.ts:146` (not rendered) | The reset — staying calm under pressure in the transition zone and neutralizing attacks at the net — is the single most separating skill between {level} and 4.0. … | The reset (staying calm under pressure in the transition zone and neutralizing attacks at the net) is the single most separating skill between {level} and 4.0. … |
| 58 | `diagnoses.ts:148` (not rendered) | … It's the shot that converts a defensive position into an offensive one — and at 4.0, everyone expects you to have it. … | … It's the shot that converts a defensive position into an offensive one, and at 4.0, everyone expects you to have it. … |
| 59 | `diagnoses.ts:150` (not rendered) | Hands at the net — handling a ball that's sped up at your body, hip, or shoulder at close range — is one of the defining skills of the 4.0 level. … | Hands at the net (handling a ball that's sped up at your body, hip, or shoulder at close range) is one of the defining skills of the 4.0 level. … |
| 60 | `diagnoses.ts:152` (not rendered) | Patience in the soft game — staying disciplined in a dinking rally, not manufacturing pace when the ball doesn't deserve it — is what separates players who win points at 4.0 from players who donate them. … | Patience in the soft game (staying disciplined in a dinking rally, not manufacturing pace when the ball doesn't deserve it) is what separates players who win points at 4.0 from players who donate them. … |
| 61 | `diagnoses.ts:191` (not rendered) | The reset is the skill that separates {level} from 4.0 — absorbing pace in the transition zone, going soft when everything in you wants to hit back hard, and earning your way to the kitchen rather than hoping your opponents miss. … | The reset is the skill that separates {level} from 4.0: absorbing pace in the transition zone, going soft when everything in you wants to hit back hard, and earning your way to the kitchen rather than hoping your opponents miss. … |

The story edits (49–61) change punctuation only: no new claims and no change to which answers reach which story, so rule 5 holds. Rule 4 also holds: option `id`s and `skillLevel`s in `questions.ts` don't change, only label text.

**Exempt (not UI):** code comments; `console.*` / `throw new Error` text in `api/stripe/webhook/route.ts` (6) and `lib/stripe.ts` (2); `globals.css` comments; the trailing comments in `types.ts` and `diagnoses.ts:80–83`; the comments in `demo-run.ts`. The Resend email (`email.ts`, `reminders.ts`) has none in its strings.

**Code that depends on the dash. It must change in the same commit as rows 27–35:**
- `src/lib/retest-result.ts:86`: `short = label.split(" — ")[0]` builds the re-test result's trained-skill rows ("1–3 → 4–6"; for the reset, the separate **Kitchen line** and **Mid-court** rows). If the labels change and this doesn't, every row shows the whole sentence instead of the short answer. **This is where the reset rows could regress.**
- `src/lib/roadmap.ts:70`: same split, for "You started at 1–3" in the third-shot re-test goal.
- **Decided (A1): nothing parses labels any more.** Add an explicit `short` field to `AnswerOption` (`types.ts:11`) and fill it on every option of the five skill questions. Both places above read `option.short` instead of splitting `label`, and the colon in the label is display only. If `short` is missing, behave as today when a label can't be read: the trained-skill rows fall back to stored levels, and the third-shot goal drops its "You started at" line.
- **Confirmed: answers are stored by key, never by label text.** The assessment saves `{ questionId: optionId }` (`Assessment.tsx:57`). That map is what goes into `assessments.answers` (`persistence.ts:45`, `retest/actions.ts:41`) and into localStorage (`local-result.ts:28`). Changing label text can't affect stored answers or scoring.
- **Confirmed: no other split.** The only other `.split(` in `src` is `rating.ts:59`, which fills in `{level}` and doesn't touch option labels.
- **`short` values: copy today's output exactly**, so the re-test rows don't change:

  | Question | a | b | c | d |
  |---|---|---|---|---|
  | `net_hold` (Kitchen line) | Almost every point | *whole label* | Inconsistent | *whole label* |
  | `third_shot` | 7–10 | 4–6 | 1–3 | 0 |
  | `transition_reset` (Mid-court) | *whole label* | *whole label* | *whole label* | I don't get it back |
  | `net_defense` | *whole label* | *whole label* | I flinch or mishit | *whole label* |
  | `dink_patience` | *whole label* | *whole label* | *whole label* | My dink breaks down first |

  *Whole label* means the label has no separator today, so the row already shows the full sentence. For example `transition_reset` a: "I reset it softly into the kitchen and keep coming". The seven non-skill questions get no `short`, because nothing reads it there. Say if you want it on every option of all twelve anyway.
- Rule 4 holds: `id`s, `skillLevel`s and `rootCauseFlag`s don't change, and the engine doesn't read `short`.

**Text already stored in the database:** `plans.in_game_rule` and `plans.retest_metric` are written when a plan is created (`persistence.ts:103`, `retest/actions.ts:78`) and read back by `/plan` and `/session`. Editing `roadmap.ts` fixes new plans only. Existing reset and net-defense plans keep showing rows 46–48 until a re-test. **Decided (A2): migration** with exact-match updates for those three strings, run by you on production.

### A2. Body text at least 16px

Count, app only (marketing excluded): `text-[15px]` ×98, `text-[14px]` ×36, `text-[13px]` ×38, `text-[12px]` ×1, plus about 20 `text-sm` / `text-xs`. Of the 15px uses, 42 are on buttons or inputs.

Rules to apply, file by file (not a blind find-and-replace):
- **Every sentence → 16px.** Paragraphs, helper text, captions, error messages, teaser lines, the readiness caveat (it's 12px on Home today, `home/page.tsx:207`).
- **Secondary single lines → at least 15px**, 16 where it's a sentence. Examples: the "· 3-week plan" fragment on the save form, row dates.
- **Inputs 15 → 16.** As a bonus this stops iOS Safari zooming the page when an email or password field is focused. Files: `ui/input.tsx`, `SaveGate.tsx:281`, `:300`, login, forgot/reset password, signup.
- **Answer options 15 → 16.** They're sentences the player reads (`Assessment.tsx`).
- **Buttons (decided, A5):** primary and secondary stay at the spec's 15px. Ghost and text-link actions go 14 → 15.
- **Exempt:** mono labels, badges, the countdown, mono metric suffixes.
- **Docs:** update `DESIGN.md` so the tokens stop contradicting the rule: `small` 13 → 15, `small-ui` 14 → 15, the option-select and input font 15 → 16, ghost 14 → 15. Note that `Design/DESIGN_SYSTEM.md` §2's 15px body is superseded.

**`/verify`'s check: updated now (uncommitted, `.claude/skills/verify/SKILL.md`).** It now separates buttons and links from running text:
- **Exempt from 16px:** text inside an `a`, `button` or `[role=button]` whose classes mark it as a button or text link: `h-[52px]` or `h-14` (primary and secondary), `h-11`, `h-[44px]` or `min-h-11` (ghost), `underline` (text links). Those labels are reported as `smallControls` only when below 15px.
- **Still flagged as `small`:** any non-mono sentence (ends in . ? !) or line of six or more words under 16px, and any other non-mono line under 15px. A link or button without those classes (a whole tappable row, a drill card, the re-test banner) is not exempt; its sentences count as running text.
- Mono text stays exempt. Until Phase A lands, today's 13–14px ghost links will show up in `smallControls`, as they should. The `DESIGN.md` Buttons section is updated in Phase A to match these classes (see Docs above).

Files in Phase A (everything not rebuilt in B or C): `settings/page.tsx`, `settings/manage`, `settings/delete`, `CancelSubscriptionForm`, `DeleteAccountForm`, the reminder toggles, `login`, `forgot-password`, `reset-password`, `auth/link-error`, `signup`, `paywall/*`, `PaywallView`, `SaveGate`, `ResendConfirmation`, `ClaimOnLoad`, `Assessment`, `Computing`, `Reveal`, `DrillBrief`, the timer and log screens in `GuidedSession`, `session/page.tsx`, `session/error.tsx`, `DeltaScreen`, `locked-card.tsx`, `retest/page.tsx`, `ui/*`.

### A3. The "Third-shot drop" wrap (M3)

`src/components/diagnosis/Reveal.tsx:252`: the verdict's h2 is 46px with `text-balance`. The 375px column is 327px wide and "Third-shot drop" at 46px is wider than that, so the browser breaks at the hyphen: "Third-" / "shot drop". The same component renders the re-test's new-focus reveal (`RetestReveal.tsx`).

Fix: a small `SkillTitle` helper that wraps each hyphenated word in `<span className="whitespace-nowrap">`, so the break can only fall between words: "Third-shot" / "drop", "Soft-game" / "patience". `hyphens: none` doesn't help here, because the break after a typed hyphen is a line-breaking opportunity, not hyphenation. A non-breaking hyphen (U+2011) would work, but Archivo may lack the glyph and fall back to another font. Use the helper wherever a skill title is set at display size: the Reveal verdict, the Home h1, and the merged plan screen's h1.

### A4. Remove the landing hero's gradient glow

- `src/components/marketing/readouts.tsx:36–62`: remove the `glow` prop from `Panel` and its `radial-gradient` div.
- `readouts.tsx:164`: remove the `glow` prop from `ScoreReadout`; reword the docstring (around line 158) that mentions the hero's "ambient field".
- `src/components/marketing/sections.tsx:118`: `<ScoreReadout glow />` → `<ScoreReadout />`.

The hero's `relative overflow-hidden` can stay; it costs nothing. This is the only `radial-gradient` in `src/`.

### Phase A risks

- **The reset rows on the re-test result** (constraint 2): covered by the `short` field above. Check by re-testing a reset-bottleneck test user and confirming both **Kitchen line** and **Mid-court** rows show short answers, each with its own change. Also check the stored-levels fallback ("1/3 → 1.5/3") still shows.
- **Story copy** is content you haven't read (rows 49–61). Diff `npx tsx src/lib/engine.test.ts` before and after: only punctuation should differ.
- **Stored plan text** (A2): a migration that writes to production data. Write it to touch only rows whose text exactly matches the old strings.
- **16px reflow** at 375px: button labels and settings rows may wrap. `/verify` at 375 and 1440 on every touched screen.
- **The landing hero** is the most-visited screen. Screenshot before and after at 375 and 1440.

### Phase A decisions

| # | Decision | Answer |
|---|---|---|
| A1 | Separator for answer options | **Decided: colon for display, and nothing parses it.** Each skill-question option gets an explicit `short` field, read by `retest-result.ts` and `roadmap.ts`. Answers are confirmed stored by key (A1 above). |
| A2 | Old plans with em dashes stored in `plans` | **Decided: a migration with exact-match updates** (`update plans set in_game_rule = '<new>' where in_game_rule = '<old>'`) for the three affected strings (rows 46–48). Safe to run twice; touches nothing else. You run it on production, as you did the readiness migration. Alternative: leave them; they turn over at each player's next re-test. |
| A3 | Are the terms and privacy pages in scope? | **Decided: yes.** Players read them; rows 18–26 are small. (Separately: the terms' "What it costs" paragraph doesn't list the trained skill's before and after as free. Worth a line when the real terms are written.) |
| A4 | `bottleneckText` (rows 57–61) | **Decided: sweep it** (five strings). Deleting the unused field touches `engine.ts` and `types.ts`, which is better asked about separately. |
| A5 | Button sizes | **Decided: primary and secondary stay 15px; ghost and text links 14 → 15; inputs and options 15 → 16.** DESIGN.md updated to match; `/verify` exempts those button and link classes (A2 above). |

Codex review recommended after Phase A: it touches the stories (`diagnoses.ts`), the assessment options, and the re-test result's trained-skill rows.

---

## Phase B: rebuild Home, merge the plan screens

### B1. The plan screens today

| Screen | URL | Who sees it | What it shows |
|---|---|---|---|
| Plan preview (`diagnosis/Roadmap.tsx`) | `/start`, phase `roadmap`. Client state, no URL of its own. | Anonymous, first pass only | Goal label · "2 sessions a week · 25 min each" · drill cards (tap to expand the brief and shot diagram) · **In your games** as an optic-tinted card · **Re-test in 3 weeks** card · "I'm in — let's go" → save form |
| Save form (`auth/SaveGate.tsx`) | `/start`, phase `savegate` | Anonymous | Headline · a "Your plan" summary row (third telling of the plan) · email and password · "Not now — keep it on this device" |
| Saved result (`diagnosis/SavedResult.tsx`) | `/start`, phase `saved` | Anonymous; every return visit | Pending-sign-up banner · recommended focus with the reason · baseline readiness with the caveat · Replay · plan header · the same drill cards · **Start session** (→ save form) · **In your games** as a dot marker · **Re-test** as hairline text · account block · Start over |
| Plan tab (`(app)/plan/page.tsx` + `plan/SessionDrills.tsx`) | `/plan` | Signed in | Re-test banner when open · "Week 1 of 3" · `WEEK_FOCUS_LABELS` as the title · today's shape · "0 of 2 sessions this week" · drill cards with status and Start drill / Continue · **In-game rule** card · **Match re-test target** card |
| Home's Today block (`home/TodaySession.tsx`) | `/home` | Signed in | The same drills again as a list, then Start or Finish today's session |
| New-focus reveal (`retest/RetestReveal.tsx`) | `/retest/[id]/next` | Signed in, after a re-test that changed the skill | Verdict, insight, absolution → `router.push("/plan")` |

The same content appears in three designs: the rule is a tinted card, a dot marker, and a neutral card; the re-test is a card, hairline text, and a card; the labels differ ("In your games" / "In-game rule", "Re-test in 3 weeks" / "Re-test · in 3 weeks" / "Match re-test target").

### B2. Proposed: one plan screen

A single `PlanView` component (`src/components/plan/PlanView.tsx`) renders the plan the same way everywhere. Two contexts:

- **Anonymous**, inside `/start`. It replaces both the plan preview and the saved result. The reveal's last button ("See my 3-week plan") lands here directly, so the separate preview screen and "I'm in — let's go" go away (M1 and M2 together).
- **Signed in**, at `/plan`. It replaces the Plan page body and `SessionDrills`.

Layout, top to bottom (375px, 24px gutters, no outer cards):

```
[anon only]  pending-sign-up status line (existing copy)
[anon only]  YOUR FOCUS                                  mono label
             Third-shot drop                             Archivo 32/800, SkillTitle
             {focusReason}                               16px ink-2
             Replay your diagnosis                       text link
[member]     re-test banner when open (holds the screen's accent)
             WEEK 1 OF 3                                 mono (member) / YOUR PLAN (anon)
             Third-shot drop                             member h1 (anon shows it above)
             2 sessions a week, 25 minutes each. Each session is both drills, back to back.
             Week 1 of 3 · Same drills each week. Beat your last numbers.   (anon: no week number)
[member]     1 OF 2 SESSIONS THIS WEEK                   mono
─────────────────────────────────────────────────────── hairline
 01  Basket Drop Drill                    LOGGED · 6/10
     15 MIN · SOLO
     One sentence: the task.                             16px
     View instructions ›                                 expands the brief + ShotDemo + target
     [Start drill]                                       member: primary on the next drill only
─────────────────────────────────────────────────────── hairline
 02  …
─────────────────────────────────────────────────────── hairline
[anon]       [ Start session ]                           primary → save form ("session" reason)
             IN YOUR GAMES                               mono label, no accent, no card
             {in-game rule}                              16px ink
─────────────────────────────────────────────────────── hairline
             RE-TEST GOAL · IN 3 WEEKS                   (member: · OCT 30)
             {start line, anon} {retest metric}          16px ink-2
             READINESS  45 /100                          one row, Archivo 18 tabular (both contexts)
             A score from your answers, not a DUPR estimate.   16px ink-2
[anon only]  account block: one sentence + [Save my plan] secondary   (only if no sign-up pending)
[anon only]  Start over with a new assessment            text link, confirmed
```

What carries over unchanged: the save-form flow (`SaveGate`, the `gateReason` "session" line, `pendingEmail`, `ResendConfirmation`), the claim (`ClaimOnLoad`, `attachLocalResult`), `savePlan` running once (it moves from `handleRevealNext`'s "roadmap" branch to the same place before showing the merged screen), and the "only one Start" rule (the guided session is the only way to log).

`src/app/start/page.tsx`: `Phase` drops `"roadmap"`. `handleRevealNext` saves the plan once and goes to `"saved"`. The `settled` flag stays for replays.

**Readiness lives here now (decision B5).** It moves off Home and onto this screen as one quiet row beside the Re-test goal, in both contexts: the anonymous baseline, and the signed-in player's latest diagnosis. `/plan`'s diagnosis query (`plan/page.tsx:24–30`) adds `readiness, skill_scores` and reads the number through `readinessOfRow`, as Home does today. Readiness is free, so there's no tier check.

**Your B2 condition: the anonymous diagnosis and plan carry through sign-up unchanged (claimed, not rebuilt).** Today's code already does this when the device still has its saved IDs: `attachLocalResult` → `claimPendingRecords` hands those IDs to `claim_anonymous_records` (`persistence.ts:143–181`). It only inserts fresh rows (same answers, but a new plan row with a new `created_at` and re-test date) when the device has no saved diagnosis or plan ID (`:149–155`). So the merged flow must keep saving the plan once at the end of the reveal, as now. If saving moved later (to sign-up), the claim would create a new plan row instead of attaching the one the player saw.

### B3. Redirects

**No URL is removed in the chosen shape (decision B1), so no redirect is needed.** The anonymous screens were never separate URLs (they're phases of `/start`). A tab left open on the old preview reloads into the merged screen, because `/start` opens on the saved result whenever this device has a result. `/plan` keeps its URL.

Not chosen, kept for reference. Folding `/plan` into `/home` and dropping the Plan tab would have needed these redirects and link changes:
- `next.config` `redirects()`: `/plan` → `/home` (temporary at first, then permanent), keeping `?` params.
- Internal links to update: `TabBar.tsx:14`, `session/page.tsx:95`, `session/error.tsx:48`, `GuidedSession.tsx:199` and `:456`, `RetestReveal.tsx:22`, `retest-view.ts:96` (`nextPlanHref`), `retest/[id]/next/page.tsx:32` and `:43`.
- Revalidation: `plan/actions.ts:52`, `retest/actions.ts:86`, `api/stripe/webhook/route.ts:77`; also `supabase/middleware.ts:11` (protected prefixes).
- No emails link to `/plan` (checked `email.ts`, `reminders.ts`, the cron route).

### B4. Home: today's session is the page

Today's session becomes the dominant element (H7). The skill moves into one quiet header. The two stat cards go, and readiness moves to the plan screen (decision B5).

```
[logo]                                   DAY 8 / 21   (⚙)
Third-shot drop                          Archivo 28/800, SkillTitle   (h1)
{insight headline}                       16px ink-1
Week 1 of 3 · Same drills each week. Beat your last numbers.   16px ink-2
─────────────────────────────────────────────────────── hairline
[re-test open → RetestOpen block here, as the dominant element: flat, no tint;
 the accent is its button and Today's button goes secondary, as now]
TODAY · 2 DRILLS, 25 MIN                 1 OF 2 THIS WEEK  ● ○
Basket Drop Drill                                     15 MIN
───────────────────────────────────────────────────────
Wall Drop Drill                                       10 MIN
(flex spacer)
[ Start today's session        25 MIN ]   primary h56, the screen's one accent
{caption}                                  15–16px ink-2, left-aligned (not centered)
```

- All of the state logic stays: `todayState`, the caption ladder, `retestOpen`, `secondary`. Only the markup changes.
- The caption is centered today (`home/page.tsx:248`). DESIGN.md says nothing is centered except the reveal, so it goes left-aligned.
- The weekly dots stay optic (a data line, no button meaning). When the CTA is the accent, the dots go `ink-2` filled / `line-strong` empty, so only one thing on the screen is optic.
- `RetestOpen` (card and banner) loses the `bg-optic/[0.05]` tint and the optic border. It becomes a hairline-bounded block whose only accent is its button (card) or its "Take it ›" (banner).

### Phase B free vs paid

Home, Plan, `/start`, the session and the re-test submission have **no tier checks**, and this phase adds none. Nothing from the paid list (other skills' rows, readiness chart, re-test history, streaks) appears on these screens. Home's "1 of 2 this week" dots are the free weekly count, not the paid streak; the rebuild doesn't turn them into a multi-week row.

### Phase B risks

- **Sign-up and claim flow.** The `/start` phase machine changes (`roadmap` removed; the first pass no longer passes through the save form automatically). Fewer players will see the form unprompted: a conversion trade-off you accepted in decision B2. The gate, claim and pending logic themselves don't change.
- **Two accents on Plan when the re-test is open.** Today the banner is optic and the next drill's Start button is optic too. The merged screen makes drill buttons secondary while the re-test is open.
- **Home's caption logic** has nine branches. Restyle only, then check every state: fresh, half-done, done today, week done, re-test close, re-test open, open + done today.
- **The "Plan saved" banner** (`ClaimOnLoad saved hasPlan`) must stay above the new header.
- **Claim check in Phase B verification (your B2 condition).** Using `/test-user`, on localhost:
  1. Run the anonymous assessment through the reveal to the merged plan. Record the diagnosis and plan IDs saved in localStorage, and the plan's `created_at` and `retest_date`.
  2. Sign the test user in, through both the "Start session" and "Save my plan" entries.
  3. Confirm the account has exactly one diagnosis and one plan, with the same IDs, `created_at` and `retest_date`, and that `/plan` shows the same drills, rule, goal and readiness as the anonymous screen.
  4. Run the cleanup.
- **Drill cards are the only interactive surfaces on the anonymous plan.** Expanding a row must keep `aria-expanded`/`aria-controls` (as `DrillCard` does now).

### Phase B decisions

| # | Decision | Answer |
|---|---|---|
| B1 | What "one plan screen" means at URL level | **Decided 2026-10-27: one `PlanView` component at two places** (`/start` anonymous, `/plan` signed in); Home stays its own tab showing only today. Rejected alternative: fold `/plan` into `/home` with two tabs (HOME · PROGRESS) and the redirects in B3. That's a bigger change to navigation the spec defines, and Home stops having one dominant element. |
| B2 | Does the first pass still open the save form after the plan? | **Decided: no**, on condition that the anonymous diagnosis and plan are claimed, not rebuilt, at sign-up (checked in B2 and B risks). The reveal lands on the merged plan. "Start session" (primary) and "Save my plan" (secondary, in the account block) both open the form, as the saved result does today. This is M1 as written ("the account prompt as a single block on it"). |
| B3 | The week-theme label (`WEEK_FOCUS_LABELS`, M9) | **Decided: retire it.** The Plan title becomes the skill. Home and Plan say "Week 1 of 3 · Same drills each week. Beat your last numbers." (your wording). Remove the export from `roadmap.ts`. |
| B4 | Names on these screens (part of M5) | **Decided: use the critique's names where these screens show them**: "Your focus", "Readiness", "In your games", "Re-test goal", "Back to my plan". Leave the rest of M5 (the re-test history labels) for its own pass. |
| B5 | Readiness on Home | **Decided: remove it from Home.** The quiet row (READINESS 45 /100 + "A score from your answers, not a DUPR estimate.") goes on the merged plan screen, beside the Re-test goal, for anonymous and signed-in players. |

Codex review recommended after Phase B: it rebuilds two main screens and changes the sign-up flow on `/start`.

---

## Phase C: rebuild Progress, add the session recap, show "No change"

### C1. Progress: one dominant element per state

Data loading in `(app)/progress/page.tsx` doesn't change. Only `ProgressView.tsx` is rebuilt. That matters because the free branch (`page.tsx:105`) never loads the chart, history or streak; the rebuild keeps rendering placeholders for it.

| State | Dominant element | Below it |
|---|---|---|
| **Re-test open** (any state) | `RetestOpen` block (flat, accent on its button only) | the rest of the state, with any other optic button made secondary |
| **Day One** | The re-test date set on the page, not in a tinted card: mono FIRST RE-TEST → Archivo 56 date → mono IN 13 DAYS · WEEK 1 OF 3 → 16px "This is the day you find out if your third-shot drop moved." | A two-cell strip like `RetestStrip` (SESSIONS DONE 4 · INTO THE PLAN Day 8), split by hairlines · the baseline line with its small flat-line mark, 16px, no dashed box |
| **Locked (free)** | Readiness now: Archivo 72 + "/100" + change (mono) + the caveat at 16px | The two `LockedCard`s (chart, history), then "Unlock Progress" (primary unless the re-test is open) |
| **Full (paid)** | The readiness chart, full width, no card: mono READINESS · 6 WEEKS + change, the caveat, the chart, the date ends | Hairline sections: logged sessions (mono LOGGED SESSIONS, drill name on a 16px line, sparkline), Re-test history rows, Streak |

Fixes that come with the rebuild:
- **"+0 SINCE START" shows in optic** (`ProgressView.tsx:202` and `:256`: `up = totalChange >= 0`). Zero becomes neutral: "NO CHANGE SINCE START" in `ink-3` (see C3).
- **Two optic buttons when the re-test is open on the locked state** ("Take your re-test" and "Unlock Progress"). Unlock goes secondary while the re-test is open.
- **Streak squares use `rounded-[4px]`**, which isn't on the radius scale. Use `rounded-xs` at 12px, or make them dots (`rounded-full`) to match Home.
- **`LockedCard`'s scrim is a `linear-gradient`** (`locked-card.tsx:33`). **Decided (C4): a flat `rgba(19,19,21,0.6)` cover.** With the same change, `DESIGN.md`'s locked treatment (Components, Locked / Blur Treatment) and `/verify`'s "Gradients are allowed only on…" line drop the scrim exception, so the landing's closing section is the only allowed gradient.
- **What sits under the locked cards today (your C4 condition): placeholders only, confirmed.** All three uses are server components (no `"use client"` in `ProgressView.tsx`, `DeltaScreen.tsx` or `locked-card.tsx`), so only the rendered HTML reaches the browser and the RSC payload:
  - Progress chart (`ProgressView.tsx:223`): `ChartPlaceholder`, a flat grey line whose number of points comes from `readingCount`. No readiness values.
  - Progress history (`:227`): `HistoryPlaceholder`, rows labelled "Baseline" / "Re-test" with "––" for every score.
  - Re-test result (`DeltaScreen.tsx:136`): `BreakdownPlaceholder`, the other skills' names with "–/3 → –/3". `loadRetestView` only fills `skills` for paid players (`retest-result.ts:206`), so the levels never leave the server.
  - The free Progress branch (`progress/page.tsx:105`) sends only `currentReadiness`, `totalChange` and `readingCount`. The chart series, history, streak and session series are never queried for a free player.
  - The rebuild keeps all of that. **Phase C verification adds a payload check:** as a free test user with two re-tests, load `/progress` and the latest `/retest/[id]`, then search the HTML and the RSC payload for that user's real other-skill levels and history scores. None should appear.
- `LockedCard` teaser 13px → 16px. The second teaser has no closing period; add one.

### C2. Session recap (M8)

**Today:** `SessionCompleteScreen` (`GuidedSession.tsx:434`) says "Session logged. 1 of 2 sessions this week." Nothing about the numbers just logged.

**Proposed** (UNREVIEWED copy):

```
SESSION COMPLETE                                   mono
Session logged.                                    Archivo 28/800 (headline-complete)
─────────────────────────────────────────────────── hairline
Basket Drop Drill                                  16px/600
6/10                                               Archivo 32 tabular, ink
TARGET 7 · LAST TIME 4                             mono 11px ink-3
───────────────────────────────────────────────────
Wall Drop Drill
5/10
TARGET 7                                           (first log of this drill: "Last time" omitted entirely)
───────────────────────────────────────────────────
1 of 2 sessions this week. The next one is any other day.        16px ink-2
  (week done: "2 of 2 sessions this week. That's the week. Rest counts too.")
(flex spacer)
[ Back to my plan ]                                primary, the screen's one accent
```

- **No judgement words, no colour for hitting the target, no icons.** Numbers in `ink`, labels in `ink-3`. Meeting the target isn't marked. Optic stays on the button only. This keeps it from reading as gamification.
- **Data.** `session/page.tsx` already loads the plan and drills. Add:
  - **today's logged results** for all plan drills, from `getTodayLog` (covers a session resumed after leaving halfway, where drill 1 was logged on an earlier visit);
  - **last time**: the most recent scored row per drill *before* this sitting's window. Use `getScoredSessionsByDrill` (one query, spans plans) and take the last entry with `completed_at` earlier than the same `since` cut-off `getTodayLog` uses (start of the UTC day or six hours back, whichever is earlier), so tonight's own row is never "last time".
  - Pass both to `GuidedSession` as props. The client fills in the number it just logged (`selected`) for drills logged during this visit, so the recap shows immediately after the last log without waiting for the re-render.
- **First logged session of a drill (decided, C1):** leave "Last time" out entirely: no "0", no dash, no "Not yet". The line reads just TARGET 7.
- **Target as a number.** `practiceTarget` is a string ("7 of 10"). Parse the leading integer in a small helper (`practiceTargetCount`), and fall back to showing the string if it doesn't parse. No change to `drills.ts` data.
- Both places that render `SessionCompleteScreen` get the new props: `GuidedSession.tsx:106` and `session/page.tsx:71`.

### C3. "No change" when before and after are equal

| Where | Tier | Today when equal | Proposed (UNREVIEWED where new) |
|---|---|---|---|
| Re-test headline (`DeltaScreen.tsx:117`, `signed()`) | free | "70 → 70 no change": lowercase in mono, which breaks the uppercase-mono rule | Keep both numbers (same layout as up and down); the trailing text becomes mono **NO CHANGE** in `ink-3` |
| Trained skill rows (`DeltaScreen.tsx:195`, `ChangeBadge`) | free | "NO CHANGE" (levels) / "SAME ANSWER" (quoted answers) | Keep both as they are: the distinction is deliberate. Check both reset rows show their own badge. |
| Paid breakdown rows (`DeltaScreen.tsx:301`) | paid | Nothing after "1/3 → 1/3" | mono **NO CHANGE** in `ink-3` after the pair |
| Progress history rows (`ProgressView.tsx:395`) | paid | Score with nothing beside it | **NO CHANGE** in `ink-3` beside the score |
| Progress "since start" (`ProgressView.tsx:202`, `:256`) | free (locked) / paid (full) | "+0 SINCE START" in optic | **NO CHANGE SINCE START** in `ink-3` |

The landing's example strip (`RetestStrip`) shows "0" for an unmoved skill. It's example data and not in scope; say if you want it to match.

### Phase C free vs paid: every place it is checked

None of these change. The rebuild only touches the markup that renders what each branch already sends.

| Check | File:line | What it gates |
|---|---|---|
| Progress state | `src/app/(app)/progress/page.tsx:105` | Free gets `locked` (current readiness, change since start, reading count only). Paid gets `full` (series, history, streak, session series). Paid data is never loaded for free players. |
| Re-test result tier | `src/lib/retest-result.ts:127–133` (`isPaidUser`), `:165`, `:206` | `skills` (the other three rows) filled only for paid. `trained` (before and after, with the stored-levels fallback) and `comparison` (headline) sent to everyone. |
| Re-test result render | `src/components/retest/DeltaScreen.tsx:131`, `:147` | Paid breakdown vs `LockedCard` placeholder (built from skill names, no levels); upgrade link for free only |
| Settings | `src/app/settings/page.tsx:46`, `settings/delete/page.tsx:28`, `settings/manage/page.tsx:27` | Plan row and manage/cancel |
| Paywall | `src/app/paywall/page.tsx:35`, `paywall/actions.ts:48`, `paywall/success/page.tsx:72` | Already-paid redirect, checkout, confirmation read-back |
| Writes | `src/lib/billing.ts` (`syncSubscription`) via `api/stripe/webhook/route.ts` | The only writer of `subscription_status` |
| **No check, must stay that way** | `/home`, `/plan`, `/start`, `/session`, `logGuidedSession`, `/retest` + `submitRetest`, `/retest/[id]/next` | Free paths (PRODUCT.md) |

The recap's "last time" is one number per drill, from logging, which is free. The paid "logged sessions" sparkline on Progress stays paid. Decision C1.

### Phase C constraints to re-check

- **Reset = average of kitchen line and mid-court, shown as two rows** on the re-test result. Phase C doesn't touch `retest-result.ts`. The `TrainedSkill` markup keeps one row per `trained.rows` entry with its own `ChangeBadge`. Check with a reset test user: one row moved and one held.
- **The readiness caveat** "A score from your answers, not a DUPR estimate." stays wherever readiness is shown: `ProgressView.tsx:214` and `:260`, `DeltaScreen.tsx:122` and `:258`, `Reveal.tsx:384`, and the merged plan screen (replacing `SavedResult.tsx:130`, for anonymous and signed-in players). Home no longer shows readiness (B5), so `home/page.tsx:208` goes with it. Progress Day One shows no readiness number, so it has no caveat, as now.
- **No shadows, gradients, photos, illustration or gamification.** The recap rule is above. The LockedCard cover goes flat (C4).

### Phase C risks

- **Paid surfaces on a main screen.** Progress full and locked are rebuilt; any data reshuffle could leak paid fields to free browsers. Keep `ProgressViewData` exactly as it is.
- **Recap "last time" edge cases:** an evening session across midnight UTC (the six-hour window), a drill carried over from the previous plan (history spans plans, which is intended), a drill logged without a number (excluded from scored history).
- **Re-test open states** need the plan's re-test date moved to today on a test user, as the critique did. `/test-user` handles the cleanup.

### Phase C decisions

| # | Decision | Answer |
|---|---|---|
| C1 | Is "last time" in the recap free? | **Decided: free.** One previous number per drill; the series and the chart stay paid. On a drill's first logged session, "Last time" is omitted entirely. |
| C2 | Equal before and after on the headline | **Decided: both numbers plus NO CHANGE** ("70 → 70 NO CHANGE", first 70 dimmed, label in `ink-3`). |
| C3 | Streak label (part of M13) | **Decided: "Weeks with both sessions"**, on condition the logic counts exactly that. **Confirmed it does:** `getWeeklyStreak` (`drill-sessions.ts:286`) marks a week as hit when it has at least `SESSIONS_PER_WEEK` (2) completed sessions, and a session is every drill on the plan in one sitting (`countSessions`, `session-plan.ts:86`). Every plan has exactly two drills (`roadmap.ts:110`, `.slice(0, 2)`), so a hit week means both sessions logged with both drills. Edge cases, not a different count: (1) the number is a run of consecutive weeks, not a total, and an unfinished current week doesn't break it; (2) a sitting that runs across Monday 00:00 UTC is split between two weeks and counts in neither. Rename goes ahead. UNREVIEWED copy. |
| C4 | LockedCard's gradient scrim | **Decided: flat cover** (`rgba(19,19,21,0.6)`), on condition that locked cards render only placeholders, never the player's real paid data, in the DOM or the RSC payload. **Confirmed true today** (see C1, "What sits under the locked cards"), and Phase C adds a payload check. DESIGN.md's locked treatment and `/verify`'s allowed-gradients line change with the same commit. |

Codex review recommended after Phase C: it rebuilds Progress (paid surface) and changes what the session route loads.

---

## Not in this plan

These batch 2 items from `docs/STATUS.md` aren't in your list, so this plan only notes where they meet it:
- **M5** (one name per concept): only the names on rebuilt screens (decision B4).
- **M7** (two targets on the brief): the merged plan says "Re-test goal". The brief's footnote ("The match re-test target is a separate number, on your plan", `DrillBrief.tsx:59`) is untouched; it would be a one-line removal.
- **M12–M14** (`/signup`, paid Progress empty states beyond the streak label, "Manage subscription").
- **H6** (Stripe product description) is a dashboard edit, not code.
- **Settings** is still a card stack (H7 names it). It isn't one of the three tabs; leave it for batch 3 or ask to add it to Phase C.

## Verification per phase

- `npx tsc --noEmit`, `npm run lint`, `npm run build`.
- `/verify`: 375px and 1440px screenshots of every touched screen.
- `/test-user` for signed-in states: free and paid, Day One and after a re-test, re-test open (date moved), a reset bottleneck for the two-row check. Always run its cleanup.
- Phase A: diff `npx tsx src/lib/engine.test.ts` before and after (punctuation only).
- `reviewer` subagent on each phase's diff before asking for Codex.
- Update `docs/STATUS.md` and list changed files at the end of each phase.
