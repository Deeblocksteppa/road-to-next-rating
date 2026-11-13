# Road to Next Rating — Design System

**Version:** V1 · Dark only · 375px mobile-first
**Source:** `design/design-spec/RTNR Identity + UI.dc.html` (Claude Design export, Jul 2026)
**Status:** Source of truth. This document is the spec; the Tailwind config and components should be derived from it, not the other way around.

---

## 0. Founding principles

1. **Palette — "Kill the gradient."** Monochrome near-black neutrals carry the entire interface (the workout-app register). A single optic yellow-green accent — the color of the ball — does all the pointing. The accent only ever marks *the one thing that matters right now*: one CTA, one data line, one selected state. **Never backgrounds, never headings.** The old navy + blue→green gradient is explicitly rejected — gradients read as marketing, and blue cast reads as "AI dev tool."
2. **Type — three voices.**
   - **Archivo** (heavy, expanded for the wordmark, tabular for numbers) = **verdicts & metrics**. Stadium-signage authority.
   - **Instrument Sans** = the **coach's speaking voice**: body, explanations, buttons.
   - **IBM Plex Mono** = the **instrument**: every label, unit, and countdown is mono smallcaps. This is what makes the UI feel *calibrated* rather than styled.
   - No font is ever italic. **Nothing is ever centered except the reveal.**
