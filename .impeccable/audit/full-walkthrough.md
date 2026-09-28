# Road to Next Rating: full design walkthrough and audit

**Date:** 2026-09-27
**Scope:** marketing site, anonymous assessment funnel, signed-in app.
**Judged against:** `PRODUCT.md`, `DESIGN.md`, `design/DESIGN_SYSTEM.md`.
**Mode:** review only. No product code was changed. The temporary fixture routes were deleted afterwards, along with their `.next` build output, and `git status` is clean.

## How this was run

**Screens and widths**
- Every screen was walked live in the built-in browser at 375×812, then at 1280×800. The dev server ran on port 3001.
- The account used for the signed-in screens is on the **paid** tier. So:
  - Progress (full), Home, Plan, Settings, Manage subscription, Delete account and Paywall are live renders.
  - Progress locked, Progress Day One, free Delta, paid Delta and a regressed Delta were rendered from temporary fixture routes that fed the real components.
  - The guided session's log → confirmation was rendered from a fixture too, with a fake write. You chose this so no rows were written to your account.

**Impeccable commands**
- **`/impeccable critique` on the marketing page:** dual-agent. Assessment A (design review) and Assessment B (detector plus in-page overlay at both widths) ran as isolated sub-agents. Results are synthesized in §4, and the snapshot is persisted to `.impeccable/critique/`.
- **`/impeccable audit` on the app:**
  - A source-level audit sub-agent ran `detect.mjs` over `src/app` and `src/components`, with every finding verified in context.
  - I cross-checked its claims live in the browser. Results are in §5.

**Environment notes**
- The first sign-in attempt didn't persist. Next logged `failed to forward action response [TypeError: fetch failed]` after the login action's 303, and no auth cookie was set. The second attempt worked.
- This looks like a dev-server quirk from running a second instance on port 3001. It is not treated as a product finding.

**Severity scale**
- **P0:** blocks a task or breaks a promise someone paid for.
- **P1:** significant confusion, a WCAG AA failure, or copy that contradicts pricing or entitlements.
- **P2:** friction or inconsistency with a workaround.
- **P3:** polish.

---

## 1. Findings, ranked

### P0: blocking

**P0-1 · Reveal, beats 1–4: keyboard and screen-reader users cannot get past the first beat**
- **What:** Advancing is an `onClick` on `<main>` (`src/components/diagnosis/Reveal.tsx:24-29`). Beats 1–4 have **zero focusable elements**.
  - I confirmed it live: Tab, Enter, Space and ArrowRight all do nothing, and `document.activeElement` stays on `<body>`.
  - "TAP TO CONTINUE" is a `<span>`.
- **Why it matters:** The reveal is the product's value moment. A keyboard user never sees the verdict, the score or the plan. WCAG 2.1.1 (A).
- **Fix:**
  - Put a real `<button>` in the footer on every beat. It can look exactly like the current hint.
  - Keep tap-anywhere as a convenience, and add ArrowRight/Space.
  - Move focus to each beat's heading when the beat changes.
  - On desktop the label should read "Continue", not "Tap to continue".

**P0-2 · Re-test Delta (free) → Paywall: the per-skill breakdown a player pays for is never shown to them**
- **What:** The breakdown exists only inside `DeltaScreen`, and that screen is ephemeral client state from `submitRetest`.
  - The free CTA "See the full breakdown" links to `/paywall?from=/home` (`src/components/retest/DeltaScreen.tsx:73`). After checkout the player lands on Home.
  - No other surface renders per-skill deltas. `BreakdownCard` and `previousLevel` appear only in `DeltaScreen.tsx`, and Progress history shows readiness only.
- **Why it matters:** The CTA sells one specific thing, and paying does not deliver it. The paywall's first bullet is "Per-skill re-test deltas — which skills moved, and how much". This is exactly the "contradicts entitlements" failure PRODUCT.md warns against, and it happens at the moment of purchase.
- **Fix:**
  - Persist the delta. `skill_scores` already exist per diagnosis.
  - Give each re-test a stable result route (e.g. `/retest/[diagnosisId]`), or make each Progress history row expand into its per-skill breakdown.
  - Point the paywall `from` at that route, so the player comes back from Stripe to the breakdown they bought.

### P1: major

**P1-1 · Re-test Delta: the headline claims the skill "moved" whatever happened, and a drop leads into "You're improving"**
- **What:**
  - The headline is always "Your {skill} moved." (`DeltaScreen.tsx:32-34`).
  - On a regressed fixture (63 → 60) it still reads "Your resets from the transition zone moved.", with a small red "-3".
  - It then pushes "See the full breakdown" to a paywall whose eyebrow is "YOU'RE IMPROVING — KEEP THE RECEIPTS" (`PaywallView.tsx`).
  - A change of 0 renders "0" in optic (`up = delta >= 0`).
  - The headline also uses the long `SKILL_LABELS` phrase, so it wraps to 3 lines at 34px.
- **Why it matters:**
  - It fabricates the promised outcome at the product's most emotional moment, against Principle 4.
  - Upselling a player who just went backwards with "you're improving" reads as tone-deaf and dishonest.
- **Fix:**
  - Branch the headline three ways: up ("Your reset moved."), held ("Your reset held."), down ("This one went the other way.").
  - Use `SKILL_TITLES` ("the reset"), not the label.
  - Show 0 in `ink-3`.
  - On a drop, the primary CTA should go to the new plan, not the paywall.
  - Make the paywall eyebrow depend on where the player came from ("See what moved, skill by skill" works everywhere).

**P1-2 · Entitlement overclaims across the free path**
- **Saved result:** "Create a free account to start guided sessions and **track progress**." (`SavedResult.tsx`). Progress is the paid surface.
  - Fix: "…to start guided sessions and re-test your score."
- **Progress, Day One:** "Your first re-test on Oct 12 adds the second, and that is when there is a line to read."
  - A free player's line is locked on that date.
  - Fix: "…that is when your score can move", or state plainly that the line is part of Progress.
