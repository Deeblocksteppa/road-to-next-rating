---
target: the landing page
total_score: 18
max_score: 32
na_heuristics: 9,10
p0_count: 0
p1_count: 2
timestamp: 2026-09-05T03-01-46Z
slug: src-app-page-tsx
---
Method: dual-agent (A: design review · B: detector + browser evidence)

Both assessments ran isolated. A visual note: screenshots would not composite in this environment (Browser pane hidden, scroll-reveal elements are composited layers), so both agents worked from measured geometry, computed styles, contrast math and DOM inspection at 1280x900 and 375x812 rather than from pictures. Every finding below is backed by a measurement or a line of code.

Measured page height: 7,508px desktop / 8,866px mobile. No horizontal overflow at either width.

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | No pending state on the four `/start` links; no position indicator on an 8,866px mobile page. |
| 2 | Match System / Real World | 3 | Strong pickleball fluency, but engineer-speak leaks: `· master` (readouts.tsx:317) is undefined jargon; "the second axis" and `×1.4` are model-speak on a rec player's page. |
| 3 | User Control and Freedom | 1 | Zero navigation on mobile: sign-in is `display:none` below 640px, no anchor nav, no back-to-top, no skip link. |
| 4 | Consistency and Standards | 3 | CTA reads "Find your bottleneck — free" three times but "Start the assessment" in the free card; step 03's evidence is a raster crop while 01/02 are live readouts, inside one section. |
| 5 | Error Prevention | 3 | "No card, no trial clock" and "never before" pre-empt the classic fear well. Nothing states what happens after the click. |
| 6 | Recognition Rather Than Recall | 2 | Mobile GapLedger hides its column heads; Pricing's paid bullets require recalling a chart mobile never rendered. |
| 7 | Flexibility and Efficiency | 1 | Scored, not n/a — a returning-user path exists and is broken. No sticky CTA, no jump links across ~9,000px. |
| 8 | Aesthetic and Minimalist Design | 3 | Strongest axis: strict monochrome-plus-one, no shadows, no stock imagery. Deducted for accent-as-decoration. |
| 9 | Error Recovery | n/a | No error states on a static Persuade surface. |
| 10 | Help and Documentation | n/a | Persuade surface; /privacy and /terms are out of scope. |
| **Total** | | **18/32** | **Needs work** |

Two heuristics marked n/a (9, 10); total renormalized to the applicable maximum of 32.

## Design Specificity Verdict

**Authored at the center, category-interchangeable at the edges.**

**LLM assessment.** The page has a core no competitor could paste in. `readouts.tsx` renders the real engine's output, not a picture of it — `demo-run.ts` runs `diagnose()`/`scoreSkills()` at build time, so the hero's `63/100`, the `×1.4` weight and the `2.8` weighted gap are computed, not typed. It makes the "one, not ten" claim visually true (four rows, one badge), it satisfies PRODUCT.md's no-fabricated-proof constraint because the credibility is mechanical rather than social, and it cannot drift, because changing a weight in `engine.ts` re-renders the page. `RootCauseReadout` showing verbatim answer options does the recognition work a testimonial normally would. The BreakMark/BreakRule motif makes the logo's own gesture into the layout system.

But the chassis is the reference template, and the code comments know it. `SectionLabel → SectionHeading → Body → image right` in Plan and Progress is stock linear.app; the two-card pricing block is unmodified SaaS boilerplate; StatRow is the most-copied marketing component that exists; FinalCta is the vercel.com close, verbatim in structure. The consequence that matters: the page's specificity is load-bearing on exactly the two objects that degrade worst at 375px.

**Deterministic scan.** `detect.mjs` on `src/app/page.tsx` — exit 0, clean. On `src/components/marketing` — exit 2, 16 findings, all `design-system-font-size` (advisory).

Real drift, and most of it is new: `primitives.tsx:191` (30px/46px/54px, the new `Statement`) and `primitives.tsx:143` (26px, the new `SectionHeading size="group"`) are values that appear nowhere in DESIGN.md's ramp. `readouts.tsx` uses `text-[10px]` ten times against a documented 11px Label floor.

