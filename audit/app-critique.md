# App critique: first run to paid

Read-only review of the app (everything except the landing page) at `main` `19b8455`, 2026-10-25. No code was changed.

Screenshots are in [`app-screens/`](app-screens/), 375×812 at 2x, full page where the screen scrolls. File numbers follow the order a player meets them.

## How this was tested

- **Player profile.** I played a first-time 3.5 who mostly warms up and rallies and has no regular drilling partner. The engine gave third-shot drop × random drilling, a solo plan, readiness 66.
- **Anonymous funnel.** Assessment, computing, all five reveal beats, plan preview, save form, saved result. For the "check your inbox" screen, the sign-up request was answered inside the test browser, so no account was created and no email was sent.
- **Signed-in states.** A temporary confirmed test user was created with the Supabase admin API and signed in through a one-time link to the local `/auth/confirm` route. No password was typed anywhere. Empty states were captured first, then the saved result was attached to the account. A full guided session was run, with the 15-minute timers skipped using browser virtual time.
- **Re-test.** To reach the "re-test open" states, the test plan's re-test date was moved to today. That is why screens 40–42 read "Week 1 of 1" and "Day 1 / 1"; those numbers are an artifact, not a finding. Two re-tests were taken: up 66 → 70, then 70 → 70.
- **Paid.** Stripe test mode, card 4242 4242 4242 4242, then the paid Progress, re-test result and Settings screens.
- **Cleanup, done through the app's own screens.** I cancelled the subscription, then deleted the account. I verified afterwards that the auth user returns 404, the profile, assessment, diagnosis, plan and drill-session rows are 0, and the Stripe test subscription status is `canceled`. A test-mode Stripe customer record remains.
- **Not reproduced.** On the very first re-test, the page bounced back to question 1 instead of opening the result. The second re-test landed correctly. It looks like a first-compile artifact of the dev server, so it is not counted as a finding.

## Verdict

The core idea survives contact: the reveal is strong, the drills are clear, and the guided session is calm. The loop around it is where a first-time player gets lost.

- **The free plan can't be used without an account.** A player who skips sign-up can't run a single session. The save screen implies they can.
- **The re-test is hard to find on the day it opens.** Once that day's session is logged, Home stops offering it.
- **A finished re-test switches the player to a new skill without ever explaining why.**
- **The free re-test result doesn't say whether the trained skill moved.** Its main button is the upgrade.

Visually, the signed-in app is the card-stack pattern the landing page just moved away from. Every screen is the same rounded rectangle repeated, so Home, Plan, Progress and Settings blur together.

---

## High impact

### H1. A player who skips sign-up has a plan they cannot start
**Screens:** [15 plan preview](app-screens/15-roadmap-plan-preview.jpg), [16 save form](app-screens/16-savegate-form.jpg), [17 saved result](app-screens/17-saved-result.jpg), [76 /session signed out](app-screens/76-session-signed-out.jpg)

**Problem.** The saved result shows two drills with "View instructions" and nothing to start or log a session. Guided sessions and logging require an account; `/session` redirects to sign-in. Yet the save form says "Skip it and your plan stays on this one," and the result says an account lets you open your plan and logged sessions "on any device." Both imply the plan works on this device without one. The landing page lists "Guided sessions with drill demos and logging" as free.

**Why it matters.** "Not now" is the most likely tap for a cold visitor. They land on a plan with no way to begin, and the first thing they try fails.

**Fix.** Pick one:
- (a) Let anonymous players run the guided session and keep logs on the device, claimed at sign-up like the plan already is.
- (b) Say it plainly: put a "Start session" button on the saved result that opens the save form, worded as "Sessions and logging need a free account," and change the gate copy so it no longer implies the plan works without one.

(a) matches the landing page's promise; (b) is the smaller change.

### H2. On the day the re-test opens, Home can hide it, and Progress has no button
**Screens:** [40 Home, re-test open](app-screens/40-home-retest-open.jpg), [41 Plan](app-screens/41-plan-retest-open.jpg), [42 Progress, open now](app-screens/42-progress-retest-open.jpg)