- **Settings:** the caption under Manage subscription says "CANCEL, CHANGE PLAN, OR UPDATE BILLING", but `/settings/manage` only offers "Cancel subscription".
  - Fix: link to the Stripe customer portal, or change the caption to "Cancel or see your renewal date."
- **Paywall for a paid account:** `/paywall` offers "Continue — $79/year" to a player who is already on Annual. It has no "you already have Progress" state (`src/app/paywall/page.tsx`).
  - Fix: redirect active subscribers to `from`, or render a "You're on Annual · renews Jul 2027" state.
- **Paywall success:** "Every re-test from here is measured against today" is wrong. Re-tests compare against the previous diagnosis (`retest/actions.ts:59-64`).
  - Fix: "Every re-test from here shows which skills moved."
- **Why it matters:** Each of these tells a player they have, or will get, something the pricing model says they don't. That is the thing PRODUCT.md says copy must never do.

**P1-3 · Desktop (1280): six funnel and app screens run edge to edge, and the guided session hugs the left edge**
- **What:**
  - At 1280, the Assessment, Save Gate, Sign in, Forgot password, Reset password and both Delta screens stretch inputs, option buttons and the 52px CTA to **1,232px**.
  - The Save Gate places its headline at the far left and "Not now" at the centre.
  - The guided session uses `max-w-md` without `mx-auto` (`GuidedSession.tsx:105,115`, `session/page.tsx:70,80`), so it sits in a 448px column pinned to the left.
  - Five different column widths are in use: none, 384 (`/signup`), 440 (Computing, Reveal), 448 (app shell, Settings, Paywall), 600 (Roadmap, Saved result).
- **Why it matters:** The funnel changes width at almost every step (full → 440 → 600 → full). On desktop it doesn't read as one product, and a 1,232px "Save my plan" button looks broken.
- **Fix:** One centered column token (448, matching the app shell) on every standalone screen, and `mx-auto` on the session. Keep 600 only if the Roadmap and Saved result genuinely need it, and then use it for the Save Gate too, since it continues from them.

**P1-4 · Focus, selection and contrast (WCAG AA)**
- **Focus is invisible on inputs:** focus is a `line-strong → line-hover` border change, 1.53:1.
  - Affected: `SaveGate.tsx:170,185`, `login:51`, `forgot-password:56`, `reset-password:69,82`, `Assessment.tsx:205`, `DeleteAccountForm.tsx:49`.
  - The Sign in password field has no indicator at all (`login/page.tsx:66`).
  - DESIGN.md says focus = optic ring, and `ui/input.tsx` already does this, but it is used only on the orphaned `/signup`.
- **Selected state is not exposed:**
  - Assessment options have no `aria-pressed` and no radiogroup (`Assessment.tsx:163-176`).
  - Paywall plan cards have no `role="radio"`/`aria-checked`, and the Annual card has no radio indicator at all (`PaywallView.tsx:133-164`).
- **Contrast:**
  - The reveal's "TAP TO CONTINUE" pulses between **2.04:1 and 4.30:1** (`Reveal.tsx:66,257`).
  - "Cancel subscription" is `ink` on solid `danger` at **3.06:1**, dropping to 2.37:1 on hover (`CancelSubscriptionForm.tsx:69`).
- **Fix:**
  - Adopt `ui/input` everywhere, and add a global `:focus-visible` optic outline in `globals.css`.
  - Use radio semantics for both option sets.
  - Pulse the hint between `ink-3` and `ink-2`, or not at all.
  - Give Cancel the Delete button's recipe: danger text on 12% danger fill, 5.19:1.

**P1-5 · Locked Progress and free Delta: paid data is sent to free clients and read aloud**
- **What:**
  - `submitRetest` returns every skill's delta to every tier and leaves gating to the client (`retest/actions.ts:176-184`).
  - `LockedCard` blurs the real `BreakdownCard`, chart and history with CSS only. There is no `aria-hidden` or `inert` (`ui/locked-card.tsx:19`, `ProgressView.tsx:195-201`).
- **Why it matters:**
  - VoiceOver reads out the paid per-skill breakdown and re-test history, and view-source shows them.
  - The visual state and the programmatic state disagree.
- **Fix:**
  - Strip `delta.skills` and history on the server for free users.
  - Render plausible placeholder rows under the blur: real skill names, fuzzed numbers.
  - Mark the blurred subtree `aria-hidden` + `inert`.

**P1-6 · Marketing, step 02: the root-cause readout gives back the visitor's own answer as the diagnosis**
- **What:**
  - "Mostly games, occasional drilling" gets the chip MOSTLY GAMES, and a second answer gets MOSTLY GAMES too.
  - The accent card then announces **ROOT CAUSE · Mostly games**, followed by the fragment "Paired with the reset, one plan" (`readouts.tsx:384-436`, `demo-run.ts:128-133`).
- **Why it matters:** The brief says this two-axis mechanism "carries the whole argument". A result that relabels the input reads as a tautology to exactly the sceptical 3.5 player the page is for.
- **Fix:**
  - Name the cause as a mechanism, e.g. "Games never isolate the reset: one rushed rep per rally, only when you're already in trouble."
  - Keep "Mostly games" as a neutral chip.
  - Replace the fragment with a full sentence about what the pairing changes in the plan.

### P2: minor

**Copy and truthfulness**

**P2-1 · Reveal, Readiness and Progress copy imply a rating the product doesn't measure**
- **What:**
  - The Verdict says "The reset separates **3.5** from 4.0…" whatever rating the player typed. It is hard-coded in `src/lib/diagnoses.ts:52,54,70,86` and elsewhere; I entered "3.5 DUPR", and a 3.0 or 3.8 player gets the same line.
  - Every readiness bar labels its ends **3.0** and **4.0** (`Reveal.tsx:229-232`, `DeltaScreen.tsx:115-118`, marketing readouts), so "63/100" reads as "you're a 3.63".
  - Progress says "Your readiness score tracks how close you are to 4.0."
