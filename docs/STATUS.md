# Status

Updated 2026-10-28 · `main` at `fad4f6b` · `batch-2` in progress

## Current state

- **Landing page:** redesigned and polished (`d5596de`, `19b8455`). Every example carries an `ExampleTag`.
- **Engine and content:** every skill × root cause pair has an authored story, story lines are keyed to the answer they quote, and solo players get two different drills per session (`6257e2b`, `1ca3f7f`, `8e58ba3`, `d100155`, `d4d25bc`). `audit/content-audit.md` predates these fixes and has not been re-run.
- **App, batch 1 of `audit/app-critique.md`:** done in `1434644` (H1–H5, M11). Sessions without an account are gated honestly, the re-test shows wherever it is open, a new focus gets its reveal, the free re-test result shows the trained skill, readiness runs 0–100 with no rating labels.
- Readiness migration (20261025120000) was run on the production database on 2026-10-27; stored readiness values are on the 0–100 scale.
- **Codex review of `1434644`:** fixed in `9f63d5e`, copy reviewed. The re-test result shows both reset answers (kitchen line, mid-court), each with its own change; it falls back to stored levels ("1/3 → 1.5/3") when answers are missing, for free and paid, and the paid breakdown no longer drops the trained skill. Home shows "Plan saved" only when the latest plan belongs to the diagnosis on show.
- **Batch 2, Phase A** (branch `batch-2`, not merged): em-dash sweep of app copy and assessment options (every row of `audit/batch-2-plan.md` except row 11, the plan preview Phase B removes), an explicit `short` on every skill-question option (the re-test rows and the third-shot goal no longer parse labels), 16px body text outside the screens Phases B and C rebuild, hyphenated skill titles kept whole, the hero glow removed, `/verify`'s button and link rules. **Migration `20261028120000_plan_text_em_dashes.sql` is written but not run** on production.
- **Claude Code setup:** `CLAUDE.md`, skills `/verify` `/test-user` `/critique` `/ship`, subagent `reviewer`, this file.
- **Codex setup:** `AGENTS.md` makes Codex a read-only reviewer that follows `CLAUDE.md` and reports Blockers / Should-fix / Nits. `CLAUDE.md` tells Claude to end its report with "Codex review recommended: [branch or commit]" for auth, billing, engine or main-screen changes.

## Outstanding

**Batch 1 leftover**
- [ ] H6: Stripe product description still says plans are included. Edit it in the Stripe dashboard (not code), then check Checkout.

**Batch 2: one product, one language** (`audit/app-critique.md`)
- [ ] H7: Home, Plan, Progress get one dominant element each and hairlines instead of card stacks
- [ ] M1, M2: merge plan preview and saved result; relabel "I'm in"
- [x] M4: em-dash sweep (Phase A). Left: "I'm in — let's go" in `Roadmap.tsx`, which goes with that screen in Phase B
- [ ] Run `supabase/migrations/20261028120000_plan_text_em_dashes.sql` on production (row-count query in its header)
- [ ] M5: one name per concept
- [ ] M6: app body text to 16px. Phase A done (DESIGN.md tokens updated); Home, Plan, Progress, the plan preview, the saved result and the session-complete screen get theirs in the Phase B and C rebuilds
- [x] Remove the landing hero's decorative gradient glow (Phase A)
- [ ] M7, M9: simplify targets on brief and plan; replace the week-theme label (`WEEK_FOCUS_LABELS`)
- [ ] M8: session-complete recap with numbers against targets
- [ ] M12–M14: retire or restyle `/signup`; paid Progress empty states; "Manage subscription" scope

**Batch 3: polish**
- [x] M3 verdict title wrap (Phase A, `SkillTitle`)
- [ ] M15 branded 404 (`src/app/not-found.tsx` missing), M16 mirror rewrite, M17 auto-advance
- [ ] The nine low-impact items

**Housekeeping**
- [x] `audit/app-critique.md` committed (`a1f5920`); `audit/*-screens/` is gitignored, so its screenshot links only resolve locally
- [ ] `audit/app-critique.md` H5 describes the old readiness formula; note it as superseded
