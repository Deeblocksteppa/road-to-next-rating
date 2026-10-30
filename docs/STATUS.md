# Status

Updated 2026-10-29 · `main` at `fad4f6b` · `batch-2` done (Phases A, B, C, the fix round and the Codex blocker fixes committed and pushed, not merged)

## Current state

- **Landing page:** redesigned and polished (`d5596de`, `19b8455`). Every example carries an `ExampleTag`.
- **Engine and content:** every skill × root cause pair has an authored story, story lines are keyed to the answer they quote, and solo players get two different drills per session (`6257e2b`, `1ca3f7f`, `8e58ba3`, `d100155`, `d4d25bc`). `audit/content-audit.md` predates these fixes and has not been re-run.
- **App, batch 1 of `audit/app-critique.md`:** done in `1434644` (H1–H5, M11). Sessions without an account are gated honestly, the re-test shows wherever it is open, a new focus gets its reveal, the free re-test result shows the trained skill, readiness runs 0–100 with no rating labels.
- Readiness migration (20261025120000) was run on the production database on 2026-10-27; stored readiness values are on the 0–100 scale.
- **Codex review of `1434644`:** fixed in `9f63d5e`, copy reviewed. The re-test result shows both reset answers (kitchen line, mid-court), each with its own change; it falls back to stored levels ("1/3 → 1.5/3") when answers are missing, for free and paid, and the paid breakdown no longer drops the trained skill. Home shows "Plan saved" only when the latest plan belongs to the diagnosis on show.
- **Batch 2, Phase A** (branch `batch-2`, not merged): em-dash sweep of app copy and assessment options (every row of `audit/batch-2-plan.md` except row 11, the plan preview Phase B removes), an explicit `short` on every skill-question option (the re-test rows and the third-shot goal no longer parse labels), 16px body text outside the screens Phases B and C rebuild, hyphenated skill titles kept whole, the hero glow removed, `/verify`'s button and link rules. **Migration `20261028120000_plan_text_em_dashes.sql` is written but not run** on production.
- **Batch 2, Phase B** (branch `batch-2`, not merged): one `PlanView` at `/start` (after the reveal, no forced save form) and `/plan`; the plan preview (`Roadmap.tsx`), `SavedResult.tsx` and `SessionDrills.tsx` are gone, as is `WEEK_FOCUS_LABELS`. Home is today's session plus a quiet skill header; readiness moved to the plan screen. Names on these screens and the ones they link to: "Your focus", "Readiness", "In your games", "Re-test goal", "Back to my plan". One accent per screen; an open re-test takes it and every Start goes secondary. New copy is **unreviewed** (listed in the Phase B report). Claim check passed via both entries, but sign-in was by `/test-user` magic link, so the form's own `signUp` call was not exercised. Codex review recommended.
- **Batch 2, Phase C** (branch `batch-2`, not merged): Progress rebuilt in hairlines, one dominant element per state (the re-test date on Day One; readiness now on locked and full, with the chart under it for paid); free + re-test open makes the re-test primary and "Unlock Progress" secondary. The session recap shows each drill's logged count against its target and "Last time" (omitted on a drill's first logged session; free), and its main element is what comes next (another day, Monday, or the open re-test). Equal before/after reads a neutral mono NO CHANGE with both values on the re-test headline, every trained and paid row, Progress history and since-start (no "+0", no accent; "Same answer" retired). Paid streak renamed "Weeks with both sessions". Locked cards use a flat `rgba(19,19,21,0.6)` cover over placeholders; DESIGN.md, `Design/DESIGN_SYSTEM.md` and `/verify` no longer allow a scrim gradient. The save form's first line now says "Saving creates a free account." New copy is **unreviewed** (Phase C report). Leak check passed: a free user with paid data on the server had none of it in `/progress` or `/retest/[id]` HTML or RSC payload. Recap data was exercised through the real guided session; re-test readings were seeded with a scratch script that mirrors `submitRetest`. Codex review recommended.
- **Batch 2 fix round** (branch `batch-2`, not merged): the re-test is gated on the server. Before, `/retest` was a client page with no date check and `submitRetest` checked only sign-in, so any signed-in player could take a re-test early by typing the URL or calling the action. Now `isRetestOpen` (`src/lib/retest-gate.ts`, latest plan by `created_at`, `daysUntilRetest <= 0`, closed when `retest_date` is null) makes `/retest` redirect to `/plan` and makes `submitRetest` throw. Checked by calling the action directly: rejected with a future date and with a null date, accepted on the date; the real UI re-test still lands on `/retest/[id]`. Also: Progress Day One with no date shows only "Not scheduled" (no week, day or "find out" line); paid streak at 0 reads "Your first full week starts it."; remaining "streaks" now "weeks with both sessions"; Settings links neutral, email stacked; save form's dot neutral and, from "Start session", one line that sessions need an account; wall drills show no court diagram; `test-user.mjs status <email>` works after deletion. Codex review recommended.
- **Codex blockers on `807fc3d`** (branch `batch-2`, not merged): (1) sign-up could claim a diagnosis without its plan. The plan was saved only if the diagnosis id had landed by the end of the reveal, nothing waited on any save, and every claim cleared the device result even when the set was partial. Now `saveAnonymousResult` (`src/lib/persistence.ts`) is one shared promise that saves the missing rows in order, retrying each insert three times with a fixed id (a duplicate key counts as saved). It starts when the assessment ends. "Start session" and "Save my plan" wait on it ("Saving…", both disabled) and on failure show the generic error and stay on the plan. The form sends only the complete set. The device result is cleared only after all three are claimed, and Home's `ClaimOnLoad` saves any missing row before claiming. (2) Re-test double submit: the new plan records `source_plan_id`, unique per `(user_id, source_plan_id)` (`20261029120000_retest_source_plan.sql`, **written, not run**). A losing submit deletes its own rows and returns the winner's diagnosis id. The logic moved to `src/lib/retest-save.ts`. Old plans are retired after the insert and only up to the source plan's `created_at`. Without the migration it saves as before (no guard). The assessment's last button disables after the first tap. Checked: slow plan save (60 s and 30 s, via both buttons) and a failed plan save in the real UI; the concurrent re-test with the migration in PGlite (Postgres in WASM) and without it on the real project. New copy: "Saving…" on both buttons, **unreviewed**. Codex review recommended.
- **Claude Code setup:** `CLAUDE.md`, skills `/verify` `/test-user` `/critique` `/ship`, subagent `reviewer`, this file.
- **Codex setup:** `AGENTS.md` makes Codex a read-only reviewer that follows `CLAUDE.md` and reports Blockers / Should-fix / Nits. `CLAUDE.md` tells Claude to end its report with "Codex review recommended: [branch or commit]" for auth, billing, engine or main-screen changes.