- **Why it matters:** PRODUCT.md says readiness is a generated 40–85 score and DUPR is never measured. These lines quietly claim otherwise (Principle 4).
- **Fix:**
  - Interpolate the player's stated band, or say "at your level".
  - Label the bar ends 0 and 100, or drop the ticks.
  - Reword Progress to "Your readiness score is a reading of your answers; each re-test shows how far it moved."

**P2-2 · Plan, Roadmap, Saved result: plan copy contradicts itself**
- Roadmap: "Book the court **or the partner** for the whole thing." Both prescribed drills are Solo and Wall.
- Plan: "**Live** Drop Practice" is tagged "SOLO" and described as "Toss, bounce, and hit the drop". The partner drill's name survived the solo prescription.
- Plan: the card labelled "IN-GAME RULE — **THIS WEEK**" says "Commit to the drop… **for the next two weeks**".
- **Fix:**
  - Make the session instruction depend on the prescription ("Book a court for 30 minutes").
  - Give solo versions their own names (e.g. "Self-fed Drop Reps").
  - Scope the rule text to one week.

**P2-3 · Every screen: the bottleneck has three different names**
- **What:**
  - Verdict and Saved result say "The reset".
  - Roadmap, Save Gate, Delta headline and Readiness body say "resets from the transition zone".
  - The Save Gate starts a title with lowercase: "resets from the transition zone · 3-week plan", and the meta wraps into its own column at 375.
- **Fix:** Use `SKILL_TITLES` for anything title-like (cards, headlines, the Save Gate "Saving" row), and `SKILL_LABELS` only inside sentences.

**P2-4 · Assessment: two required free-text questions, one of which nothing reads**
- **What:**
  - Q1 ("What's your current rating…") and Q3 ("…how many times do you play…") both open the phone keyboard in the first three questions.
  - Q3's answer (`play_frequency`) is read by nothing outside the tests. Q1 only feeds a stored `band` string.
  - Both put an *example answer* in the eyebrow slot as long mono caps: `E.G. "3.5 DUPR", "SELF-RATED AROUND 3.7"` wraps to 2 lines.
  - The skill questions have no eyebrow at all, while DESIGN_SYSTEM.md shows a category eyebrow on every question.
- **Fix:**
  - Make Q1 an option list (3.0 / 3.5 / 4.0 / not sure, plus the source). That also fixes P2-1.
  - Make Q3 an option list or cut it.
  - Move examples into the placeholder.
  - Give every question the same eyebrow slot (a category, or nothing).

**P2-5 · Guided session: confirmation and timer miss the moment**
- **What:**
  - The confirmation says "Session logged. 2 of 2 sessions this week…" and never mentions the score just logged. I logged 7/10, which is exactly the practice target, and the screen gave no acknowledgement.
  - On the timer, "Finish drill" ends a 15-minute drill in one tap with no confirmation.
  - The timer has no exit or back.
  - The only optic element is **Pause**.
- **Fix:**
  - Echo the result against the target ("7 of 10 — on target").
  - Confirm early finish when more than half the time is left.
  - Add a quiet "Exit session" affordance.
  - Consider making the optic accent the log action rather than Pause.

**P2-6 · Save Gate and Saved result: the headline promises more than the account delivers**
- **What:** The Save Gate eyebrow is "YOUR DIAGNOSIS IS READY", shown after the player has already read it. Combined with P1-2's "track progress", the gate over-sells.
- **Fix:** Eyebrow "SAVE YOUR PLAN", and keep the four accurate bullets from the Saved result card.

**Layout and responsiveness**

**P2-7 · Tall screens at 375: key actions fall below the fold or under Safari's toolbar**
- **Guided session brief:** 852px tall, so "Begin drill 2" starts at y≈770 and needs a scroll. With Safari's toolbars showing, the visible area on an 812pt phone is about 660px, so the CTA is fully hidden.
- **Delete account:** 853px tall; the safe exit "Keep my account" sits at y 777–821, off the bottom.
- **No safe-area handling:** there is no `viewport-fit=cover` and no `env(safe-area-inset-*)`, even though `layout.tsx` declares `apple-mobile-web-app-capable` with a `black-translucent` status bar. The fixed TabBar (`TabBar.tsx:23`) will sit on the home indicator when launched from the home screen.
- **Fix:**
  - Pin the brief's CTA in a bottom bar: `sticky bottom-0`, with `pb-[max(24px,env(safe-area-inset-bottom))]`.
  - Put "Keep my account" above the destructive button.
  - Add `viewport-fit=cover` and inset padding on the TabBar and top headers.

**P2-8 · Assessment, Timer, Settings: touch targets under 44px**
- 36px back buttons (Assessment, Paywall, Session, Settings, Delete).
- 32px Home settings gear.
- "View instructions" on the timer is about 17px tall, and is used mid-drill on court.
- The marketing "How your priority is chosen" disclosure is 21px.
- **Fix:** Keep the visuals, and extend the hit area to 44 with padding or a pseudo-element.

**P2-9 · Every stat card: mono-caps labels wrap, and long strings break DESIGN.md's Uppercase-Mono limit**
- **Wrapping labels:** "SESSIONS / THIS WEEK" (Home), "SESSIONS / DONE" and "INTO THE / PLAN" (Day One) all wrap to two lines at 375.
- **Strings over the ~3-word limit:**
  - Roadmap: "2 SESSIONS A WEEK · 25 MINUTES, 2 DRILLS EACH" (two lines).
  - Timer: a three-line instruction in caps.
  - Home: "2 MORE SESSIONS THIS WEEK — ANY OTHER DAY".
  - Settings: "CANCEL, CHANGE PLAN, OR UPDATE BILLING" (tracked at 0.06em).
  - Paywall: price terms and caption in mono.
- **Fix:** Anything over about 3 words goes to 13–14px Instrument Sans in sentence case. Shorten stat labels ("SESSIONS", "DAY").