**Problem.** Home's only re-test entry is the caption under the session button. Once today's session is logged and the week isn't finished, that caption becomes "1 more session this week — any other day" (`home/page.tsx`, the `caption` logic), and "Re-test ready — take it now" never shows. Progress shows "OPEN NOW" in its accent card with no button, and keeps the future-tense copy ("This is the day you find out… Everything until then is building toward it"). Plan has no re-test entry at all.

**Why it matters.** The re-test is the payoff of three weeks and the only path to a new plan and to the paid upgrade moment. A player who trains on re-test day can't find it.

**Fix.** Whenever the re-test is open, show a re-test card above Today on Home, independent of session state. Give the Progress card a "Take your re-test" button and present-tense copy. Add the same banner at the top of Plan.

### H3. The re-test changes the skill without telling the player why
**Screens:** [45 free result](app-screens/45-retest-result-free.jpg), [55 paid result](app-screens/55-retest-result-paid.jpg), [47 Home after re-test](app-screens/47-home-after-retest.jpg), [50 new plan](app-screens/50-plan-new-bottleneck.jpg)

**Problem.** After the re-test, the only explanation is "Your next plan works on your patience in the soft game." Home and Plan switch to new drills. The new diagnosis's story (verdict, insight, absolution) is computed and saved but never shown anywhere. The app's best feature, explaining why, only ever runs once.

**Why it matters.** The product promise is "one bottleneck, and why." On the second cycle, the player gets a new skill with no reason. That reads as arbitrary right when they're deciding whether the product works.

**Fix.** From the re-test result, run beats 2–4 of the reveal for the new focus before the plan opens ("Here's what's next, and why"). Keep the insight headline as one line on Home under the skill name.

### H4. The free re-test result hides whether the trained skill moved, and leads with the upgrade
**Screens:** [45 free result](app-screens/45-retest-result-free.jpg), [48 paywall](app-screens/48-paywall.jpg)

**Problem.**
- After three weeks on the drop, the free result shows "66 → 70 +4" and a blurred box. Whether the drop moved, the one thing they trained, is behind the paywall.
- The primary optic button is "See the full breakdown." The way forward ("Go to my plan") is the quiet secondary link.

**Why it matters.**
- This is the first time a player finds out if the plan worked. Withholding the answer to their own question reads as a trap, not "desire, not resentment" (PRODUCT.md).
- Making the upsell the main action at this moment is the pressure the paid-value lens warns against.

**Fix.**
- Show the target skill's row free (before → after, ±).
- Lock the other three rows and the history.
- Make "See my next plan" the primary button and the breakdown a secondary text link with its price-free teaser.

### H5. The readiness number implies a scale and precision it doesn't have
**Screens:** [14 readiness beat](app-screens/14-reveal-5-readiness.jpg), [17 saved result](app-screens/17-saved-result.jpg), [26 Home](app-screens/26-home-after-save-toast.jpg), [54 paid Progress](app-screens/54-progress-paid.jpg)

**Problem.**
- Readiness is shown "/100" on a bar labelled 3.0 at one end and 4.0 at the other. The formula (`engine.ts`) is 40 + levels × 45/12, so the floor is 40 and perfect answers give 85; no player can reach 100.
- The bar invites reading 66 as "about a 3.66 rating."
- Paid Progress draws a dashed "80" target line (`READINESS_TARGET`) that is never explained.

**Why it matters.** A player who rates themselves top on everything sees 85/100 and wonders what is missing. One who decodes the bar as a rating gets a number the product cannot stand behind (PRODUCT.md: "never overclaim").

**Fix.**
- Remove the 3.0/4.0 end labels, or relabel the bar "0–100 readiness, not a rating estimate."
- Add one line where the score is first shown: "A score from your answers, so you can compare re-tests. It is not a DUPR estimate."
- Either rescale to the real 40–85 range or state it.
- Explain or remove the 80 line.

### H6. Stripe Checkout describes the subscription as including plans, which are free
**Screen:** [51 Stripe Checkout](app-screens/51-stripe-checkout.jpg)

**Problem.** The product text on the checkout page reads "Full progress tracking, re-test history, and sequenced training plans." Plans are free and regenerated on every re-test; the landing page and paywall both say so.

**Why it matters.** It is the last thing a buyer reads before paying, and it contradicts what they were told. That is a trust and refund risk.

