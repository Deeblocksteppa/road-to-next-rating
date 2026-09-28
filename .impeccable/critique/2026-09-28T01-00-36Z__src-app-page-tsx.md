---
target: the marketing page
total_score: 21
max_score: 32
na_heuristics: 7,9
p0_count: 0
p1_count: 1
timestamp: 2026-09-28T01-00-36Z
slug: src-app-page-tsx
---
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