## Outstanding

**Batch 1 leftover**
- [ ] H6: Stripe product description still says plans are included. Edit it in the Stripe dashboard (not code), then check Checkout.

**Batch 2: one product, one language** (`audit/app-critique.md`)
- [x] H7: Home, Plan, Progress get one dominant element each and hairlines instead of card stacks (Phases B and C)
- [x] M1, M2: plan preview and saved result merged into `PlanView`; "I'm in" removed with the preview (Phase B)
- [x] M4: em-dash sweep (Phase A); the last one left with `Roadmap.tsx` in Phase B
- [ ] Run `supabase/migrations/20261028120000_plan_text_em_dashes.sql` on production (row-count query in its header)
- [ ] Run `supabase/migrations/20261029120000_retest_source_plan.sql` on production (pre-check queries in its header). Until then a double re-test submit still writes two results
- [ ] M5: one name per concept. Home, the plan and the screens they link to done (Phase B); left: re-test history labels, the landing's "Readiness for 4.0", DeltaScreen's "See my plan" / "See my next plan"
- [x] M6: app body text to 16px (Phases A, B and C)
- [x] Remove the landing hero's decorative gradient glow (Phase A)
- [ ] M7, M9: simplify targets on brief and plan. M9 done (week-theme label retired, Phase B)
- [x] M8: session-complete recap with numbers against targets (Phase C)
- [ ] M12–M14: retire or restyle `/signup`; paid Progress empty states (streak label done in Phase C, zero-week line in the fix round); "Manage subscription" scope
- [x] Paywall says "weeks with both sessions", matching Progress (Phase C)

**Batch 3: polish**
- [x] M3 verdict title wrap (Phase A, `SkillTitle`)
- [ ] M15 branded 404 (`src/app/not-found.tsx` missing), M16 mirror rewrite, M17 auto-advance
- [ ] The nine low-impact items

- [ ] Read the Phase B and Phase C copy marked UNREVIEWED in their reports, and the fix round's new lines (save form from "Start session", zero-week streak, Terms "a count of weeks with both sessions"), and "Saving…" on the plan's two buttons
- [x] `DESIGN.md` Metric, card no longer cites the Home readiness card (Phase C)
- [ ] `Design/DESIGN_SYSTEM.md` §5 still lists a "Home readiness mini-bar", which no longer exists

**Housekeeping**
- [x] `audit/app-critique.md` committed (`a1f5920`); `audit/*-screens/` is gitignored, so its screenshot links only resolve locally
- [ ] `audit/app-critique.md` H5 describes the old readiness formula; note it as superseded
- [x] `/test-user` records and deletes the anonymous rows it creates (`anon`, `anon-cleanup`); `/verify` exempts the wordmark (`data-wordmark`)