**Fix.** Edit the product description in the Stripe dashboard to match the paid list: per-skill breakdown on every re-test, readiness chart, re-test history, streaks. This lives in Stripe, not in the code, so it is easy to miss.

### H7. The signed-in app is one card repeated, and doesn't feel like the redesigned landing page
**Screens:** [27 Home](app-screens/27-home.jpg), [28 Plan](app-screens/28-plan.jpg), [39 Progress](app-screens/39-progress-day-one.jpg), [54 paid Progress](app-screens/54-progress-paid.jpg), [56 Settings](app-screens/56-settings-paid.jpg)

**Problem.**
- Home is four rounded cards: skill, readiness, sessions, today.
- Plan is four: drill, drill, rule, target.
- Progress is three or four, and Settings is four grouped cards.
- Every one has the same radius, border, padding and mono eyebrow, so no screen has a shape of its own. The landing page now uses hairlines, open space and one dominant element per section.

**Why it matters.** Screens blur together, so the player has to read every eyebrow to know where they are. Coming from the landing page, the app feels like a different, older product.

**Fix.** Give each tab one dominant element and drop the outer cards around everything else, as the landing page did:
- **Home:** today's session leads; the skill and readiness become one quiet header line.
- **Plan:** the drills become rows with hairline dividers, not cards.
- **Progress:** the chart or re-test date becomes the page, not a card.

Keep a card only where it is a real object, such as the drill brief.

---

## Medium impact

### M1. The first run shows the same plan three times in two different designs
**Screens:** [15 plan preview](app-screens/15-roadmap-plan-preview.jpg), [16 save form](app-screens/16-savegate-form.jpg), [17 saved result](app-screens/17-saved-result.jpg)

**Problem.** The plan preview, the save form's summary card and the saved result all restate the plan. The preview draws "In your games" as an accent-bordered card and the re-test as a card; the saved result, one tap later, draws the same content as a dot marker and plain text.

**Fix.** Merge the plan preview and the saved result into one screen, with the account prompt as a single block on it. Use one treatment for the rule and the re-test.

### M2. "I'm in — let's go" opens a sign-up form
**Screen:** [15](app-screens/15-roadmap-plan-preview.jpg) → [16](app-screens/16-savegate-form.jpg)

**Problem.** The player commits to the plan and gets an account wall instead.

**Fix.** Label it for what happens next ("Save my plan"), or open the saved result directly and offer the account there.

### M3. The reveal's biggest word breaks mid-word
**Screen:** [11 verdict](app-screens/11-reveal-2-verdict.jpg)

**Problem.** "Third-shot drop" at 46px wraps as "Third-" / "shot drop" at 375px, on the one screen where the skill name is the only big thing.

**Fix.** Set the title with `hyphens: none` and a size that fits the longest title ("Soft-game patience") on one or two clean lines at 375px, or add a non-breaking hyphen in the titles.

### M4. Em dashes throughout the app
**Screens:** most. About 60 strings render one, for example:
- the answer options ("1–3 — most sit up…")
- "In your own words —"
- "I'm in — let's go", "Not now — keep it on this device"
- "Week 1 of 3 — Volume and feedback", "1 more session this week — any other day", "Re-test ready — take it now"
- the timer cue ("lift gently — arc, not power")
- "Continue — $79/year"
- the payment success text, the cancel screen, and "READINESS — 1 WEEK"

**Fix.** The same sweep the landing page got: periods, commas or "·". The answer options can drop the dash entirely ("1–3: most sit up or go into the net").

### M5. One thing, several names
**Problem.**

| Concept | Names used |
|---|---|
| The score | Readiness / Readiness for 4.0 / Assessment baseline / Readiness now |
| The skill | Bottleneck / Your recommended focus / Current bottleneck |
| The weekly rule | In your games / In-game rule |
| The re-test goal | Re-test · in 3 weeks / Match re-test target / Target: 5+ |
| Ways back to the plan | Go to my plan / See my next plan / Back to plan |
| Re-test history | Full re-test / Re-test 2 |

**Why it matters.** A player can't tell whether two labels are the same thing.

**Fix.** One name each, used everywhere. Suggested: "Readiness", "Your focus", "In your games", "Re-test goal", "Back to my plan", and "Re-test 1, 2, 3".

### M6. Body text in the app is mostly under 16px
**Screens:** most signed-in screens.