**Consistency and accent**

**P2-10 · Roadmap, Saved result, Plan: the same objects are styled three ways**
- **In-game rule:** optic-tinted on the Roadmap, neutral on the Saved result and Plan. Labels: "IN YOUR GAMES" vs "IN-GAME RULE — THIS WEEK".
- **Re-test card:** "RE-TEST IN 3 WEEKS" vs "MATCH RE-TEST TARGET" vs "MATCH RE-TEST TARGET · IN 3 WEEKS".
- **Session header:** mono caps on the Roadmap, sentence case on the Saved result.
- The Roadmap's own comment (`Roadmap.tsx:10-15`) claims all of these "match" the Plan tab.
- **Fix:** Extract `InGameRuleCard`, `RetestCard` and `SessionHeader`, and use them on all three screens.

**P2-11 · Paywall, Progress (paid), Settings, Home, Roadmap, Plan, marketing: the One Accent Rule is breached**
- **Paywall:** optic bullets, selected-card border, solid SAVE badge, radio and CTA. That is four meanings.
- **Progress (full):** line, end dot, "+8 SINCE START", the session series, every history delta and every streak square. That is seven uses.
- **Settings:** "Manage subscription" text plus two optic toggles that are on by default.
- **Home:** readiness bar, CTA and tab tick. When the re-test is due, an optic "RE-TEST READY" link competes with the CTA.
- **Roadmap:** the optic rule card sits above the CTA.
- **Plan:** an optic LOGGED badge sits beside the optic Start button.
- **Marketing:** 4–5 optic marks in the first viewport at both widths (logo, CTA, glow, readiness fill, BOTTLENECK badge). Step numerals, ranks and every section-label BreakMark are optic.
- Note: DESIGN_SYSTEM.md §6's own mocks prescribe some of these (accent bullets, accent toggles), so the two docs disagree.
- **Fix:**
  - Neutralize every decorative use: paywall bullets, LOGGED badge, Settings link text, Roadmap rule card, marketing step numerals, ranks and BreakMarks.
  - Make the Home re-test link `ink` while the CTA is live.
  - On Progress, keep optic for the line and the headline delta; history deltas go to `ink-2`, streak squares to `ink`.
  - Restate the rule in DESIGN.md as "one action accent per viewport; one data accent allowed".

**P2-12 · Every screen: no shared primitives, so every screen re-types its own button, eyebrow and card**
- **Buttons:** 24 inline copies of the primary recipe, in three heights (44/52/56) with two disabled styles.
- **Eyebrows:** six recipes. The same "Readiness for 4.0" label is 11px/0.22em on the Reveal and 11px/0.16em on the Delta.
- **Cards:** eight paddings. Home alone uses three.
- **Back buttons:** a `‹` text glyph in four places, an SVG chevron in the session.
- `ui/button.tsx` is untouched shadcn (h-8/h-9, `text-sm`).
- **Why it matters:** This is why the funnel and the app feel like siblings rather than one product. Every fix above would otherwise have to be made 24 times.
- **Fix:** Build `Button` (primary/secondary/ghost/meta, one focus ring), `Input`, `Eyebrow` (screen/card/reveal), `Card` (default/accent) and `BackButton`, then retire the shadcn defaults.

**P2-13 · Every page: brand lockups disagree**
- **Marketing header:** at 375 the stacked wordmark wraps "ROAD TO / NEXT" at 24px, with "RATING" below. It is 204×48 and dominates the first 130px.
- **App, auth screens and marketing footer:** a single-line "ROAD TO NEXT" with no "RATING".
- **Logo:** the plateau stroke still uses the old `#63635E` (`brand/Logo.tsx:17`). The spec says `ink-3` (`#80807B`).
- **Fix:** One lockup component with two sizes. At 375 the marketing header should use the single-line app lockup. Fix the stroke token.

**P2-14 · Re-test error screen and `/signup`: two reachable screens are off-system**
- **`/signup`:** shadcn button at h-9, `text-sm`, a sans h1 at 24/600, centered. It is the redirect target from `auth/actions.ts:51,62`.
- **Re-test error screen:** shadcn tokens, centered. Its "Try again" discards all 12 answers (`retest/page.tsx:44-59`).
- **Fix:** Rebuild `/signup` on the Sign in recipe, or redirect it to `/start`. Give the re-test error screen the `session/error.tsx` treatment and retry the submit with the answers kept.

**P2-15 · Assessment, Reveal, auth, session: screen-reader structure breaks on phase changes**
- Home has no heading; the skill name is a `<p>`.
- The Assessment has an `h2` and no `h1`.
- `/start` swaps whole `<main>` trees with no focus move.
- The timer has `aria-live="off"`, no `role="timer"`, and auto-advances silently.
- No `role="progressbar"` on any bar.
- Save Gate and auth errors have no `role="alert"`.
- **Fix:** One `h1` per screen, focus it on phase change, and add live regions for errors and status.

**P2-16 · Reveal, Readiness beat: reduced motion is not respected**
- **What:** The count-up (a rAF loop) and the 1,100ms bar fill run even under `prefers-reduced-motion` (`Reveal.tsx:162-180,225`). Beat, question and Computing motion are gated correctly.
- **Fix:** Under reduced motion, start with the final values.

**P2-17 · Sign in and other auth pages: error text comes straight from the URL**
- **What:** `?error=` is rendered verbatim (`login/page.tsx:25-29`, `forgot-password`, `reset-password`, `signup`). Anyone can put their own sentence on your sign-in page with a link.
- **Fix:** Use keyed error codes mapped to fixed copy.

**Marketing** (details in §4)

**P2-18 · Marketing, step 03: repeats the hero's 63/100 at 96px, the largest glyph on the page**
- **What:** Step 03 shows the same reading as the hero at a bigger size, so a repeat outshouts the headline. At 1280 it is the only step that goes side by side, leaving a 304px void next to a 428px card.
- **Fix:** Drop the step 03 readout, or move readiness out of the hero. Either way, render step 03 like steps 01 and 02.

