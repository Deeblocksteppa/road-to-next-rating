---
name: critique
description: Read-only critique of the app (or a named part of it) against ten criteria, with numbered 375px screenshots and findings ranked high, medium, low, saved to audit/. Use when asked to critique, review or audit screens or flows.
argument-hint: "[scope, e.g. 'signed-in tabs' or 'paywall flow'] (default: the whole app except the landing page)"
---

# Critique

The format is the one in `audit/app-critique.md`. Read it first and match its shape and tone. Change no code.

## Criteria

Judge every screen on all ten. Each finding names the criteria it falls under.

1. **Repetition.** The same information, component or plan shown more than once, or one card shape repeated until screens blur together.
2. **Hierarchy.** One dominant element per screen; the eye knows where to land first; the accent marks the one thing that matters.
3. **Layout.** Each screen has its own shape; alignment, spacing and radius follow DESIGN.md; holds at 375 and 1440.
4. **Wordiness.** Sentences that don't earn their place, footnotes explaining other copy, labels that restate the heading.
5. **Copy.** No em dashes, one name per concept across the app, CTAs say what happens next, structure-not-talent tone.
6. **Accuracy.** Every claim matches what the code does: engine routing and story lines (CLAUDE.md rule 5), readiness, the session definition, what is free and paid. Nothing overclaims.
7. **Flow.** The player can always find the next step; no dead ends; gates say honestly what they need.
8. **Landing consistency.** The app keeps the landing page's promises and matches its visual language.
9. **Readability.** Body at least 16px, contrast tokens, clean wraps at 375, mono caps kept short.
10. **Paid value.** The free and paid split matches PRODUCT.md; the paywall sits at peak motivation; desire, not resentment; no pressure moments.

## Method

1. **Scope.** `$ARGUMENTS`, or the whole app except the landing. Note the commit (`git rev-parse --short HEAD`) and date.
2. **Player profile.** Pick a realistic player (rating, practice habits, partner) and say which bottleneck and root cause the engine gave.
3. **Walk it in order.** `preview_start` `dev`, viewport 375×812. Anonymous funnel first, then signed-in states with `/test-user` (add `paid` for paid screens). Capture empty states before data exists.
4. **Screenshots.** Save to `audit/<slug>-screens/NN-<screen>-<state>.jpg`, numbered in the order a player meets them, full page where the screen scrolls. Use headless Chrome (`/Applications/Google Chrome.app`) over CDP from a script in the scratchpad when files are needed; the browser pane's screenshots are not saved to disk. Add 1440 shots where desktop layout is part of the finding.
5. **Read the code behind each claim** before calling it inaccurate: cite `file` and the function or constant.
6. **Clean up.** Run `/test-user` cleanup and record what was verified. Nothing artificial (moved dates, skipped timers) counts as a finding; say what was faked and why.

## Write-up

Save to `audit/<slug>-critique.md`:

- Title, scope line (commit, date, "No code was changed."), link to the screens folder.
- **How this was tested**: profile, funnel, signed-in, paid, cleanup, anything not reproduced.
- **Verdict**: three or four bullets on what works and where players get lost.
- **High / Medium / Low impact**: numbered H1…, M1…, then a short low list. Each high and medium finding has **Screens** (linked), **Criteria**, **Problem**, **Why it matters**, **Fix**. Rank within each band by player impact.
- **Fix plan**: batches, each a set of finding ids that ship together.

Follow CLAUDE.md in the write-up itself: no em dashes, plain sentences. Then tell the user the file path and the top three findings in one line each.