**Problem.** App components use 15px in 96 places and 13–14px in 74. That includes drill descriptions, the timer copy, the log hint, Settings helper text and the saved result's secondary lines. The landing page now holds 16px for every sentence.

**Fix.** Raise in-app body to 16px and secondary text to at least 15px. Keep mono labels as they are.

### M7. Three different "targets" on the session brief
**Screens:** [29 brief](app-screens/29-session-brief-drill1.jpg), [28 Plan](app-screens/28-plan.jpg)

**Problem.** The brief shows "Practice target 7 of 10" and then "The match re-test target is a separate number, on your plan." The Plan says "Match re-test target … Target: 5+." That is two targets and a footnote about the difference. The landing page already dropped the footnote.

**Fix.** Remove the footnote from the brief. On the plan, call the second one "Re-test goal" and explain it once.

### M8. Session complete has no payoff
**Screen:** [36](app-screens/36-session-complete.jpg)

**Problem.** "Session logged. 1 of 2 sessions this week." The 6/10 and 5/10 the player just logged aren't shown, nor how they compare with the practice target or with last time.

**Fix.** Show each drill's number against its target, plus last time's number when there is one ("Basket Drop Drill 6/10 · target 7 · last time 4"). That is the moment the habit is formed.

### M9. The week label promises a progression that doesn't exist
**Screens:** [27 Home](app-screens/27-home.jpg), [28 Plan](app-screens/28-plan.jpg)

**Problem.** "Week 1 of 3 — Volume and feedback" is a fixed label per skill (`WEEK_FOCUS_LABELS`). Weeks 2 and 3 say the same thing, and the session is identical all three weeks. Plan uses it as the page title.

**Fix.** Title the Plan with the skill. Say "Week 1 of 3 · same session each week, beat your count," which the saved result already says, and drop the theme label.

### M10. After the reveal, the "why" disappears from the app
**Screen:** [27 Home](app-screens/27-home.jpg)

**Problem.** Home shows the skill name and nothing of the insight. A player returning on day 5 has no reminder of why this skill.

**Fix.** Show one line under the skill name (the insight headline, for example "The drop gets practiced, never measured.") with a "Replay" link.

### M11. "Plan saved." appears above "No diagnosis yet."
**Screen:** [22](app-screens/22-home-empty-signed-in.jpg)

**Problem.** `/auth/confirm` adds `?saved=1` to every confirmed sign-up. A player who signed up through `/signup` without an assessment, or whose claim failed, sees "Plan saved. It's on your account now" over an empty state.

**Fix.** Show the banner only when a claim actually happened, which `claimSignupRecords` already reports.

### M12. `/signup` is a leftover screen
**Screen:** [70](app-screens/70-signup.jpg)

**Problem.** It has a different style: smaller button, no logo, placeholder-only inputs. It also promises "Save your diagnosis" to someone who has none.

**Fix.** Redirect `/signup` to `/start`, or restyle it as the save form with assessment-first copy.

### M13. Paid Progress promises things a new subscriber can't see yet
**Screens:** [48 paywall](app-screens/48-paywall.jpg), [54 paid Progress](app-screens/54-progress-paid.jpg)

**Problem.**
- The paywall sells "readiness chart … with logged sessions beneath it," but that series only draws once a drill has two scored sessions.
- "0 weeks hitting target" never says what the target is: two full sessions a week.
- The chart's dashed "80" line is unexplained.

**Fix.**
- Show the session series as soon as there is one point, with an empty-state line ("Log another session to see the trend").
- Say "Weeks with 2 sessions" instead of "hitting target".
- Label or remove the 80 line.

### M14. "Manage subscription" only cancels
**Screen:** [57](app-screens/57-settings-manage-subscription.jpg)

**Problem.** The row opens straight to "Cancel your subscription?" There is no way to see receipts, the payment method, or to switch between annual and monthly.

**Fix.** Link the Stripe customer portal for billing details and keep cancel as one option. Otherwise, rename the row "Cancel subscription."

### M15. The 404 page is Next.js's default
**Screen:** [61](app-screens/61-not-found.jpg)

**Problem.** It is pure black with system type, no brand and no way back. A stale re-test link or a mistyped URL leaves the player stranded.