**P2-19 · Marketing, re-test readout: the payoff is undersold**
- **What:** The "+3" is 13px mono next to a 72px "66".
- **Fix:** Lead with the skill change ("The reset: 1 → 2 of 3") at metric scale, and set the delta at 20–24px Archivo.

**P2-20 · Marketing: copy repeats itself**
- **What:**
  - 854 words.
  - "twelve / 12 questions" ×8, "no signup / no account" ×5.
  - The closing section states the same fact three times in one viewport.
  - "No card to start" appears twice in the pricing section.
  - Two developer caveats about being "separate from the re-test".
- **Fix:**
  - Close with just the headline, the CTA and one caption.
  - Cut the caveats.
  - Rename "Two questions, not one" (it collides with "twelve questions").

**P2-21 · Marketing: CTA labels and the paid tier name are inconsistent**
- **What:** The free card's CTA says "Start the assessment"; the other three say "Find your bottleneck — free". The paid tier is called "The record" on marketing and "Progress" in the app.
- **Fix:** One CTA label everywhere, and call the paid tier "Progress" on marketing too.

**P2-22 · Marketing: the page runs 4,120px between CTAs at 375, and never says the absolution line**
- **What:** The longest stretch at 375 with nothing to tap is 4,120px. The page never says "it's structure, not talent", which is Principle 5 and the core of the in-app reveal.

### P3: polish

**Assessment and reveal**
- **Assessment:**
  - The progress bar shows 100% on question 12 before it is answered, and about 8% on question 1.
  - The invisible back button on Q1 is still focusable.
  - There is no way back to the site from the assessment.
- **Assessment options:** hover styles stick after a tap on touch devices. The option under the finger on the next question shows the hover state. Gate hover behind `@media (hover:hover)`.
- **Mirror beat:** "You've been at this level for: 2+ years." reads like form output. Rewrite as "You've been stuck here for more than two years."
- **Verdict:** stays 46px at 1280, with no desktop step. "Tap to continue" is wrong on desktop.

**Home and Plan**
- **Home:** "DAY 7 / 21" next to "RE-TEST OPENS IN 15 DAYS" reads as off by one, because the re-test opens on day 22 (`plan-timeline.ts`). Show "Re-test on day 22", or count days until the re-test.
- **Roadmap:** the "SOLO VERSION" badge repeats the "15 MIN · SOLO" meta and is 4.38:1 (ink-3 on surface-2).

**Progress**
- **Progress (full):**
  - A 0 change shows a blank, while the Delta screen shows an optic "0".
  - "5 weeks hitting target" sits beside 7 filled squares, and the text and squares measure different things.
  - "0 weeks hitting target" with six empty squares is a demotivating empty state.
- **Progress (full) chart:** the readiness line uses only the upper band of a tall card, so the lower half is empty. The rising "logo happening slowly" shape reads flat at +8.

**Guided session**
- **Log grid:** the practice target (7) isn't marked. The grid breaks 6 + 5 with an orphan row.

**Settings and account**
- **Delete account:** the account email is shown in uppercase mono, and uppercasing an email makes it harder to read and verify. The placeholder "DELETE" looks pre-filled.
- **Settings:**
  - The display-name row has a chevron but isn't interactive.
  - The toggle label "Email me while a session is still due" is unclear.
- **Passwords:** the minimum is 6 at sign-up and 8 at reset.

**System and docs**
- **Type sizes:** many are off the DESIGN.md ramp: 12.5, 14.5 (×8), 15.5, 22, 25, 26, 27, 30, 34, 44, plus 14 arbitrary line-heights.
  - DESIGN_SYSTEM.md §6 prescribes several of these (25/27/30/34/44/46), which DESIGN.md doesn't list.
  - The detector also flags 72 and 96, which DESIGN.md's prose allows but its frontmatter omits.
  - Reconcile the two docs and put the metric range in the frontmatter.
- **Stale surface brief:** `.impeccable/surfaces/src-app-page-tsx.md` still says "real app screenshots only" and lists screenshot capture problems that no longer apply. DESIGN_SYSTEM.md's Landing spec still carries the old headline and a mono-caps caption.
- **Hard-coded hex:** `#17171A` ×4 and the lock icon's `#9C9C97` (the old ink-2) should be tokens.

---

## 2. Screen-by-screen notes

For each screen, the notes cover type, structure, words, consistency and accent, at 375 and 1280.