False positives: `readouts.tsx:142` (72px) is explicitly documented as the Metric range; `primitives.tsx:191` (38px) is named in the desktop hinted targets.

Browser detector: 31 findings at 1280, 30 at 375. `undersized-ui-text` x17 (all 10px, all from `readouts.tsx`) corroborates the CLI exactly. `cramped-padding` x3 is a false positive — the CTAs are `h-[52px]` flex-centered, so zero padding is irrelevant. `all-caps-body` x8 is a false positive against this design system, which mandates uppercase mono for every eyebrow and unit — though the 67-char "Weighted gap = weight × (3 − level)" is genuinely long for all-caps.

**Hard checks, all clean:** 0 elements with a computed box-shadow at either width (Flat-By-Default holds). Exactly 1 gradient on the page — the hero's radial optic field, the sanctioned exception. No unsanctioned gradients anywhere. 4 images, 0 missing alt. Heading order structurally clean: 1 h1, 0 skipped levels.

**Visual overlays:** injection succeeded; the live-server was started, injected at both widths, and stopped (`node live-server.mjs stop`; port 8400 now dead, Next.js untouched at 200).

## Overall Impression

The two structural fixes did what they were asked to do. The gray mat is gone everywhere and confirmed gone by measurement, the void at positions 2–5 is gone because the column that created it is gone, and the page dropped from 9 sections to 8. What the critique surfaces is that the weak run was never the page's worst problem — it was just the most visible one on a desktop screenshot. The real damage is that this page is specified mobile-first (DESIGN.md: "specified natively at 375×812") and then makes two desktop-first concessions that gut it at 375px: the GapLedger deletes its own column labels, and the Progress chart is not rendered at all. On the device this product is built for, the section that "carries the whole argument" is an unlabeled numeric table, and the section titled "Proof it moved" shows half its proof.

Biggest single opportunity: stop spending the accent. It appears ~32 times, nine of them as decorative bullets, which is why the closing inversion had to be introduced as a rescue for a restraint the page was never actually practising.

## What's Working

1. **The hero readout is the product's own reasoning, live.** Not a screenshot, not a mockup — `engine.ts` output rendered at page scale. Structurally honest under the no-proof constraint, and it cannot go stale.
2. **`RootCauseReadout` shows real answer text verbatim,** pulled from `questions.ts`. The visitor sees the actual voice of the assessment before committing, which answers "what am I about to be asked?" with no explanatory copy.
3. **The accent-tinted free card correctly out-ranks the paid card.** The optic border sits on the $0 tier under a heading reading "free. Always." Most SaaS pages point the loudest element at the tier nobody can buy.

## Priority Issues

**[P1] Mobile GapLedger deletes the labels from the page's central proof.**
`readouts.tsx:218` hides the column heads behind `hidden md:flex`. At 375px each row is `01 The reset 1/3 ×1.4 [bar] 2.8` with no header, explained only by a 10px `ink-3` footnote at the bottom.
*Why it matters:* the surface brief says the two-axis section carries the whole argument and that credibility comes from specificity, since no testimonials exist. `×1.4` is meaningless without "Weight."
*Fix:* render column heads at 375px as a compact stack, or inline the unit into each value (`LVL 1/3`, `WT ×1.4`, `GAP 2.8`). Promote the footnote to 12–13px `ink-2` and move it above the rows on mobile.
*Command:* `/impeccable clarify src/components/marketing/readouts.tsx`

**[P1] A returning user on mobile cannot sign in.**
`sections.tsx:31` is `hidden … sm:block`, so below 640px it is `display:none` and out of the tab order. The only mobile sign-in is the footer at y=8,749 of 8,866 — 98.7% down. No sticky header, no back-to-top; `#pricing` is an id nothing links to.
*Why it matters:* every returning user, on the primary device, scrolls ~11 screen-heights to log in. This drives heuristics 3 and 7 to 1.
*Fix:* keep "Sign in" visible at all widths and raise its tap target to ≥44px (`py-3 -my-3`). Same for the three footer links (47×21, 40×21, 43×21 measured).
*Command:* `/impeccable harden src/components/marketing/sections.tsx`