**Fix.** Add a `not-found.tsx` in the app's style with "Go to Home" and "Take the assessment."

### M16. The mirror beat reads like a form readback
**Screen:** [10](app-screens/10-reveal-1-mirror.jpg)

**Problem.** "You've been at this level for: 1–2 years." and "On court, your time looks like: a real mix of both." are colon-separated echoes of option labels under the heading "In your own words —", though only the third line is in their own words.

**Fix.** Write each line as a sentence ("You've been stuck for 1–2 years."). Title the beat "What you told us" and drop the duplicate heading.

### M17. Two taps per question
**Screens:** [03](app-screens/03-assessment-q2-options.jpg)–[05](app-screens/05-assessment-skill-question.jpg)

**Problem.** Ten option questions each need a select, then "Next": twenty taps for a four-minute promise.

**Fix.** Advance automatically about 250ms after a selection, keeping the back button for corrections.

---

## Low impact

1. **Reveal footer** ([11](app-screens/11-reveal-2-verdict.jpg)–[13](app-screens/13-reveal-4-absolution.jpg)): "Tap to continue" sits off-centre whenever "Back" is shown. Centre it independently of the back control.
2. **Assessment Q1** ([01](app-screens/01-assessment-q1-empty.jpg)): no logo, no way back to the landing page, no "about 4 minutes." Add the wordmark and a time expectation.
3. **Selected answer** ([04](app-screens/04-assessment-q2-selected.jpg)): the optic border plus the focus ring draws a heavy double outline on tap. Show the ring on keyboard focus only.
4. **Log grid** ([33](app-screens/33-session-log-drill1.jpg)): 0–10 in rows of six leaves "10" orphaned. Use a single segmented row, or rows of six and five.
5. **Settings** ([56](app-screens/56-settings-paid.jpg)): a long email wraps into the label column. Stack label and value on narrow screens.
6. **Sign-in** ([67](app-screens/67-after-account-deleted.jpg), [75](app-screens/75-home-signed-out.jpg)): "Welcome back." greets first-timers redirected from a protected page, and a player who just deleted their account. Use neutral "Sign in" copy.
7. **App header** ([27](app-screens/27-home.jpg)): the compact wordmark reads "ROAD TO NEXT", which looks like a truncated name. Use the full mark or the glyph alone.
8. **Re-test history** ([62](app-screens/62-progress-paid-two-retests.jpg)): "Full re-test" next to "Re-test 2". Number them all.
9. **Timer** ([30](app-screens/30-session-timer-running.jpg)): a large empty middle, and the progress bar is the thinnest element on screen. Let the countdown and its ring or bar own the space.

---

## Fix plan

### Batch 1: the loop works and tells the truth (H1–H6, M11)
1. Let anonymous players run and log sessions on the device, or gate them honestly with a "Start session" button that explains the free account (H1).
2. Show the re-test entry wherever it is open: Home card, Progress button with present-tense copy, Plan banner (H2).
3. After a re-test, show the new focus's verdict, insight and absolution before the new plan, and keep the insight line on Home (H3, M10).
4. Make the trained skill's movement free on the re-test result, and make "See my next plan" the primary action (H4).
5. Readiness: drop the 3.0/4.0 end labels, add the "not a rating estimate" line, and explain or remove the 80 target (H5).
6. Fix the Stripe product description in the dashboard (H6).
7. Show the "Plan saved" banner only after a real claim (M11).

### Batch 2: one product, one language (H7, M1–M9, M12–M14)
1. Rebuild Home, Plan and Progress with one dominant element each and hairlines instead of card stacks, matching the landing page (H7).
2. Merge the plan preview and the saved result, and relabel "I'm in" (M1, M2).
3. Run the em-dash sweep and one-name-per-concept pass across all app copy, including the assessment options (M4, M5).
4. Raise app body text to 16px (M6).
5. Simplify targets on the brief and plan, and replace the week-theme label (M7, M9).
6. Add a session-complete recap with numbers against targets (M8).
7. Retire or restyle `/signup`, fix the paid Progress empty states, and decide on "Manage subscription" (M12–M14).

### Batch 3: polish (M3, M15–M17, Low)
1. Verdict title wrapping, branded 404, mirror rewrite, auto-advance on answers (M3, M15–M17).
2. The nine low items above.