| Screen | 375 | 1280 | Main issues |
|---|---|---|---|
| **Marketing** | No overflow; 9,478px tall; every measured text pair passes AA. | Holds together; 7,107px; void beside step 03. | Header wordmark wraps (P2-13). Accent overuse (P2-11). Step 03 repeats the hero (P2-18). Root-cause tautology (P1-6). Copy repetition (P2-20). CTA label drift (P2-21). |
| **Assessment Q1–12** | Clean, 24px questions; options 64px+. | Full-bleed at 1,232px (P1-3). | Free-text Qs and example-as-eyebrow (P2-4). Focus and selection semantics (P1-4). Sticky hover (P3). 5 options on Q2 vs 4 in the spec. |
| **Computing** | Good: restrained, honest lines ("One place to start."), reduced motion handled. | 440 column. | None significant. |
| **Reveal, 5 beats** | Strong type hierarchy; one dominant element per beat. | 440 column; "Tap to continue". | Not keyboard-operable (P0-1). Hint contrast (P1-4). Hard-coded "3.5" (P2-1). Mirror phrasing (P3). |
| **Roadmap** | Fine rhythm. | 600 column. | Contradictory copy (P2-2). Mono-caps header (P2-9). Optic rule card plus CTA (P2-11). Naming (P2-3). |
| **Save Gate** | Fits one screen; labels present (sr-only). | Full-bleed (P1-3). | Lowercase "Saving" title that wraps (P2-3). Stale eyebrow (P2-6). Invisible focus (P1-4). |
| **Saved result (anon)** | Clear hierarchy; good "Start over" confirm. | 600 column. | "track progress" (P1-2). Parity drift with Roadmap and Plan (P2-10). |
| **Home** | Solid; CTA clear of the tab bar. | 448 phone column, centered. | Stat label wraps (P2-9). Day math (P3). 32px gear (P2-8). |
| **Plan** | Good card rhythm. | 448 column. | Live/Solo and "two weeks" contradictions (P2-2). LOGGED badge accent (P2-11). |
| **Session brief** | Dense but readable. | Left-pinned (P1-3). | CTA below the fold (P2-7). |
| **Timer** | Big mono clock; calm. | Left-pinned. | One-tap finish, no exit, optic Pause, caps instruction (P2-5, P2-9). |
| **Log** | Clear question, 0–10 grid with `aria-pressed`. | Left-pinned. | Target not marked (P3). |
| **Confirmation** | Calm. | Left-pinned. | Ignores the logged score (P2-5). |
| **Progress, Day One** | Best-composed app screen: accent callout, honest empty chart. | 448 column. | "line to read" overclaim for free users (P1-2). Labels wrap (P2-9). |
| **Progress, locked** | Current number visible; blur treatment per spec. | 448 column. | Real data under the blur, read by AT (P1-5). Mismatched teaser lengths ("Your readiness line, over time — unlock Progress to watch the whole climb." vs "Re-test history & streaks"). |
| **Progress, full** | Chart plus history plus streak. | 448 column. | Seven optic uses (P2-11). "how close you are to 4.0" (P2-1). Streak semantics (P3). |
| **Re-test Delta, free** | Score transition reads well. | Full-bleed (P1-3). | Headline branch (P1-1). Long label headline. "+3" at 14px mono is undersized for the payoff. |
| **Re-test Delta, paid** | Per-skill card clear. | Full-bleed. | "See what to fix next" goes to Home without naming the new bottleneck; `newBottleneckLabel` is only used on the baseline screen. |
| **Paywall** | Fits one screen; honest prices. | 448 column. | Shown to paid users (P1-2). Eyebrow on a drop (P1-1). Four accent meanings (P2-11). Mono price terms (P2-9). No radio on Annual (P1-4). |
| **Settings** | Plainest screen, as specified. | 448 column. | Caption overclaims (P1-2). Three optic uses (P2-11). Dead chevron (P3). |
| **Manage subscription** | Clear consequence copy. | — | Cancel button contrast (P1-4). No back button, only "Never mind". |
| **Forgot password** | Clean. | Full-bleed (P1-3). | Invisible focus (P1-4). |
| **Delete account** | Clear inventory of what is lost; typed confirmation. | 448 column. | Safe exit below the fold (P2-7). Uppercased email (P3). |

---

## 3. What's working (keep it)

- **The reveal's writing and pacing.**
  - One idea per beat, and the verdict is the only large thing on screen.
  - The absolution beat ("This isn't a ceiling on your game — it's a shot that never got its reps, and reps are something you can schedule.") is the emotional core, and it lands.
  - Computing's honest reasoning lines are well judged. The overclaiming line was deliberately removed (`Computing.tsx:9-11`).
- **Honest proof on the marketing page.** Every product visual is live engine output on labelled example answers ("Example assessment — illustrative answers", "Illustrative re-test — not a customer result"). There are no fabricated counts or quotes.
- **Pricing copy is exact.**
  - $79/yr and $7.99/mo sit at equal weight, with "$6.58 a month… Saves 17%".
  - Nothing says "always" or "forever".
  - No price appears on the in-app unlock buttons.
- **Structure is sound.**
  - Flat by construction: no box-shadow anywhere, and the only gradient is the sanctioned LockedCard scrim.
  - `100dvh` everywhere, and no horizontal overflow at 375 on any screen.
  - The ink-2 and ink-3 contrast fixes hold: ink-3 is 4.68–5.10:1 across grounds.
- **Day One Progress and the "Start over" confirm.** These are the models for honest empty states and safe destructive actions.
- **Existing semantics are good where present:**
  - `role="switch"` on the toggles.
  - `aria-pressed` on the log grid.
  - `aria-current` on the tabs.
  - `role="img"` + a description on ShotDemo.

---

## 4. `/impeccable critique`: marketing page (`src/app/page.tsx`)

Method: dual-agent (A: design review · B: detector + browser evidence)

### Design Health Score

| # | Heuristic | Score | Key Issue |
|---|---|---|---|
| 1 | Visibility of System Status | 3 | "12 questions · about 4 minutes · no signup" sets expectations. Readouts are labelled as examples. |
| 2 | Match System / Real World | 2 | "Priority 2.8", "weighted", "· SETTLES IT", "The record" and "Paired with the reset, one plan" are model-speak. The 3.0/4.0 axis reads as a rating. |
| 3 | User Control and Freedom | 3 | Skip link, Sign in link, formula behind a disclosure. |
| 4 | Consistency and Standards | 2 | CTA labels vary. "The record" vs "Progress". Optic carries 5 meanings. Drill h3 (24px) outranks the section h2 (22px) at 375. |
| 5 | Error Prevention | 3 | "No card, no trial clock"; both prices at equal weight. |
| 6 | Recognition Rather Than Recall | 3 | The reason "The reset" beats a tied 1/3 skill arrives about 1,450px later. |
| 7 | Flexibility and Efficiency | n/a | Persuade page, single action. |
| 8 | Aesthetic and Minimalist Design | 2 | Disciplined visuals, redundant copy (854 words; "12 questions" ×8). |
| 9 | Error Recovery | n/a | No inputs or error states. |
| 10 | Help and Documentation | 3 | The priority-formula disclosure is good contextual help; its target is 21px. |
| **Total** | | **21/32 (66%)** | **Acceptable** |

### Design Specificity Verdict