**[P2] The accent is used as decoration in three places, breaking the page's own governing rule.**
Measured optic marks per 900px desktop viewport: hero band 4 marks / 3 distinct meanings; pricing band 10. Two are outright rule breaks rather than density judgments — `sections.tsx:444` makes "Free forever" an optic *heading*, and the bullet-dot pattern renders the accent as a list bullet 9 times (2 code sites, `PLAN_POINTS` ×4 and `FREE` ×5).
*Why it matters:* the north star is "flat until the break — the break gets all the weight." Nine decorative dots spend the break's currency before the break arrives, which is exactly why FinalCta's own comment says restraint "held for 8,000px reads as absence." The absence isn't the problem; the leakage is.
*Fix:* bullets to `bg-line-hover` or `bg-ink-3`; "Free forever" to `text-ink-2` — the card's optic border and tint already mark it. That leaves the free card's CTA as the only optic element in the pricing viewport, which is correct: it's the only thing there you can act on.
*Command:* `/impeccable quieter src/components/marketing/sections.tsx`

**[P2] Mobile is sold a chart it is never shown.**
`sections.tsx:390` wraps the progress shot in `hidden md:block`; measured 0x0 at 375px. 927px later the paid tier's *first* bullet is "Your readiness chart over time."
*Why it matters:* the section is titled "Proof it moved," shows half its proof on the primary device, then asks the visitor to value the missing half at $79/year.
*Fix:* stack both shots on mobile — they're already captioned, so stacking is unambiguous. If vertical budget is the concern, tighten the progress `reveal` (0.76 → ~0.5, cropping to the chart itself) rather than deleting it.
*Command:* `/impeccable adapt src/components/marketing/sections.tsx`

**[P2] Landmark structure hides the hero from assistive navigation.**
`page.tsx:43-45`: Hero is a top-level `<header>` (banner landmark) containing the h1, the lede, the primary CTA and the hero readout. `<StatRow />` sits between `</header>` and `<main>` — inside no landmark at all. `<main>` begins at Problem. No skip link.
*Why it matters:* a screen-reader user jumping to `main` — the standard first move — lands after the headline, the value proposition and the primary CTA.
*Fix:* move `<main>` to wrap from the hero down; keep a small `<header>` for the wordmark + sign-in row only. Put StatRow inside main.
*Command:* `/impeccable audit src/app/page.tsx`

## Persona Red Flags

**Dana — plateaued 3.5 rec player, cold from a TikTok link, on a phone** (the primary visitor).
The 812px fold shows wordmark, eyebrow, h1 across 3 lines, lede, CTA at y=512, meta line, and then only the *top rail* of the readout card at y=687. The readiness number — the memorable object the brief names as the page's one moment of light — starts below the fold and runs to y=1,163. The hero glow measures 455×603 and sits almost entirely below the fold. Then StatRow, whose fourth cell reads `0 / Account needed` — scanned at speed the row reads "12 4 3 0" and the one cell that should reduce her fear is the one that doesn't parse. Then 2,776px of numeric readouts with the labels removed. That is where she leaves.

**Jordan — confused first-timer.** `· master` (readouts.tsx:317) appears beside "Court time" with no definition anywhere on the page. `×1.4` and `2.8` unlabeled on mobile. "the second axis" assumes a mental model the section is still trying to build. CTA label inconsistency: three buttons say "Find your bottleneck — free," one says "Start the assessment" — literal reading is two different things.

