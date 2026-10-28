# Road to Next Rating

A 12-question pickleball diagnostic that names one skill bottleneck, explains why, and gives a 3-week plan with a re-test. Dark only, mobile-first at 375px.

- Product, users, free vs paid: `PRODUCT.md`
- Design tokens and rules: `DESIGN.md`
- Screen-by-screen spec: `Design/DESIGN_SYSTEM.md`
- Current state and outstanding work: @docs/STATUS.md
- Past reviews: `audit/app-critique.md` (app), `audit/content-audit.md` (stories and drills)

## Stack and commands

Next.js 14 App Router, TypeScript, Tailwind 3 + shadcn, Supabase (auth + Postgres), Stripe subscriptions, Resend email, Vercel.

- Dev: `npm run dev` (port 3000). In the desktop app use `preview_start` with `dev` from `.claude/launch.json`.
- Type-check: `npx tsc --noEmit` (there is no npm script for it)
- Lint: `npm run lint`
- Build: `npm run build`
- Engine scenarios: `npx tsx src/lib/engine.test.ts` (prints results, no assertions)
- Env lives in `.env.local` (gitignored). `STRIPE_SECRET_KEY` must be `sk_test_` locally.

## File map

- `src/lib/`: the engine and app logic. `engine.ts` scores answers, routes root cause, picks the story. `questions.ts` (options and values), `diagnoses.ts` (authored stories), `readiness.ts` (0 to 100 score), `session-plan.ts` (the one definition of a session), `drills.ts`, `roadmap.ts`, `plan-*.ts`, `retest-*.ts`, `delta.ts`, `billing.ts`, `stripe.ts`. `supabase/admin.ts` is the service-role client: server only.
- `src/app/`: `page.tsx` landing, `start/` assessment and reveal, `(app)/home|plan|progress` tabs, `session/` guided session, `retest/` (+ `[id]/next` new-focus reveal), `paywall/`, `settings/` (`manage`, `delete`), `auth/confirm` (all emailed links), `api/stripe/webhook`, `api/cron/drill-reminders`.
- `src/components/marketing/`: landing sections. `sections.tsx` layout, `readouts.tsx` live product readouts, `demo-run.ts` example data, `primitives.tsx` `ExampleTag`.
- `src/components/`: `diagnosis/` (Reveal, Roadmap, SavedResult), `retest/`, `progress/`, `session/`, `ui/` (shadcn).
- `supabase/migrations/`: schema. Every table cascades from `profiles`.

## Hard rules

1. **Design system invariants** (DESIGN.md is the source): optic accent marks one thing per screen and never fills behind copy or colors a heading (sole exception: the landing's closing section). No gradients in UI chrome, no `box-shadow`, no italic. Nothing centered except the reveal. `tabular-nums` on every metric. Mono labels uppercase and about three words max. Radius from the scale only. `reveal-bg` only on reveal and delta screens.
2. **No em dashes in UI copy**: anything a player reads, including emails and assessment options. Use a period, comma, colon or "·". En dashes in ranges ("1–3") are fine; code comments are exempt.
3. **Body text at least 16px.** Sentences are 16px; secondary lines at least 15px; mono labels and badges are exempt.
4. **Never change engine scoring or routing unless asked**: weights, levels, root-cause votes, story lookup, readiness formula, option values in `questions.ts`. Copy edits in `diagnoses.ts` are fine within rule 5.
5. **Story lines claim only what routing guarantees.** A "you said…" or "most of your time is…" line must be true for every answer combination that reaches that story. Trace it in `engine.ts` first (see `audit/content-audit.md` §1.4).
6. **Illustrative labels stay next to example data.** Every example score, skill or date on the landing carries an `ExampleTag` right beside it; move the data, move the tag. Never fabricate testimonials or usage.
7. **No checkout on the landing page.** Landing CTAs go to `/start`. Prices are information only, never a link to `/paywall` or Stripe.
8. **Never overclaim.** Rule-based model, not AI. Readiness is not a DUPR estimate. No "always" or "forever". Free paths have no tier checks (PRODUCT.md lists what is paid).

## Workflow

- **Read DESIGN.md and Design/DESIGN_SYSTEM.md before any UI or copy change.** Read PRODUCT.md before changing what is free or paid, or what the product claims.
- **Investigate read-only before big changes.** Anything touching a flow, the engine or more than a few files: read first, state the plan, then edit.
- **Branch when committing copy the user hasn't read.** Otherwise commit on `main` only when asked.
- **Verify UI changes with screenshots**: run `/verify` (type-check, lint, 375px and 1440px shots). Signed-in screens need `/test-user`; always run its cleanup.
- **Never commit temp files.** Scratch scripts, test routes (`src/app/dev-*`, `*-tmp`), stray screenshots and `.env*` stay out. Put them in the scratchpad.
- **End every task by listing files changed** and updating `docs/STATUS.md`.
- **Flag high-risk changes for Codex.** When a change touches sign-up/claim/auth, Stripe/paywall/free vs. paid, the engine/scoring/stories/readiness, or rebuilds a main screen, end your report with: "Codex review recommended: [branch or commit]."
- Skills: `/verify`, `/test-user`, `/critique`, `/ship`. Subagent: `reviewer` (read-only, checks a diff or screens against these rules).
