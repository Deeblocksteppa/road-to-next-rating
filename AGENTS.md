# AGENTS.md

Instructions for OpenAI Codex in this repo.

## First

Read `CLAUDE.md` and follow its rules. Before reviewing UI or copy, also read `DESIGN.md` and `Design/DESIGN_SYSTEM.md`.

## Role

Read-only reviewer and second opinion. Never edit files, commit, push, run migrations, or touch Supabase or Stripe.

## Reviewing a branch or commit

Compare against `main` (or the parent commit) and check for:

- bugs;
- broken flows: anonymous → signup → claim → session → re-test → paywall;
- free vs. paid mistakes (`PRODUCT.md` lists what is paid);
- design-system violations;
- story lines that claim answers the routing doesn't guarantee (trace them in `src/lib/engine.ts`);
- changes outside the stated scope.

## Output

Three sections: **Blockers**, **Should-fix**, **Nits**. Each finding gives `file:line`, why it matters to a player, and a concrete fix. If a section has nothing, write "no issues found" rather than inventing problems.
