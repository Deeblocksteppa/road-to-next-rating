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
- **Button → caption:** 14px gap; caption is mono 11px `ink-3`, centered.
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

- **Thin:** height 3px, track `line`, fill `optic`, `radius-full`. (Assessment header, home mini.)
- **Thick:** height 6px, track `line`, fill `optic`, `radius-full`. (Readiness, delta.)
- Home readiness mini-bar: height 4px.

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
- **Locked / blur treatment:** real content `filter: blur(6–7px); opacity: 0.45–0.5`, overlaid with a scrim (`linear-gradient(rgba(6,6,7,0.35), rgba(6,6,7,0.6))` or surface-tinted `rgba(19,19,21,0.4→0.7)`), a lock icon, and a one-line teaser naming what's underneath. **The current number always stays visible** — desire, not resentment. Never a hard empty box.

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

### My Plan (tab bar PLAN active)
- Header: eyebrow `WEEK 2 OF 3` → Archivo 700 24px week title; right: accent mono "2/3 SESSIONS".
- **Completed task** card: accent 26px check + strikethrough title `ink-3` + detail.
- **Due task** card (hover `line-hover`): empty checkbox + title + detail + `DUE TODAY` badge.
- **In-game rule** card (accent border, bg `rgba(216,227,76,0.04)`): eyebrow accent `IN-GAME RULE — THIS WEEK` + rule text.
- **Re-test metric** card: eyebrow `RE-TEST METRIC` + target with current progress inline.

### Progress — full (PAID) (tab bar PROGRESS active)
- Title Archivo 700 24px "Progress".
- **Readiness chart** card: eyebrow `READINESS — 6 WEEKS` + accent delta. SVG single accent polyline rising, dashed target line at top (`line-strong`), endpoint dot. X-axis dates + "RE-TEST LINE ···· 80". Integers only; the rising shape echoes the logo.
- **Re-test history** card: rows (name / date → score, accent deltas, `SCHEDULED` badge for future).
- **Streak** card: eyebrow `STREAK` + "5 weeks hitting target" + filled/empty 12px squares.

### Progress — Day One (empty)
- Callout card (accent border, bg `rgba(216,227,76,0.05)`): eyebrow `YOUR FIRST RE-TEST` → Archivo 800 40px date → mono "IN 13 DAYS · WEEK 3 OF 3" → explainer.
- Two stat cards: "SESSIONS DONE / 4", "INTO THE PLAN / Day 8".
- Empty-chart placeholder (dashed border): tiny flat-line SVG + honest copy ("Your readiness line starts on …"). **No fake chart.**

### Progress — locked (FREE)
- Readiness-now card (unblurred): eyebrow `READINESS NOW` → Archivo 800 40px number + accent "+16 SINCE START".
- Two blurred + scrimmed cards ("Your readiness line, over time" / "Re-test history & streaks") with lock icons + teasers.
- Primary button **"Unlock Progress — $79/year"**.

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

### Save Gate (auth)
- Eyebrow `YOUR DIAGNOSIS IS READY` → Archivo 800 30px **"Keep what you just found."** → body: "Save your bottleneck and 3-week plan to your account so it's here tomorrow. No card, nothing to pay." (originally "Free — always." — dropped with the rest of the permanence language)
- "Saving" card: accent dot + "Third-shot drop · 3-week plan · Day 8".
- Auth stack: **"Continue with Google"** (secondary, "G" glyph) → "OR" divider → Email input → "Create a password" input → primary **"Save my plan"**.
- Footer: "Already have an account? Sign in".
- *A **save** action, not a signup wall — comes after value is delivered and shows exactly what's being kept.*

### Sign in (auth)
- Logo + wordmark → Archivo 800 30px **"Welcome back."**
- Email input → Password input (with mono "FORGOT?" inline) → primary **"Sign in"** → "OR" divider → "Continue with Google" (secondary).
- Footer: "New here? Take the assessment". *Two fields, one primary action.*

### Settings
- Header: back button + Archivo 700 22px "Settings".
- **ACCOUNT** group (surface card, dividers `line`): "Email → …", "Display name → … ›".
- **SUBSCRIPTION** group: "Plan → Annual · renews …", **"Manage subscription ›"** (accent text) + caption. *(Free users see "Free · Upgrade to unlock Progress" in the Plan row instead.)*
- **NOTIFICATIONS** group: "Email me when my re-test opens" + accent toggle.
- Footer: "Sign out" (secondary) + "Delete account" (`danger` text, hover `danger-hover`).
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