**Sam — screen reader / keyboard / low vision.** Landmark skip and no skip link (P2 above). The comparative bar chart is invisible at low vision: GapLedger's non-bottleneck fills are `#4A4A50` on a `#232327` track — **1.78:1**, 97px wide at 375px. The numeric value is present so this isn't a WCAG text failure, but the visual "largest gap wins" argument — the entire point of step 01 — does not exist for a low-vision reader. Three tap targets under 44px. Credit where due: focus-visible optic outlines on every link, real descriptive alt on all four images, decorative elements correctly `aria-hidden`, and `RiseIn`'s `observerProvenAlive` failsafe means nothing can strand at opacity 0 — unusually careful work.

**Marcus — lapsed user returning on his phone.** Opens `/`, finds no sign-in in the header, scrolls 8,749px or types `/login` from memory.

**Alex — impatient power user.** Mostly satisfied: CTA above the fold at both widths, one-sentence value prop, no interstitial. Red flag: 3,974px between CTA 1 and CTA 2 on mobile. The comment at `sections.tsx:277-280` claims this was fixed; it was halved, not fixed.

## Minor Observations

- One measured contrast failure on the whole page: `ink-3` on the tinted `rgb(29,29,24)` surface at 10px — **4.25:1** against a 4.5 requirement (`readouts.tsx:351`, "Paired with The reset → one plan"). `ink-3` is the entire risk surface: it measures 4.55–4.93 everywhere else it's used, so it passes only narrowly across the board.
- `AppShot.tsx:94` — `sizes="(max-width: 767px) 88vw, 375px"` is stale. The Progress shots render at 532px and step 03 at 440px on a 1280px viewport, so the browser picks a 375px candidate and upscales 1.41×. Should be `(max-width: 767px) 88vw, (max-width: 1023px) 45vw, 540px`.
- `shots.ts:52` points at `/marketing/plan.png`, which does not exist in `public/marketing/`. Verified independently. It is `ready: false` and never rendered, so it is a latent dead reference, not a live break.
- Two pricing tier names are `<h3>` set at 11px mono — smaller than every `<p>` on the page and 9px smaller than their sibling h3s. The closing `<h2>` renders at 80px, identical to the h1.
- `SHOTS.home` and `SHOTS.plan` are `ready: false` and unreferenced, so `AppShot`'s "Screenshot pending" fallback is unreachable on this page. `AppShot`'s `priority` prop is never used. `GhostCta` is exported and never used.
- `optic-ink/70` on the optic ground measures 5.30:1 — passes AA, but it's the least legible text on the page inside the loudest section. `/80` measures 8.15:1 at no cost to hierarchy.
- Pricing's closing footnote is centred 11px mono spanning the full 1120px container; constrain to ~52ch like the section's other prose.
- 416K of shipped PNGs (`home.png`, `reveal-insight.png`, `reveal-verdict.png`) are unused by this page.

## Questions to Consider

1. The page's memorable moment is below the fold on the device it was designed for. If the one place light is used can't be seen on a phone without scrolling, is it the hero's moment — or is the h1 the real hero and the readout just the first proof? Cutting the lede's second sentence would buy ~180px and put `63/100` on the first screen.
2. FinalCta's comment says restraint "held for 8,000px reads as absence." But the accent isn't being held — it appears ~32 times. Is the closing inversion solving a real absence, or compensating for an accent spent so widely it stopped meaning anything? Remove the nine decorative dots first and see whether the close still needs to be a full-surface inversion.
3. Pricing spends 944px arguing about $79 on a page whose only conversion goal is a free click — four price figures and nine bullets under a heading that says "free. Always." What would the page lose if Pricing were four lines and the reclaimed ~700px went to the mechanism section that has to carry the argument?
4. The GapLedger decides that at 375px the numbers are self-describing; the progress shot decides that at 375px it isn't needed at all. Both are desktop-first concessions on a mobile-first product. If the page were built at 375px and then widened — the way the app was — which of those two decisions survives?
5. The strongest trust sentence on the page is 14px `ink-2` in the corner of the card nobody's supposed to buy ("Offered inside the app once you have a re-test worth charting — never before"). Why is it the smallest thing in its section?