**LLM assessment:**
- Content and visual language are specific to this product:
  - The plateau-break motif runs through the page.
  - Every readout is rendered by the product's own engine.
  - A generic "10 drills" app could not truthfully show the weighted-priority ledger.
- The section *order* is the standard linear/vercel template: hero → stat row → statement → three steps → features + card → two pricing cards → inverted close.
- StatRow is a logo-wall slot filled with facts, and "0 / ACCOUNT NEEDED" is filler.
- The biggest missed opportunity: the app's signature control, the option-select button, never appears. A cold visitor never answers a single question.

**Deterministic scan:** `detect.mjs --json src/app/page.tsx src/components/marketing` exited 2 with 3 findings, all `design-system-font-size`:

| Location | Size | Verdict |
|---|---|---|
| `readouts.tsx:175` | 72px | Allowed by DESIGN.md prose (Metric 56–96); missing from the frontmatter token. |
| `readouts.tsx:481` | 72px | Same as above. |
| `readouts.tsx:475` | 48px | A genuine undocumented step. |

**Visual overlays:** injection succeeded at both widths. No overlay is still visible: the detector's tab was closed and its live server stopped.

| Finding | At 375 | At 1280 | Verdict |
|---|---|---|---|
| `cramped-padding` | ×3 | ✓ | False positive: 52px fixed-height buttons. |
| `undersized-ui-text` | ×9 | ✓ | False positive: 10px mono eyebrows and badges are on-system. |
| `layout-transition` | ×1 | ✓ | **True**: `transition: width` on the readiness fill. Use `scaleX`. |
| `nested-cards` | ×2 | ✓ | Root-cause callout is sanctioned. **DrillBrief inside the Readout figure is a real card-in-card.** |
| `oversized-h1` | — | ✓ | False positive: 80px is on the documented ramp. |
| `line-length` | — | ×3 | **True, latent**: the formula paragraph runs about 149 chars per line when the disclosure is opened. The other two are false positives in practice (single lines). |

The detector missed everything that matters most here: the tautological root cause, the step-03 hierarchy inversion, the accent count and the copy repetition.

### Overall Impression
- The hook ("You don't need to fix ten things. Start with one.") and the statement ("Open play rewards what you're already good at — so the one shot gating your next level never gets the reps.") are the best writing in the product. The optic close is a real peak-end.
- The page loses the cold visitor in the middle: about 2,700px of mechanism tables at 375, a root cause that repeats their answer, and a re-test payoff set at 13px.
- **Biggest opportunity:** make step 02 say something the visitor couldn't have said themselves.

### What's Working
1. Honest, live proof, which is the right answer to "no evidence on hand".
2. The One Break close. The dark CTA on optic is the most confident element on the page.
3. Exact, calm pricing copy.

### Priority Issues
- **[P1] Root-cause readout is a tautology.** See P1-6. Command: `/impeccable clarify`.
- **[P2] Optic used 4–5 times per viewport.** See P2-11. Command: `/impeccable quieter`.
- **[P2] Step 03 repeats the hero at 96px and inverts the hierarchy.** See P2-18. Command: `/impeccable distill`, then `/impeccable layout`.
- **[P2] Re-test payoff undersold, and the 3.0/4.0 axis implies a rating.** See P2-19 and P2-1. Command: `/impeccable typeset`, then `/impeccable clarify`.
- **[P2] Copy is too heavy and repeats itself.** See P2-20. Command: `/impeccable clarify`, then `/impeccable distill`.

### Persona Red Flags

**Dana, a plateaued 3.5 player arriving from TikTok on an iPhone**
- The hero works, and its CTA at y436–488 is clear of the in-app browser chrome.
- She reads "63/100" between 3.0 and 4.0 as her own rating.
- Step 02 repeats her answer back to her.
- Her real objections, "do I need a partner?" and "how long?", are answered only in a 14px card header around y5559.
- She is never told the plateau isn't a ceiling on her game.

**Jordan (first-timer)**
- Undefined terms: "the reset", "transition zone", "Priority 2.8", "· SETTLES IT", "The record".
- "The match re-test target is a separate number, on your plan." cannot be parsed without knowing the app.

**Casey (distracted mobile user)**
- The page is 9,478px, with 4,120px at one point between CTAs.
- The disclosure's tap target is 21px.
- The header wordmark wraps to two lines and looks broken on her device.

### Minor Observations
- SectionHeading is 22px at 375, which is off the ramp.
- At 375, the Statement and the group H2 are both 26px, back to back.
- At 375 the hero glow is almost invisible: the opaque card covers it, and it shows only in the 24px gutters. The brief's "memorable moment" is barely visible on the target device.
- "re-/test" breaks at the hyphen in the pricing list at 375.
- Stale page-height comments: `page.tsx:45` says ~7,500px and `sections.tsx:36` says 8,866px.
- A returning anonymous visitor who taps "Find your bottleneck — free" lands on a bottleneck already found.

### Questions to Consider
- What if the hero let Dana answer question 1 with the real option-select control?
- What is the root-cause sentence she couldn't have written herself?
- Which would you put in a TikTok caption: "+3 readiness" or "the reset went from 1 to 2 of 3 in three weeks"?
- Where on this page is "it's structure, not talent"?
- Would anyone miss StatRow, or step 03's readout, if both were deleted?

**Trend for `src-app-page-tsx` (last 3 runs):** 25/36 (2026-08-07) → 18/32 (2026-09-05) → **21/32** (today). Snapshot written to `.impeccable/critique/2026-09-28T01-00-36Z__src-app-page-tsx.md`. The earlier run marked heuristics 9 and 10 n/a; this run marks 7 and 9 n/a, so the two totals don't cover exactly the same set of heuristics.

---

## 5. `/impeccable audit`: signed-in app and funnel

### Audit Health Score

