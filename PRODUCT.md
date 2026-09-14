# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Recreational pickleball players plateaued at a 3.0–4.0 rating (DUPR or self-rated) who have felt stuck for months to years. They play regularly — often several times a week — but spend most of their court time in open play / games rather than structured, deliberate drilling. They came in believing their game has many scattered weaknesses; the product's core promise is that it isn't ten problems, it's one.

## Product Purpose

A free 12-question diagnostic assessment identifies the single skill bottleneck holding a player's rating down (from a fixed taxonomy: third-shot drop, the reset/transition-zone game, hands at the net, dink/soft-game patience), explains *why* it hasn't improved despite regular play, and generates a 3-week plan of targeted drills to fix it. A re-test loop measures whether the plan moved the player's readiness score, and progress (chart, history, streaks) is tracked over time.

Success = a player accepts the single-bottleneck diagnosis as true and personal, follows the 3-week plan, and sees a measurable readiness delta on re-test.

## Positioning

Most improvement content (open play, generic drill videos, one-size courses) treats a plateaued player as having many weaknesses to grind on. This product's mechanism is causal, not encyclopedic: a fixed scoring model maps 12 answers to skill levels + a root cause (why the skill never developed — pure open play, unfocused drilling, or a coached-but-not-transferring gap), and pairs that specific (bottleneck × root cause) combination with a pre-written diagnostic story — mirror of the player's own answers, verdict, insight into the mechanism, absolution (it's a structure problem, not a talent ceiling), and a readiness score. A neighboring "here are 10 drills" app cannot truthfully claim this same causal specificity.

## Operating Context

- Web app (Next.js), dark-only, mobile-first at 375px per the design spec.
- Core loop: Landing → 12-question Assessment → Computing (choreographed ~5s interstitial, no spinner) → Reveal (5 story beats: mirror, verdict, insight, absolution, readiness score) → Roadmap (3-week plan) → Save Gate (account creation, post-value) → Home / Plan / Progress (tabbed) → drill sessions logged against the plan → Re-test → Delta screen → Progress updates.
- Auth via Supabase (email/password + Google). Payments via Stripe (subscription). Email via Resend (drill reminders via cron).
- Diagnosis and drill-session data persist to Supabase; assessment/diagnosis are saved as unclaimed rows immediately (before auth) and claimed at Save Gate.

## Capabilities and Constraints

- **Diagnosis mechanism is rule-based, not AI/ML.** `src/lib/engine.ts` deterministically scores 4 skills from answer options (skillLevel + importance weighting → gap), infers one of a fixed set of root causes via a vote/master-variable scheme, and looks up a matching pre-written `DiagnosisStory` from `src/lib/diagnoses.ts` by (bottleneck × rootCause). Marketing copy ("cross-checked against 3.5 plateau patterns") is narrative flavor over this deterministic engine — future work must not imply a real AI/ML model exists.
- Skill taxonomy is fixed at 4 entries (`third_shot_drop`, `reset`, `net_defense`, `dink_patience`); adding a skill means adding scoring, importance weight, labels, and a full story matrix, not just copy.
- Readiness score (40–85 range per current formula) and the 3-week roadmap are generated, not fetched from any external rating authority — DUPR itself is only ever self-reported by the user, never verified or synced.
- Freemium monetization: assessment, diagnosis, every 3-week plan (a new one is generated on every re-test), guided sessions and logging, re-tests with the headline score change, and Home are free for all users, with no tier check anywhere in those paths. Progress (readiness chart, re-test history, streaks) and the per-skill breakdown on the re-test delta screen are the paywalled surfaces — $79/year (default, "SAVE 17%") or $7.99/month, via Stripe. Prices live on Stripe Price objects referenced by `STRIPE_PRICE_ANNUAL` / `STRIPE_PRICE_MONTHLY`; the code only carries them as copy. Public copy avoids "always"/"forever": no permanent commitment has been made.
- Free users still see their current readiness number and a "+N since start" delta on the Progress screen — the paywall blurs history/chart/streaks, never the current number ("desire, not resentment," per design spec).
- Re-test delta is free at the headline score-transition level; the per-skill breakdown is the paywalled part of that screen.

## Evidence on Hand

No real testimonials, case studies, press, or usage data exist yet — none should be fabricated or implied in any surface. The design spec's example copy (specific weeks/scores/dates) is placeholder content, not real user data.

## Product Principles

1. **One bottleneck, not ten weaknesses.** Every surface — copy, diagnosis, plan — reinforces a single causal explanation, never a checklist of flaws.
2. **Save comes after value, not before it.** Auth is framed as "keep what you found," placed at the Save Gate after the free diagnosis and plan are already delivered — never a signup wall blocking the reveal.
3. **The paywall sits at peak motivation, not at entry.** Progress/history lock-out is placed right after a player has just seen their free delta move, not on first visit.
4. **Never overclaim the mechanism.** The product is a deterministic diagnostic model with authored narrative content, not an AI coach — internal docs and any future user-facing claims should stay honest about that.
5. **Structure, not talent, is the frame.** Every diagnostic story reframes the plateau as a fixable practice-structure problem, never a player deficiency — this is core to the emotional arc (mirror → verdict → insight → absolution → readiness), not just copy tone.

## Accessibility & Inclusion

No product-specific accessibility requirement has been established beyond the design system's own contrast fixes (`ink-2`/`ink-3` were already raised to clear WCAG AA for small text — see Design/DESIGN_SYSTEM.md).
