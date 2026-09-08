---
target: the landing page
total_score: 25
max_score: 36
na_heuristics: 10
p0_count: 2
p1_count: 3
timestamp: 2026-08-07T20-25-41Z
slug: src-app-page-tsx
---
Method: dual-agent (A: general-purpose design review · B: general-purpose detector — B stalled twice on a stream watchdog; its deterministic portion was completed in-parent)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Lazy-loaded screenshots have no placeholder; a slow load renders as a large empty dark card |
| 2 | Match System / Real World | 4 | Speaks the player's language exactly; only slip is the paid tier named "Progress" colliding with the section above |
| 3 | User Control and Freedom | 3 | Hero screenshot retains the app's "TAP TO CONTINUE" footer — a dead affordance on a static card |
| 4 | Consistency and Standards | 2 | progress.png (58→74, +16) and retest-delta.png (66→85, +19) sit side by side and do not reconcile |
| 5 | Error Prevention | 2 | /privacy and /terms both returned 404 |
| 6 | Recognition Rather Than Recall | 3 | "SAVE 49%" requires mental arithmetic; the four skills are referenced but never named |
| 7 | Flexibility and Efficiency | 2 | "Sign in" is hidden below sm; no sticky CTA across a 7,725px mobile stretch |
| 8 | Aesthetic and Minimalist Design | 4 | Strongest dimension — one idea per section, tonal layering doing the sectioning work |
| 9 | Error Recovery | 2 | A failed image degrades to a silent empty box; only the never-loaded branch has a graceful state |
| 10 | Help and Documentation | n/a | Persuade surface; the page is the documentation |
| **Total** | | **25/36** | **Acceptable (69%)** |

## Design Specificity Verdict

The argument is authored for this product; the vehicle carrying it is category-interchangeable. ~6/10.

Genuinely specific: the BreakMark/BreakRule motif redeploys the logo's own geometry as section furniture and teaches the accent's grammar without a word. Copy is written off the engine, not a benefits template. Zero fabricated social proof.

Not specific: every section is the same object (mono eyebrow → display heading → body → phone frame, alternating), no interactive demo, no live surface. The product is a 12-question quiz and the page contains no question.

Deterministic scan: `detect.mjs --json src/components/marketing src/app/page.tsx` → exit 0, `[]`, zero findings. Contrast computed independently: ink 17.86:1, ink-1 13.76:1, ink-2 9.04:1, ink-3 4.96:1 on #0B0B0C — all pass AA; lowest is ink-3 at 4.68:1 on surface.

No visual overlay: injection was not attempted because every browser surface in this environment reports `document.visibilityState === "hidden"`, which suppresses IntersectionObserver and returns black captures. Evidence came from headless Chrome screenshots and arithmetic instead.

## Priority Issues

**[P0] Contradictory demo data in "Proof it moved"** — progress.png shows 58→63→68→74 (+16 since start); retest-delta.png beside it shows 66→85 (+19). Neither figure appears in the other. On the one section carrying the word "proof", on a page forbidden testimonials, this converts *no evidence* into *evidence of fabrication*. Fix: recapture both from one fixture. Interim: caption each frame so they read as separate runs.

**[P0] /privacy and /terms returned 404** — the two links clicked by the visitor closest to converting on rational grounds. Fix: ship both, or remove the links.

**[P1] The accent marked what the visitor cannot buy** — 7 accent elements on the paid card; the free card (holding the only mid-page CTA) used a ghost button. The loudest element on the page was $79, under a heading reading "The diagnosis is free. Always." Also breaks the One Accent Rule. Fix: invert.

**[P1] 7,725px CTA desert on mobile** — hero CTA ends at y=576; next CTA at y=8,301. Nine and a half viewport-heights with nothing to tap, including the exact point where the mechanism argument closes. Fix: CTA after step 03; consider a sticky mobile bar.

**[P1] Session screenshot horizontally clipped** — `crop={620}` forced height-driven cover on a 1179×2070 source, rendering 353px into a 300px container: 53px (17.7%) sliced. Confirmed arithmetically. The back chevron and label text were visibly cut. Fix: crop ≤ 526.

## Persona Red Flags

**Jordan (first-timer)**: taps the hero card because it says "TAP TO CONTINUE" — nothing happens. Reads the brightest pricing element and takes away $79. Lands on /start question 1, a free-text rating field with no "I don't know" option.

**Riley (stress tester)**: finds the 58/74 vs 66/85 contradiction, concludes the numbers are decorative. Sees the same verdict card twice and concludes the diagnosis may be identical for everyone — the precise objection the section exists to defeat. Privacy → 404. Terms → 404.

**Casey (mobile)**: 7,725px with no CTA. Clipped session screenshot reads as a broken image. Footer links render 21px tall, under the WCAG 2.2 AA 24px target minimum. Cannot sign in at all — hero link is 0×0 below sm.

**Dave (stuck 3.5, project-specific)**: the page never names the four skills, withholding the one moment he could recognize himself. The absolution beat — PRODUCT.md's "structure, not talent" — survives in half a clause, leaving the product's strongest emotional differentiator behind the click.

## Minor Observations

- Hero glow was a ~4% luminance lift whose bright core sat behind the opaque frame — the designated memorable moment was effectively absent.
- Neither pricing card used a heading element; tiers were invisible in the document outline.
- Reassurance captions (the page's objection-handling copy) sat in ink-3, the dimmest tier.
- Two ready captures (`home`, `plan`) went unrendered; `plan.png` still not captured.
- Step frames use a fixed crop=440 regardless of content; step 03 ends with ~200px of empty card.
- Surface brief is stale — it still says seven screenshot slots are placeholders.
- Motion degradation handled correctly: content visible by default, reduced-motion gated in CSS.

## Questions to Consider

1. The product is a 12-question quiz and the page contains no question. Why is question 01 not answerable in place, handing the visitor into /start with their first answer recorded?
2. If social proof is forbidden, why spend the loudest visual moment and ~1,400px of mobile scroll on a price the visitor cannot buy?
3. The emotional differentiator is absolution. Why is that argument almost entirely on the far side of the only conversion this page exists to produce?
4. The north star is "flat until the break" — so why does the composition itself never break? Six sections at identical rhythm; nothing inverts or goes full-bleed.