| # | Dimension | Score | Key Finding |
|---|---|---|---|
| 1 | Accessibility | 2 | The reveal can't be advanced by keyboard (P0-1). Input focus is invisible (P1-4). Selection isn't exposed (P1-4). |
| 2 | Performance | 3 | Lean. Minor server waterfalls: Settings reads the same `profiles` row 3×; Home and Progress queries run sequentially. |
| 3 | Responsive Design | 2 | Five column widths; six screens full-bleed at 1280; session left-pinned; no safe-area handling; targets of 17–36px. |
| 4 | Theming | 3 | Tokens are mostly used. Stale `#63635E` / `#9C9C97`, `#17171A` ×4, shadcn tokens on 2 screens. |
| 5 | Implementation Integrity | 2 | No shared primitives. The paid breakdown is unreachable after purchase and shipped to free clients. The "moved" headline is unconditional. |
| **Total** | | **12/20** | **Acceptable: significant work needed** |

**Implementation integrity verdict: identity passes; consistency and entitlement fail.**
- **Identity (pass):** the product's identity is clearly expressed:
  - Three type voices, flat surfaces, a reveal-only dark ground.
  - No shadows and no italics.
  - Honest copy with no AI claims.
- **Consistency (fail):** the system isn't encoded in reusable parts, so it drifts screen by screen.
- **Entitlement (fail):** the paid surfaces aren't delivered to paying users, or withheld from free ones (P0-2, P1-5).

**Detector:**
- `detect.mjs` over the in-scope `src/app` and `src/components` exited 2 with 16 advisory `design-system-font-size` findings.
- 72px ×3 and 96px ×1 are false positives: DESIGN.md's prose sanctions the Metric range, but its frontmatter lists only 56.
- The rest are real ramp drift (34 / 30 / 25 / 27 / 44), and DESIGN_SYSTEM.md §6 prescribes it, so the two docs disagree.
- The detector misses fractional sizes (12.5, 14.5, 15.5) and all colour, focus, accent and semantics issues.

**Counts in this report:** P0 ×2 · P1 ×6 · P2 ×22 · P3 ×15 bullets. Several P1 and P2 items bundle related sub-issues.

**Patterns:**
- **Missing primitives:** covered in P2-12.
- **Focus is an afterthought:** 1 of 24 primary buttons sets `focus-visible`.
- **Two design docs disagree:** on sizes, eyebrow sizes and accent use.
- **Entitlement is decided on the client.**
- **Desktop is unspecified:** only 2 in-app `md:` rules exist.

**Recommended commands, in priority order**
1. `/impeccable harden`: the reveal's keyboard path, focus rings, selection semantics, server-side paid data, live regions, keyed auth errors.
2. `/impeccable clarify`: Delta and paywall branching, the entitlement overclaims, the rating overclaims, plan-copy contradictions, the marketing root cause.
3. `/impeccable adapt`: one column token, `mx-auto` on the session, safe areas, sticky session CTA, 44px hit areas.
4. `/impeccable colorize`: Cancel button, Solo badge, stale hexes.
5. `/impeccable polish`: extract Button, Input, Eyebrow, Card and BackButton, plus `InGameRuleCard` / `RetestCard` / `SessionHeader`; rebuild `/signup` and the re-test error screen.
6. `/impeccable quieter`: accent discipline on Paywall, Progress, Settings, Roadmap, Plan and marketing.
7. `/impeccable typeset`: long mono caps to sentence case; collapse headline sizes onto the ramp.
8. `/impeccable animate`: reduced motion on the readiness count-up and fill.
9. `/impeccable document`: reconcile DESIGN.md with DESIGN_SYSTEM.md, put the metric range in the frontmatter, refresh the stale surface brief.
10. `/impeccable polish`: final pass.

---

## 6. Top 10 fixes, in order

1. **Make the reveal keyboard-operable** (P0-1). Add a real Continue button on every beat, key handlers, and focus on the beat heading. Without it, part of your audience never sees the diagnosis.
2. **Deliver the per-skill breakdown after purchase** (P0-2).
   - Persist deltas.
   - Give each re-test a stable result route, or make Progress history rows expand.
   - Send the paywall's `from` back to it.
3. **Make the Delta and Paywall copy branch on the result** (P1-1).
   - Up / held / down headlines, using the short skill title.
   - Neutral 0.
   - No "You're improving" after a drop.
   - On a drop, the CTA goes to the plan.
4. **Remove every entitlement overclaim** (P1-2).
   - "track progress" on the Saved result.
   - "a line to read" on Day One.
   - "change plan / update billing" in Settings.
   - A purchase screen for paid accounts.
   - "measured against today" on paywall success.
5. **One centered column on every standalone screen at desktop** (P1-3). Assessment, Save Gate, auth, Delta and the session should all use the 448 app column.
6. **Focus, selection and contrast pass** (P1-4).
   - An optic `:focus-visible` everywhere.
   - Radio semantics on assessment options and paywall plans.
   - Fix the Tap-to-continue hint and the Cancel button contrast.
7. **Stop sending paid data to free clients** (P1-5). Withhold it server-side, put placeholders under the blur, and mark locked cards `aria-hidden` + `inert`.
8. **Stop implying a rating the product doesn't measure** (P2-1, P1-6).
   - Interpolate the player's band instead of hard-coding "3.5".
   - Relabel the 3.0/4.0 axis.
   - Reword "how close you are to 4.0".
   - Rewrite the marketing root cause as a mechanism.
9. **Unify the plan objects and fix the plan copy** (P2-2, P2-3, P2-10).
   - One skill name per context.
   - Shared In-game rule, Re-test and Session header components across Roadmap, Saved result and Plan.
   - Fix "or the partner", "Live" on a solo drill, and "next two weeks" under "this week".
10. **Extract primitives, then run an accent pass** (P2-12, P2-11).
    - Build Button, Input, Eyebrow, Card and BackButton.
    - Then strip decorative optic: paywall bullets, Progress deltas and streak, Settings link text, Roadmap rule card, LOGGED badge, marketing numerals and BreakMarks.
    - Restate the One Accent Rule in DESIGN.md so the two docs agree.