3. **Logo — "the plateau, broken."** Two strokes on a 32px grid: a flat gray plateau line (the rating you've been stuck on) and an accent line breaking upward off its end. 3px weight, round caps. The plateau is always `ink-3` (muted); the break is always accent — the mark never appears in a single color. Legible to 16px minimum. Doubles as the Progress chart motif (the chart is the logo happening slowly).

---

## 1. Color palette

### Core neutrals & accent

| Token | Hex | Role |
|---|---|---|
| `background` | `#0B0B0C` | App base / deepest neutral |
| `surface` | `#131315` | Cards, panels |
| `surface-2` | `#1A1A1D` | Raised surface, secondary buttons |
| `line` | `#232327` | Default borders / dividers |
| `line-strong` | `#2E2E33` | Stronger borders (inputs, screen frame, empty ticks) |
| `line-hover` | `#4A4A50` | Border on hover |
| `ink` | `#F4F4F2` | Primary text |
| `ink-2` | `#B0B0AB` | Body / secondary text (raised from `#9C9C97` for legibility — courtside/sunlight use; ~9.1:1 on `background`) |
| `ink-3` | `#80807B` | Labels, captions, muted (raised from `#63635E`, which measured 3.25:1 on `background` — below WCAG AA's 4.5:1 floor for small text; now ~5.0:1) |
| **`optic`** (accent) | **`#D8E34C`** | The one accent — optic yellow-green |
| `optic-hover` | `#E6EF7A` | Accent hover (buttons, links) |
| `optic-ink` | `#131408` | Text/icon *on* accent |
| `optic-dim` | `rgba(216,227,76,0.12)` | Accent @ 12% — dim fills / badges |
| `warn` | `#E3B84C` | Warning / "due today" |
| `danger` | `#E3654C` | Danger / regressed / plateau / destructive |
| `danger-hover` | `#E98572` | Destructive hover (delete account) |
| `reveal-bg` | `#060607` | Darker-than-app background for reveal & delta screens |

### Accent fill opacities (used in practice — worth tokenizing)

| Value | Where |
|---|---|
| `rgba(216,227,76,0.12)` | `optic-dim` — ON TRACK / PAID badges, dim swatch |
| `rgba(216,227,76,0.08)` | Selected option-button fill |
| `rgba(216,227,76,0.05)` | Paywall plan card / progress-empty callout / progress-locked callout |
| `rgba(216,227,76,0.04)` | "In-game rule" card fill |
| `rgba(227,184,76,0.12)` | `warn` badge fill (DUE TODAY) |
| `rgba(227,101,76,0.12)` | `danger` badge fill (PLATEAU) |

### Hover / interaction-only neutrals (used but not in the swatch grid)

| Value | Where |
|---|---|
| `#17171A` | Option-button hover bg; settings-row hover bg |
| `#4A4A50` | Hover border (`line-hover`) |
| `#060607` | Reveal / delta background (`reveal-bg`) |
| `#E98572` | Delete-account hover text (`danger-hover`) |

**Note:** Neutrals are true-neutral with a whisper of warmth (no blue cast). `warn` and `danger` share the accent's lightness and chroma in oklch, so states read as "the same instrument changing its reading," not new colors arriving.

### shadcn `:root` (dark only), HSL — as given in the spec

```css
--background: 240 4% 5%;   --card: 240 5% 8%;
--border: 240 5% 15%;      --input: 240 5% 15%;
--foreground: 60 7% 95%;   --muted-foreground: 60 2% 60%;
--primary: 64 72% 60%;     --primary-foreground: 69 42% 6%;
--secondary: 240 5% 11%;   --ring: 64 72% 60%;
--destructive: 4 73% 59%;  --radius: 0.875rem;   /* 14px */
```

---

## 2. Typography

### Font families

| Role | Family | Weights / axes | Notes |
|---|---|---|---|
| **Display** | Archivo | variable `wdth 62..125, wght 100..900` | Wordmark uses `font-stretch: 125%` (expanded). Numbers use `tabular-nums`. |
| **Sans (body)** | Instrument Sans | 400, 500, 600 | Default UI font |
| **Mono** | IBM Plex Mono | 400, 500 | UPPERCASE smallcaps for all labels/units |

Currently loaded via Google Fonts CDN in the spec. For the app, prefer `next/font` (self-hosted) for the same three families.

### Type scale

Size / line-height / weight. "→ desktop" is the responsive target given in the spec (mobile-first; only hints exist for desktop).

| Level | Font | Mobile | LH | Weight | Desktop | Notes |
|---|---|---|---|---|---|---|
| **Display** | Archivo | 40px (shown 44) | 1.05 | 800 | → 64px | letter-spacing −0.02em |
| **Metric** (big number) | Archivo | 56–72px | 1.0 | 800 | up to **96** (Readiness) | `tabular-nums`; suffix (`/100`, `/3`) in `ink-3` |
| **H1** | Archivo | 24px | ~1.25 | 700 | → 32px | letter-spacing −0.01em |
| **H2** | Archivo | 17–18px | — | 600 | → 20px | |
| **Body** | Instrument Sans | 15px | 1.6 | 400 | → 16px | color `ink-2` |
| **Small** | Instrument Sans | 13px | 1.5 | 400 | | color `ink-2` |
| **Label** | IBM Plex Mono | 11px | — | 400/500 | | UPPERCASE, letter-spacing +0.14em |

### Mono letter-spacing (tracking) by context

| Context | Tracking |
|---|---|
| Eyebrow labels on reveal screens | 0.22em |
| Section headers / card eyebrows | 0.16em |
| Standard labels | 0.14em |
| Nav labels, counters, captions | 0.10–0.12em |
| Badges | 0.10em |
| Wordmark subtitle ("RATING") | 0.42em |

### Wordmark lockup

"ROAD TO NEXT" in Archivo 800, `font-stretch: 125%`, letter-spacing ~0.05–0.08em; "RATING" below in IBM Plex Mono, wide tracking (0.42em at full size). Logo mark scales to **16px minimum**. Clearspace = the length of the plateau stroke.

---

## 3. Radius scale (formalized)

> **The inconsistency being resolved:** the spec's Tailwind snippet declares only `{ card: 20px, btn: 14px }`, but the mockups actually use **6 / 9 / 12 / 14 / 16 / 18 / 20 / 28px** plus fully-round. Rather than carry a 2-token config that silently disagrees with the components, this is the single formalized scale we use everywhere. It ties to shadcn's `--radius: 0.875rem` (14px = the button/base radius).

### The scale

| Token | px | Tailwind key | Usage |
|---|---|---|---|
| `radius-xs` | **6** | `rounded-xs` | Badges, small pills |
| `radius-sm` | **8** | `rounded-sm` | Small square controls — checkboxes (snap 9→8) |
| `radius-md` | **12** | `rounded-md` | Inputs, icon buttons (back button) |
| `radius-lg` | **14** | `rounded-lg` | Buttons (primary / secondary / ghost) — **base radius**, = shadcn `--radius` |
| `radius-xl` | **16** | `rounded-xl` | Option-select buttons, plan/selector cards, grouped list containers, settings cards |
| `radius-2xl` | **20** | `rounded-2xl` | Content cards / panels (`.card`) |
| `radius-full` | **9999** | `rounded-full` | Dots, progress bars, story ticks, toggles, circular avatars/controls |

### Snapping decisions (outliers reconciled)

- **9px checkbox → `radius-sm` (8px).** Imperceptible change; removes a one-off value.
- **28px screen frame → not a UI token.** This is the device-mockup bezel. In the real app the screens are full-bleed; if a card ever needs a phone-frame look, use `radius-2xl` (20).
- **18px app-icon squircle → not a UI token.** It's an icon asset. If the mark appears as an in-app chip, use `radius-xl` (16).

### Optional simplification (decide before build)

The ladder 12 / 14 / 16 is deliberately tight (inputs < buttons < option-cards, 2px apart). If we want fewer steps we *could* collapse **inputs to 14** (= buttons), dropping `radius-md`. **Recommendation: keep all three** — the distinction is intentional in the mockups (an input should read slightly tighter than a button sitting next to it) and 2px is cheap to maintain once tokenized.

---

## 4. Spacing & layout

- **Screen padding:** `24px` all sides (`box-sizing: border-box`); header row adds `padding-top: 16–20px`.
- **Canvas / phone frame:** `375 × 812px`. The whole system is specified at **375px width only**.
- **Card internal padding:** `20px` default (variants: `18px 20px`, `20px 22px`, `22px`, `24px`); child gap `6–14px`.
- **Vertical rhythm inside screens:** stacks `gap: 12–16px`; hero / centered blocks `gap: 20–28px`.
- **Button → caption:** 14px gap; caption is mono 11px `ink-3`, left-aligned (nothing is centered except the reveal).
- **Section gaps (design canvas only):** 56px between major sections, 24px between cards in a row.

---

## 5. Core components

### Buttons — height 52px · `radius-lg` (14) · font 15px

| Variant | Default | Hover | Active / Disabled |
|---|---|---|---|
| **Primary** | bg `optic`, text `optic-ink`, weight 600 | bg `optic-hover` | active `scale(0.98)` |
| **Secondary** | bg `surface-2`, border `line-strong`, text `ink`, weight 600 | border → `line-hover` | — |
| **Ghost / tertiary** | h44, no bg, text `ink-2`, weight 500, 14px | text → `ink` | — |
| **Disabled / done** | bg `surface`, border `line`, text `ink-3` | — | e.g. "Session logged today · done" |
| **Primary + meta** | h56; adds mono 11px `opacity:0.75` suffix (e.g. "18 MIN") | bg `optic-hover` | Home CTA |

### Option-select button — min-height 64px · `radius-xl` (16) · font 15px · LH 1.4–1.45

- **Default:** bg `surface`, border `line`, text `ink`.
- **Hover:** border `line-hover`, bg `#17171A`.
- **Selected:** bg `rgba(216,227,76,0.08)`, border `optic`, plus a **10×10px accent dot** (`radius-full`) pinned right via `justify-content: space-between`.

### Input — height 48px · `radius-md` (12) · font 15px

- bg `surface`, border `line-strong`, padding `0 16px`, placeholder `ink-3`.
- No explicit focus state in the spec; `--ring` = accent, so **focus ring = optic**.

### Card — `radius-2xl` (20) · padding 20px

- bg `surface`, border `line`. Eyebrow = mono 10px, tracking 0.14–0.16em, `ink-3`. Title = Archivo 700, 20px.
- **Accent-tinted variant:** border `optic` + bg `rgba(216,227,76,0.04–0.05)` (in-game rule; "your first re-test" callout).

### Progress bar

- **Thin:** height 3px, track `line`, fill `optic`, `radius-full`. (Assessment header.)
- **Thick:** height 6px, track `line`, fill `optic`, `radius-full`. (Readiness, delta.)

### Tab bar — height 64px · text-only, no icons

- Container: `border-top: 1px solid line`, bg `background`, three equal flex items.
- **Active indicator:** a `16×2px` accent tick (`radius-full`) above the label — `optic` when active, `transparent` when inactive.
- Labels: IBM Plex Mono 11px, tracking 0.12em. Active `ink`, inactive `ink-3`. Labels: **HOME · PLAN · PROGRESS**.
- Item hover: bg `surface`.
- *Rationale:* no icons — three mono labels keep the paddle/ball iconography problem out.

### Badges — mono 10px · tracking 0.10em · padding 5px 9px · `radius-xs` (6)

| Badge | Text | Fill |
|---|---|---|
| ON TRACK / PAID | `optic` | `rgba(216,227,76,0.12)` |
| DUE TODAY | `warn` | `rgba(227,184,76,0.12)` |
| PLATEAU | `danger` | `rgba(227,101,76,0.12)` |
| LOCKED / SCHEDULED | `ink-3` / `ink-2` | `surface-2`, border `line` |
| SAVE 17% (paywall) | `optic-ink` | solid `optic` |

### Other elements

- **Toggle (settings):** 44×26px pill, `radius-full`. On = `optic` with a 20×20 knob `optic-ink`, inset top/right 3px.
- **Checkbox (plan task):** 26×26px, `radius-sm` (8, snapped from 9). Done = `optic` fill + `optic-ink` check. Todo = 1.5px `line-hover` border, transparent.
- **Back / icon button:** 36×36px, `radius-md` (12), border `line-strong`, glyph `ink-2`; hover border `line-hover`.
- **Story-progress ticks (reveal):** 5 equal bars, height 2px, `radius-full`. Filled = `ink`, empty = `line-strong`.
- **Locked / blur treatment:** a placeholder of the real structure (never the paid values) at `filter: blur(6–7px); opacity: 0.45–0.5`, under a flat cover `rgba(19,19,21,0.6)` (no gradient), a lock icon, and a one-line teaser naming what's underneath. **The current number always stays visible** — desire, not resentment. Never a hard empty box.

### Animation

- Keyframe `rtnrRise`: `from { opacity:0; translateY(10px) } to { opacity:1; translateY(0) }`.
- The **Computation** interstitial is choreographed over ~5s (staggered reasoning lines → "Found it." → auto-advance). No spinner, no percentage — the pause *is* the product doing something serious.

---

## 6. Screens — copy & layout

All screens: `375 × 812px`, 24px padding. Reveal/delta screens use `reveal-bg` (`#060607`).

### Landing
- Header: logo mark + "ROAD TO NEXT" (Archivo 12px).
- Centered block: eyebrow mono `FOR PLAYERS STUCK AT 3.0–4.0` → **Display 38px "You don't have ten weaknesses. You have one."** → body: "Twelve questions. One diagnosis: the skill holding your rating down, why it hasn't moved — and the three weeks that fix it."
- Footer: primary button **"Start the assessment"** + mono caption "12 QUESTIONS · 4 MINUTES · FREE".

### Assessment question
- Header row: back button · thin 3px progress bar (e.g. 58%) · mono counter "07/12".
- Eyebrow mono (e.g. `UNDER PRESSURE`) → question Archivo 700, 24px, LH 1.25.
- 4 option-select buttons (one may be selected, accent border + dot).
- Spacer → primary button **"Next"**.

### Reveal — Computation (pre-mirror interstitial)
- `reveal-bg`. Eyebrow `READING YOUR ANSWERS`. Three reasoning lines surface one at a time (`rtnrRise`, delays 0.3s / 1.5s / 2.7s), each with a 6px muted dot:
  1. "Twelve answers, one direction."
  2. "Cross-checked against 3.5 plateau patterns."
  3. "One skill explains all of them."
- Lands on Archivo 800, 34px **"Found it."** (delay 4s) → mono "CONTINUING…" (4.6s). ~5s, auto-advances. No spinner.

### Reveal beats (story-progress ticks, `reveal-bg`)

**Beat 1/5 — Mirror** (1 tick)
- Eyebrow `WHAT YOU TOLD US` → Archivo 700 24px "In your own words —".
- Three quotes, each with a 2px left border `line-strong`, padding-left 16px, text `ink` 16px (the user's own answers reflected back — no diagnosis yet).

**Beat 2/5 — Verdict** (2 ticks) — *centered*
- Eyebrow `YOUR BOTTLENECK` → Archivo 800 **46px** skill name (the only large thing on screen) → 44×1px divider → body (max 280px): "One skill is holding your rating at 3.5. This is it."

**Beat 3/5 — Insight / reframe** (3 ticks) — left-aligned
- Eyebrow `WHY IT HASN'T IMPROVED` → Archivo 700, 25px, LH 1.32 (the "that's exactly me" line, e.g. "You've hit thousands of drops. Almost none of them counted.")
- Body 15.5px, LH 1.68 explaining the root cause. No score yet.

**Beat 4/5 — Absolution** (4 ticks)
- Eyebrow `THE PART THAT MATTERS` → Archivo 700, 29px, LH 1.28 (moves fault from player to absence of structure) → 44×1px divider → body reassurance. The emotional exhale.

**Beat 5/5 — Readiness** (5 ticks)
- Eyebrow `READINESS FOR 4.0` → Archivo 800 **96px** tabular "58 /100" (suffix 28px `ink-3`).
- 6px progress bar at that % + endpoints "3.0" … "4.0" (mono 10px).
- Body one-liner → primary button **"See my 3-week plan"**.

### Home (`background`, tab bar HOME active)
- Header: logo + wordmark; right: mono "DAY 8 / 21" + settings gear (32px circle, border `line-strong`).
- **Bottleneck card** (`radius-2xl`, padding 22): eyebrow `CURRENT BOTTLENECK` → Archivo 800 27px skill name → small "Week 2 of 3 — …".
- **Two-stat row:** *Readiness* card (flex 1.2) Archivo 44px number + 4px accent bar; *Sessions this week* card "2/3" + 3 dots (filled = accent).
- Spacer → primary button h56 **"Start today's session"** + mono "18 MIN" suffix → mono caption "RE-TEST OPENS IN 13 DAYS".

### My Plan (tab bar PLAN active) and the anonymous plan on `/start`
One component (`PlanView`) for both. No cards; hairlines only. Top to bottom:
- Mono `YOUR FOCUS` → Archivo 800 32px skill title. On `/start` only: "Replay your diagnosis" text link.
- **Rows** between hairlines, mono label and a 16px body-font value: `PLAN` "3 weeks · 2 sessions a week" · `SESSION` "25 min · both drills" (minutes summed from the drills, never fixed text) · `THIS WEEK` "1 of 2 sessions" (signed in only) · `RE-TEST` "Nov 29" / "Open now" / "Not scheduled" / "In 3 weeks" (anonymous).
- **Two drill rows:** Archivo 600 18px name, mono "15 MIN · SOLO" / "15 MIN · PARTNER" / "10 MIN · SOLO · WALL" under it, a chevron at the right. The whole row opens the drill's page, read-only (`?drill=<id>` on the same route). No inline description, no fold-out, no per-drill button. A drill logged today reads "TODAY · 7/10" in place of its time ("TODAY · LOGGED" when it was logged without a number).
- **One action slot, the screen's one accent:**
  - anonymous: "A free account keeps your plan and lets you start your sessions." + primary **"Save my plan"** (the only way into the save form; signed in and retaking, the line is "This plan isn't on your account yet. Saving it makes it your current plan.");
  - signed in with a session to do: primary **"Start session"** ("Continue session" when today's is half done), secondary while an open re-test's banner holds the accent;
  - signed in with nothing to start: a status line, no button. "Today's session complete. 1 to go this week." · "Today's session complete. Both sessions done this week." · on the week's last day, "Today's session complete. Next week's sessions open Monday." · both done earlier, "Both sessions done this week. Next week's open Monday." In the plan's final week (the re-test date is on or before next Monday) a line that would point to Monday points to the re-test instead: "… Your re-test opens Dec 2." With the re-test open the banner above says so, and the lines stop at "Today's session complete." / "Both sessions done this week."
- `IN YOUR GAMES` (one sentence), then `RE-TEST GOAL` (one sentence): mono label, 16px `ink` text, hairline above each. Both are rendered from code by skill (the third-shot goal from the starting answer), not read from the plan row.
- On `/start` only: "Start over with a new assessment" (text link, confirmed before it runs).
- Not here: a quote of the player's answer, "Same drills each week…", a paragraph about the device, Readiness (on Progress), a pinned button.

### Progress — full (PAID) (tab bar PROGRESS active)
- Title Archivo 700 24px "Progress".
- **Readiness chart** card: eyebrow `READINESS — 6 WEEKS` + accent delta. SVG single accent polyline rising, dashed target line at top (`line-strong`), endpoint dot. X-axis dates + "RE-TEST LINE ···· 80". Integers only; the rising shape echoes the logo.
- **Re-test history** card: rows (name / date → score, accent deltas, `SCHEDULED` badge for future).
- **Streak** card: eyebrow `STREAK` + "5 weeks hitting target" + filled/empty 12px squares.

### Progress — before the first re-test
- **Shown until the first completed re-test** (`hasCompletedRetest`, `src/lib/retest-gate.ts`: the player owns a plan a re-test made), not until a second diagnosis: a retake adds a diagnosis without a re-test. Nothing is sold here: no locked cards, no upgrade, for any tier.
- **Hero, set on the page (no card):** mono `SESSIONS DONE` → Archivo 800 56px "3" with " of 6" at 24px `ink-3` → a row of six plain segments (6px, `radius-full`), completed ones in `optic`, not grouped by week. The count is this plan's completed sessions only (a retake starts again at 0) and holds at "6 of 6" past six. The lit segments are the screen's one accent.
- **`READINESS` row** (hairline above): mono label left, Archivo 800 32px "45" with mono "/100" in `ink-3` right, then "A score from your answers, not a DUPR estimate." The baseline: the reading this plan was built from, free for every tier.
- **`RE-TEST` row:** mono label left, "Nov 29 · in 13 days" (16px, 600) right, then one sentence, the same for everyone: "Your re-test gives you a new score to compare with this one." No date: "Not scheduled", sentence kept.
- **Re-test open:** the re-test block leads the screen and holds the accent, so the lit segments go neutral (`ink-2`) and the `RE-TEST` row is hidden.
- Not here: a large date, a week or day count, "This is the day you find out…", or a chart mark.
- **Subscriber variant:** the same top block, then what they pay for, unlocked and neutral (no lock, no blur, no accent), in hairline sections: `RE-TEST HISTORY` ("Your first entry lands Nov 29."; with the re-test open or no date, "Your first entry comes from your re-test."), then "Weeks with both sessions" with live data. The chart, history and logged-sessions series aren't loaded in this state.
- **What the page is handed:** the session count, the one readiness number and the re-test date. Never the diagnoses or plans themselves, so no earlier reading, re-test history or logged result reaches a browser in this state.

### Progress — locked (FREE)
- Only after the first completed re-test; before it, the screen above.
- Readiness now, set on the page (no card): mono `READINESS NOW` → Archivo 800 72px number → mono "SINCE START 52 → 58 +6" (change in ink, `danger` when down, NO CHANGE neutral) → "A score from your answers, not a DUPR estimate."
- Two locked cards (flat cover, no gradient; see Locked / blur treatment) with lock icons + teasers: "Your readiness line across every re-test, whichever way it went." / "Re-test history, with how every skill moved each time."
- Primary button **"Unlock Progress"** (no price on an entry point; secondary while the re-test is open).

### Re-test Delta — PAID (`reveal-bg`)
- Eyebrow `RE-TEST COMPLETE` → Archivo 800 34px **"Your drop moved."**
- Score transition: ghosted old (72px, `ink-3`) → "→" → new (72px, full) → accent delta.
- Per-skill breakdown card (bg `background`, border `line`): rows of `old → new` with accent per-skill deltas.
- Primary button **"See what to fix next"**.

### Re-test Delta — FREE
- Identical header + score transition, but the per-skill card is **blurred** behind a scrim with lock label "WHICH SKILLS MOVED" + teaser.
- Primary button **"See the full breakdown"**. (Free users get the number; per-skill teased to place the paywall at peak desire.)

### Paywall
- Eyebrow `YOU'RE IMPROVING — KEEP THE RECEIPTS` → Archivo 800 30px **"See every point you earn from here."**
- 4 accent-bullet feature lines (per-skill deltas / readiness chart & history / drill history & streaks / next bottleneck sequenced).
- **Plan selector:** *Annual* card (selected — accent border, tint): "$79 / year · equivalent to $6.58 per month" + `SAVE 17%` badge. *Monthly* card (muted): "$7.99 / month · billed monthly" + empty radio.
- Primary **"Continue — $79/year"** + mono caption "YOUR DIAGNOSIS, PLAN, AND HOME STAY FREE · CANCEL ANYTIME".
- *Placed at peak motivation, right after the free delta — not on entry. Annual is default.*

### Auth screens (all of them)
Applies to the Save Gate and its views (form, existing-account note, code screen, inline log-in), `/login` (form and code screen), `/forgot-password`, `/reset-password` and `/auth/link-error`.
- **Top-aligned:** the heading about 80px from the top of the screen (88px on the pages with a logo, 20px under it), never vertically centered, so the field and the primary button stay above the phone keyboard.
- **Errors:** plain `danger` text, 16px, directly under the field or button it belongs to, `role="alert"`; no box, border or fill. An error the page arrives with (after a redirect, e.g. an expired reset link) sits there too, and its field points at it (`aria-invalid`, `aria-describedby`), since a screen reader may not read out an alert that was already on the page. The plan's Save my plan and pending line follow the same rule.

### Save Gate (auth)
- The plan's **"Save my plan"** is the only way in (and the pending line's "Enter code", to its code screen). Every way through it ends on Home, which says "Plan saved" once: the typed code, the inline log-in, the emailed link.
- Top row, at the right: "Already have an account? **Log in**" (16px, the two words underlined; opens the inline log-in view, address carried over).
- Archivo 800 30px **"Save your plan"** → one line: "Free account. Your plan and session numbers stay with you."
- **One grouped field block** (`radius-md`, border `line-strong`, bg `surface`): Email row, hairline `line`, Password row with a mono Show/Hide. Each row keeps its mono uppercase label inside the block (EMAIL, PASSWORD), so it doesn't vanish when typed over. Inputs 16px; the password placeholder carries the rule ("8+ characters"). Focus on either field turns the whole block's border `optic` (focus-within), so the rounded corners stay intact.
- Primary full-width **"Create account"** ("Creating account…" while busy) directly under the block → consent line (legal fine print, 14px `ink-2`) → **"Back to my plan"** as a quiet left-aligned text link.
- **Existing account:** a sign-up with an address that already has a confirmed account shows a neutral note under the block (hairline above): "You already have an account with this email." with a primary **"Log in"**; "Create account" goes secondary while it shows, and editing the address hides it.
- No eyebrow, no "Your plan" card, no reason paragraph, no Google button (the flag is off), no second log-in line at the bottom.
- *A **save** action, not a signup wall: it comes after value is delivered.*

### Code screen (sign-up)
- Archivo 800 30px **"Enter the code we emailed"** → "Sent to {email}" on its own line (the address moves down whole rather than breaking, and breaks inside only when wider than the screen) → **"Change email"** text link on the next line.
- One 6-digit code field (mono, spaced digits; a pasted code with spaces is accepted) → resend line under it: "Resend code in Ns", then a **"Resend code"** text button, then "Code sent · resend in Ns". The countdown runs from the last send, stored, so a refresh keeps it.
- **"Continue"** ("Checking…"): the disabled style (bg `surface`, border `line`, text `ink-3`) until six digits are in and it can be sent (not while checking, and not while the field still holds the code that just failed), primary only then → "Already confirmed? Log in" (opens the inline log-in) → "Back to my plan" (save form only; not on `/login`).
- Wrong or expired code: one alert as plain `danger` text under the field (no box, border or fill), "That code didn't work or has expired.", with the code selected for retyping. The selection inside the field is a muted white (`white/20`), not the accent.

### Inline log-in (save form)
- Archivo 800 30px **"Log in"** → the Save Gate's grouped field block (EMAIL filled in, hairline, PASSWORD with Show/Hide) → "Forgot password?" → primary **"Log in"** ("Logging in…") → "Back to save your plan" (plain "Back" when it was opened from the code screen, since that is where it returns).
- An account still waiting on its code gets a fresh one emailed and goes to the code screen.

### Pending sign-up (on the plan)
- Between hairlines at the top of the plan: "Finish saving your plan: enter the code we sent to **{email}**." → one text link, **"Enter code"** (opens the code screen, which has resend, Change email and "Already confirmed? Log in"; the code lands on Home). A failed save shows its alert inside the block.

### Log in (auth)
- Logo + wordmark → Archivo 800 30px **"Welcome back."**
- Email input → Password input (with mono "FORGOT?" inline) → primary **"Log in"** → ("OR" divider → "Continue with Google" only when the Google provider is on).
- An unconfirmed account gets a fresh code and the code screen in place.
- Footer, left-aligned: "New here? Take the assessment". *Two fields, one primary action.*
- Player-facing wording is "Log in" everywhere (button, links, errors), and Settings says "Log out".

### Drill page (guided session, plan rows, landing example)
One component (`DrillPage`), three places: the guided session's first screen, the read-only page a plan row opens, and the landing's example drill.
- Header: back button (36×36, `radius-md`) + mono `DRILL 1 OF 2` beside it.
- Diagram (side view: the shot's court diagram, or the shared wall template with per-drill labels for a drill prescribed at a wall) → Archivo 700 24px drill name → one sentence (the drill's `task`, 16px `ink`).
- Rows between hairlines, mono label and a 16px body-font value: `TIME` "15 min" · `WHO` "Partner" / "Solo" / "Solo, at a wall" · `COUNTS` (the "counts if" sentence) · `LOG` "Your last set of 10 drops" · `TARGET` "7 of 10". Times come from the drill, never fixed text.
- The scoring rule, 16px `ink-2`: "When the timer ends, finish the {set / rep / exchange / rally} you're on and log it." (the drill's own word). Also on the timer, followed by "Falling short of 7 of 10 still counts."; not on the log screen. The full description is behind "View instructions" on the timer.
- In a session: primary **"Begin"**, then mono `NEXT: {DRILL} · {MIN}` left-aligned. Read-only (from a plan row): no button and no NEXT line, back arrow only.
- No card, no "When the timer ends" box.

### Settings
- Header: back button + Archivo 700 22px "Settings".
- **ACCOUNT** group (surface card, dividers `line`): "Email → …", "Display name → … ›".
- **SUBSCRIPTION** group: "Plan → Annual · renews …", **"Manage subscription ›"** (accent text) + caption. *(Free users see "Plan · Upgrade to unlock Progress ›" instead, a link to the paywall, but only after their first completed re-test. Before it, a static "Plan · Free" row: no link, no chevron.)*
- **Subscription already ended in Stripe** (a Cancel or "Keep my subscription" tap on a subscription that had ended, or found when Manage or Settings re-reads Stripe on load): Settings in its free state, with one line under the SUBSCRIPTION group: Body 16px, `ink-2`, `role="status"`, no accent, left-aligned. Cancel or found on load: "Your subscription had already ended. Nothing more will be charged." Keep: "Your subscription has ended, so it can't be resumed. You're on the free plan now." (no date). Never shown while the profile is paid.
- **Manage subscription error:** "Something went wrong. Email support@… and we'll sort it out." in `danger`, left-aligned, under the button.
- **NOTIFICATIONS** group: "Email me when my re-test opens" + accent toggle.
- Footer: "Log out" (secondary) + "Delete account" (`danger` text, hover `danger-hover`).
- *The plainest screen in the app. Accent appears only on the two things a person came here to do — Manage subscription / Upgrade. Manage and Delete are both one tap from the top, never buried.*

---

## 7. Reference Tailwind config (from the spec — for derivation only)

```js
// tailwind.config — theme.extend
colors: {
  background: "#0B0B0C",
  surface: { DEFAULT: "#131315", 2: "#1A1A1D" },
  line: { DEFAULT: "#232327", strong: "#2E2E33" },
  ink: { DEFAULT: "#F4F4F2", 2: "#9C9C97", 3: "#63635E" },
  optic: { DEFAULT: "#D8E34C", ink: "#131408", dim: "rgba(216,227,76,0.12)" },
  warn: "#E3B84C", danger: "#E3654C",
},
fontFamily: {
  display: ["Archivo", "sans-serif"],
  sans: ["Instrument Sans", "sans-serif"],
  mono: ["IBM Plex Mono", "monospace"],
},
// borderRadius — use the formalized scale in §3, not the spec's 2-token version:
borderRadius: { xs: "6px", sm: "8px", md: "12px", lg: "14px", xl: "16px", "2xl": "20px" }
```

---

## 8. Open decisions before wiring anything in

1. **Dark-only, 375px-only.** No light mode, no desktop layouts are specified (desktop type sizes are hinted only). Decide: mobile-width-centered on desktop, or design desktop ourselves.
2. **Fonts:** move from Google CDN → `next/font` (Archivo variable, Instrument Sans, IBM Plex Mono).
3. **Radius:** adopt the §3 formalized scale (supersedes the spec's `card:20 / btn:14`).
4. **Reveal choreography** (`rtnrRise` + timed delays) is part of the spec, not just styling.
