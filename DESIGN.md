---
name: Road to Next Rating
description: A calm, monochrome instrument that finds the one skill holding a plateaued pickleball player back — and marks it with the only color in the room.
colors:
  background: "#0B0B0C"
  surface: "#131315"
  surface-2: "#1A1A1D"
  line: "#232327"
  line-soft: "rgba(255,255,255,0.06)"
  line-hair: "rgba(255,255,255,0.08)"
  line-strong: "#2E2E33"
  line-hover: "#4A4A50"
  ink: "#F4F4F2"
  ink-1: "#D8D8D4"
  ink-2: "#B0B0AB"
  ink-3: "#80807B"
  optic: "#D8E34C"
  optic-hover: "#E6EF7A"
  optic-ink: "#131408"
  optic-dim: "rgba(216,227,76,0.12)"
  warn: "#E3B84C"
  danger: "#E3654C"
  danger-hover: "#E98572"
  reveal-bg: "#060607"
typography:
  display:
    fontFamily: "Archivo, sans-serif"
    fontSize: "40px"
    fontWeight: 800
    lineHeight: 1.08
    letterSpacing: "-0.02em"
  metric:
    fontFamily: "Archivo, sans-serif"
    fontSize: "56px"
    fontWeight: 800
    lineHeight: 1.0
    letterSpacing: "normal"
  display-md:
    fontFamily: "Archivo, sans-serif"
    fontSize: "64px"
    fontWeight: 800
    lineHeight: 1.03
    letterSpacing: "-0.03em"
  display-desktop:
    fontFamily: "Archivo, sans-serif"
    fontSize: "80px"
    fontWeight: 800
    lineHeight: 1.03
    letterSpacing: "-0.03em"
  marketing-lede:
    fontFamily: "Instrument Sans, sans-serif"
    fontSize: "17px"
    fontWeight: 400
    lineHeight: 1.55
  marketing-lede-desktop:
    fontFamily: "Instrument Sans, sans-serif"
    fontSize: "20px"
    fontWeight: 400
    lineHeight: 1.5
  statement:
    fontFamily: "Archivo, sans-serif"
    fontSize: "26px"
    fontWeight: 800
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  statement-sm:
    fontFamily: "Archivo, sans-serif"
    fontSize: "36px"
    fontWeight: 800
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  statement-md:
    fontFamily: "Archivo, sans-serif"
    fontSize: "46px"
    fontWeight: 800
    lineHeight: 1.08
    letterSpacing: "-0.02em"
  statement-desktop:
    fontFamily: "Archivo, sans-serif"
    fontSize: "54px"
    fontWeight: 800
    lineHeight: 1.08
    letterSpacing: "-0.02em"
  marketing-h2-group:
    fontFamily: "Archivo, sans-serif"
    fontSize: "26px"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.01em"
  marketing-h2-group-desktop:
    fontFamily: "Archivo, sans-serif"
    fontSize: "32px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  marketing-formula:
    fontFamily: "IBM Plex Mono, monospace"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0.02em"
  marketing-h3:
    fontFamily: "Archivo, sans-serif"
    fontSize: "20px"
    fontWeight: 700
    lineHeight: 1.25
  marketing-h3-desktop:
    fontFamily: "Archivo, sans-serif"
    fontSize: "22px"
    fontWeight: 700
    lineHeight: 1.25
  marketing-small:
    fontFamily: "Instrument Sans, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
  h1:
    fontFamily: "Archivo, sans-serif"
    fontSize: "24px"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.01em"
  h1-desktop:
    fontFamily: "Archivo, sans-serif"
    fontSize: "32px"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.01em"
  h2:
    fontFamily: "Archivo, sans-serif"
    fontSize: "18px"
    fontWeight: 600
  h2-desktop:
    fontFamily: "Archivo, sans-serif"
    fontSize: "20px"
    fontWeight: 600
  body:
    fontFamily: "Instrument Sans, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.6
  body-desktop:
    fontFamily: "Instrument Sans, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.7
  small:
    fontFamily: "Instrument Sans, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "IBM Plex Mono, monospace"
    fontSize: "11px"
    fontWeight: 400
    letterSpacing: "0.14em"
  eyebrow:
    fontFamily: "IBM Plex Mono, monospace"
    fontSize: "10px"
    fontWeight: 400
    letterSpacing: "0.16em"
  badge:
    fontFamily: "IBM Plex Mono, monospace"
    fontSize: "10px"
    fontWeight: 400
    letterSpacing: "0.10em"
rounded:
  xs: "6px"
  sm: "8px"
  md: "12px"
  lg: "14px"
  xl: "16px"
  2xl: "20px"
  full: "9999px"
spacing:
  screen-padding: "24px"
  card-padding: "20px"
  stack-gap: "12-16px"
  hero-gap: "20-28px"
components:
  button-primary:
    backgroundColor: "{colors.optic}"
    textColor: "{colors.optic-ink}"
    rounded: "{rounded.lg}"
    height: "52px"
    padding: "0 16px"
  button-primary-hover:
    backgroundColor: "{colors.optic-hover}"
  button-secondary:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    height: "52px"
  button-ghost:
    textColor: "{colors.ink-2}"
    height: "44px"
  option-select:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.xl}"
    height: "64px"
  option-select-selected:
    backgroundColor: "rgba(216,227,76,0.08)"
    rounded: "{rounded.xl}"
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.2xl}"
    padding: "20px"
  input:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.md}"
    height: "48px"
    padding: "0 16px"
---

# Design System: Road to Next Rating

## Overview

**Creative North Star: "The Plateau, Broken"**

The whole interface is the logo happening at every scale. A flat, muted line — the rating a player has been stuck on — sits quietly under everything: near-black neutrals, mono labels, no shadows, no gradients, nothing raising its hand. Then, at the one moment that actually matters — the diagnosis, the accent CTA, the readiness number, the chart's rising line — a single optic yellow-green breaks upward off that flat line and takes the only color in the room. Calm and flat until the break; the break gets all the weight.

This is a deliberate rejection of two adjacent registers: the AI-dev-tool blue/navy gradient (reads as "software," not "coaching"), and the shouty fitness-app rainbow (reads as noise, not authority). Instead it borrows the *workout-app register* — stadium-signage type, tabular numbers, calibrated instrument labeling — because the product's whole claim is precision: not "here are ten drills," but "here is the one reading that matters." Mono labels in particular are what make the UI feel *measured* rather than *decorated*.

**Key Characteristics:**
- Monochrome-plus-one: every screen is near-black neutrals; optic yellow-green appears in exactly one place at a time.
- Flat by construction: no shadows, no gradients; depth is tonal layering only.
- Three voices, one job each: Archivo for verdicts, Instrument Sans for the coach's speaking voice, IBM Plex Mono for the instrument reading.
- Nothing is centered except the reveal — the one screen where the whole UI stops and looks straight at the player.
- The break (accent) is earned, not decorative: CTA, one data line, one selected state — never a background, never a heading.

## Colors

True-neutral near-blacks with a whisper of warmth (no blue cast) carry the entire interface; one accent does all the pointing.

### Primary
- **Optic** (`#D8E34C`): the single accent — optic yellow-green, the color of the ball. Marks exactly one thing per screen: one CTA, one data line, one selected state. Never a background, never a heading. Hover state **Optic Hover** (`#E6EF7A`). Text/icon sitting *on* optic fields uses **Optic Ink** (`#131408`). Dim fills and badges use **Optic Dim** (`rgba(216,227,76,0.12)`) at 12%, with 8%/5%/4% variants for selected-option fills, paywall/callout cards, and in-game-rule cards respectively.

### Secondary (state colors — same lightness/chroma family as Optic, so states read as "the instrument changing its reading," not new colors arriving)
- **Warn** (`#E3B84C`): "due today" states.
- **Danger** (`#E3654C`), hover **Danger Hover** (`#E98572`): regressed / plateau / destructive actions (delete account).

### Neutral
- **Background** (`#0B0B0C`): app base, the deepest neutral.
- **Surface** (`#131315`): cards, panels.
- **Surface 2** (`#1A1A1D`): raised surfaces, secondary buttons.
- **Reveal Background** (`#060607`): darker-than-app background reserved for the reveal and delta screens — the one place the UI goes darker to make the accent break read louder.
- **Line Soft** (`rgba(255,255,255,0.06)`): the lighter rule between marketing sections — quiet enough to divide the page without reading as an edge around anything.
- **Line Hair** (`rgba(255,255,255,0.08)`): the marketing screenshot card's edge. Translucent rather than a flat hex so the same hairline holds over both marketing grounds (`background` and the raised `#0E0E10`). Screenshots sit on the page ground with this edge and nothing else — an earlier presentation "stage" wrapped each one in a second, slightly lighter rounded rectangle, which read as a smudge around the card rather than as a surface under it.
- **Line** (`#232327`) / **Line Strong** (`#2E2E33`) / **Line Hover** (`#4A4A50`): default borders/dividers, stronger borders (inputs, empty ticks), and hover borders, in ascending order of visual weight.
- **Ink** (`#F4F4F2`): primary text (~17.9:1 on background).
- **Ink 1** (`#D8D8D4`): marketing body copy (~13.8:1). Exists because a cold visitor on the public site scans rather than studies — in-app secondary text stays on Ink 2, and this tier never replaces it inside the product.
- **Ink 2** (`#B0B0AB`): body/secondary text (~9.1:1 on background — raised from an earlier `#9C9C97` for legibility in bright/outdoor use).
- **Ink 3** (`#80807B`): labels, captions, muted text (~5.0:1 on background — raised from an earlier `#63635E`, which measured 3.25:1 and failed WCAG AA for small text).

### Named Rules
**The Kill-the-Gradient Rule.** No gradients anywhere in the UI chrome. Gradients read as marketing; a blue-toward-green gradient specifically reads as "AI dev tool," which is the one register this product must not occupy.

**The One Accent Rule.** Optic yellow-green never appears twice with two different meanings on the same screen, and never as a background fill behind body copy or a heading color. If nothing on a screen currently matters most, nothing is accented.

**The One Break Exception.** The marketing site's closing section is the single sanctioned inversion: the whole surface goes optic with `optic-ink` type on it. Held across a long near-black page, restraint alone reads as absence rather than discipline — so the page's own north star ("flat until the break") is finally paid off at the moment the visitor is asked to act. Scoped to that one section, on that one surface. It does not license accent fields anywhere else, and never inside the app.

## Typography

**Display Font:** Archivo (variable, `wdth 62–125`, `wght 100–900`), fallback sans-serif
**Body Font:** Instrument Sans (400/500/600), fallback sans-serif
**Label/Mono Font:** IBM Plex Mono (400/500), fallback monospace

**Character:** Archivo carries verdicts and metrics with stadium-signage authority (the wordmark itself uses `font-stretch: 125%` expanded); Instrument Sans is the coach's speaking voice — body copy, explanations, buttons; IBM Plex Mono, always uppercase smallcaps, is the instrument — every label, unit, and countdown reads as a calibrated reading, not a stylistic choice. No font is ever italic.

### Hierarchy
- **Display** (800, 40px → 64px md → 80px desktop, LH 1.03–1.08, tracking −0.02em in-app / −0.03em on the marketing hero): landing/reveal headlines, the one big claim on a screen. The marketing site runs the top of this range so the gap down to a 24px section heading is unmistakable; line-height stays at or above 1.03 because Archivo's ascender overflows a tighter box and the hero sits inside a clipping container.
- **Metric** (800, 56–72px, up to 96px on the Readiness beat, LH 1.0, tabular-nums): the big number — readiness score, re-test deltas. Suffix (`/100`, `/3`) always drops to `ink-3`.
- **Statement** (800, 26px → 36px sm → 46px md → 54px desktop, LH 1.08–1.15, tracking −0.02em): the marketing site's statement sections — one sentence, centred, spanning the container, nothing beside it. Deliberately a step below Display: the hero must stay the loudest thing on the page, and a statement that matched it would read as a second hero. Mobile runs 26px because 30px wrapped the sentence to six centred lines of ~20 characters, which is the hardest wrap the page can produce.
- **Marketing H2 (group)** (700, 26px → 32px, LH 1.2–1.25, tracking −0.01em): a heading that has to hold a group of numbered steps under it rather than one column of prose. At ordinary section scale a centred heading over a 2,300px group reads as a caption that lost its paragraph.
- **Marketing formula** (400, 12px, LH 1.5, IBM Plex Mono, sentence case, `ink-2`): the one place mono is not uppercased. The Nothing-But-Caps habit is right for labels, units and countdowns; an equation set in 67 characters of caps is a paragraph wearing a label's clothes, and it is the sentence that makes the weighted-gap readout legible at all.
- **H1** (700, 24px → 32px, LH ~1.25, tracking −0.01em): screen titles.
- **H2** (600, 17–18px → 20px): card titles, section headers.
- **Body** (400, 15px → 16px, LH 1.6, color `ink-2`): explanations, descriptions.
- **Small** (400, 13px, LH 1.5, color `ink-2`): secondary copy.
- **Eyebrow / Badge** (400, 10px, uppercase, tracking +0.16em / +0.10em, IBM Plex Mono): the label step *inside* a card or pill, one notch below the standalone Label. Already specified under Components (Cards, Badges) and used in 46 places across the app; recorded here so the ramp is complete rather than split between the token list and the prose.
- **Label** (400/500, 11px, uppercase, tracking +0.14em, IBM Plex Mono): every standalone eyebrow, unit, and countdown that is not inside a card or badge. Tracking widens for emphasis (0.22em on reveal eyebrows, 0.42em on the "RATING" wordmark subtitle) and narrows for density (0.10–0.12em on nav/counters/badges).

### Named Rules
**The Numbers-Are-Tabular Rule.** Every metric and score uses `tabular-nums` so digits never shift width mid-count or mid-comparison (old → new deltas, countdowns).

**The Nothing-Italic Rule.** No italic anywhere in the system; emphasis comes from scale, weight, or the accent color, never from slant.

**The Uppercase-Mono Rule, and its one exception.** Every mono label, unit, badge and countdown is uppercase — that is what makes the UI read as calibrated. The single exception is `marketing-formula`: an equation long enough to need reading rather than scanning is set in sentence case, because caps at that length stop being an instrument label and become an obstacle.

## Layout

Mobile-first, specified natively at **375×812px**; desktop only has hinted type-scale targets (display 38→64px, H1 24→32px, H2 17/18→20px, body 15→16px), so desktop layout composition is an open implementation decision, not yet specified.

Screen padding is **24px** on all sides (`box-sizing: border-box`), with header rows adding **16–20px** top padding. Card internal padding defaults to **20px** (variants: 18/20, 20/22, 22, 24px), with **6–14px** child gaps. Vertical rhythm inside a screen stacks at **12–16px** gaps; hero/centered blocks use **20–28px**. A button sits **14px** above its caption. On the design canvas (not implementation) sections are separated by 56px, cards-in-a-row by 24px.

## Elevation & Depth

**Flat by design — no shadows anywhere in the system.** Depth is conveyed entirely through tonal layering (`background` → `surface` → `surface-2`, ascending lightness) and border weight (`line` → `line-strong` → `line-hover`, ascending visual weight), plus one dedicated darker background (`reveal-bg`, `#060607`) reserved for the reveal and re-test delta screens so those moments read as a level below the app itself — a held breath before the accent breaks through. This is a hard invariant, not an oversight: a shadow anywhere in this system would read as decoration competing with the one accent that's allowed to draw attention.

### Named Rules
**The Flat-By-Default Rule.** No `box-shadow` is ever used. If a surface needs to read as "above" another, it gets a lighter neutral and/or a stronger border — never a shadow.

## Shapes

A formalized 7-step radius scale, tied to shadcn's `--radius: 0.875rem` (14px) as the button/base value:

| Token | px | Usage |
|---|---|---|
| `radius-xs` | 6 | Badges, small pills |
| `radius-sm` | 8 | Small square controls (checkboxes) |
| `radius-md` | 12 | Inputs, icon buttons |
| `radius-lg` | 14 | Buttons (primary/secondary/ghost) — base radius |
| `radius-xl` | 16 | Option-select buttons, plan/selector cards, grouped lists |
| `radius-2xl` | 20 | Content cards/panels |
| `radius-full` | 9999 | Dots, progress bars, story ticks, toggles, circular controls |

No borders appear without a purpose: default dividers use `line`, emphasis borders use `line-strong` or the accent itself (never both a border and a shadow on the same element). Nothing in the system is clipped to a non-rectilinear silhouette except fully-round controls (dots, toggles, avatars).

## Components

Buttons, cards, and inputs all share the same restraint: flat fills, one radius per role, and the accent reserved for the single primary action per screen.

### Buttons
- **Shape:** height 52px, `radius-lg` (14px), 15px font.
- **Primary:** bg `optic`, text `optic-ink`, weight 600. Hover → bg `optic-hover`. Active → `scale(0.98)`. A "primary + meta" variant (h56) adds a mono 11px suffix at 75% opacity (e.g. "18 MIN") — the Home CTA.
- **Secondary:** bg `surface-2`, border `line-strong`, text `ink`, weight 600. Hover → border `line-hover`.
- **Ghost/Tertiary:** height 44px, no background, text `ink-2` weight 500 at 14px. Hover → text `ink`.
- **Disabled/Done:** bg `surface`, border `line`, text `ink-3` (e.g. "Session logged today · done").

### Cards / Containers
- **Corner style:** `radius-2xl` (20px).
- **Background:** `surface`, border `line`.
- **Shadow strategy:** none — see Elevation & Depth.
- **Internal padding:** 20px default.
- **Eyebrow:** mono 10px, tracking 0.14–0.16em, `ink-3`. **Title:** Archivo 700, 20px.
- **Accent-tinted variant:** border `optic` + bg tint at `rgba(216,227,76,0.04–0.05)` — used for the in-game-rule card and first-re-test callouts, i.e. moments the product wants to gently point at without a full CTA.

### Inputs / Fields
- **Style:** height 48px, `radius-md` (12px), bg `surface`, border `line-strong`, padding 0 16px, placeholder `ink-3`.
- **Focus:** no bespoke focus treatment beyond the ring — `--ring` is the accent, so focus = an optic ring.

### Option-Select Button (signature control — every assessment question)
- Min-height 64px, `radius-xl` (16px), 15px font, LH 1.4–1.45.
- **Default:** bg `surface`, border `line`, text `ink`.
- **Hover:** border `line-hover`, bg `#17171A`.
- **Selected:** bg `rgba(216,227,76,0.08)`, border `optic`, plus a 10×10px accent dot pinned to the right edge (`justify-content: space-between`). This is the clearest expression of the One Accent Rule at the component level.

### Locked / Blur Treatment (signature component — every paywalled surface)
- Real content sits underneath at `blur(6–7px)`, `opacity 0.45–0.5` — **never a hard empty box**, and the current headline number always stays visible (desire, not resentment).
- A scrim overlays it: `linear-gradient` from `rgba(6,6,7,0.35)` to `rgba(6,6,7,0.6)`, or a surface-tinted `rgba(19,19,21,0.4→0.7)`.
- A lock icon plus a one-line teaser (mono label optional above it) names exactly what's underneath.

### Progress Bar / Tab Bar / Badges
- **Progress bar:** track `line`, fill `optic`, fully round. Thin (3px) on assessment header and home mini-bar (4px); thick (6px) on readiness and delta screens.
- **Tab bar:** height 64px, text-only (no icons — deliberately, to avoid a paddle/ball iconography problem). Active indicator is a 16×2px accent tick above the label; labels are mono 11px, tracking 0.12em, active `ink` / inactive `ink-3`.
- **Badges:** mono 10px, tracking 0.10em, padding 5px 9px, `radius-xs` (6px). Status color follows the shared state-color family: `optic` (ON TRACK/PAID), `warn` (DUE TODAY), `danger` (PLATEAU), neutral `ink-3`/`surface-2` (LOCKED/SCHEDULED).

## Do's and Don'ts

### Do:
- **Do** keep the accent to exactly one meaning per screen — one CTA, one data line, or one selected state, never more than one at a time.
- **Do** use `tabular-nums` on every metric and score so digits align across a transition (old → new, countdowns).
- **Do** uppercase and letter-space every mono label (0.10–0.22em depending on context) — this is what makes the UI read as calibrated rather than styled.
- **Do** keep the locked/blur treatment honest: blur real content, keep the current headline number visible, never show a hard empty state on a paywalled card.
- **Do** reserve `reveal-bg` (`#060607`) for the reveal and delta screens only — it signals "the app just went quiet to tell you something."

### Don't:
- **Don't** use a gradient anywhere in UI chrome — it reads as marketing, and specifically as "AI dev tool" in this palette.
- **Don't** add a `box-shadow` to anything; depth comes from tonal layering and border weight only.
- **Don't** italicize any text, or center any layout other than the reveal sequence.
- **Don't** let the accent touch a background fill behind body copy or become a heading color — it marks a point, it never paints a surface.
- **Don't** introduce a second accent hue for a new state; new states (warn, danger) must share the accent's lightness/chroma family so they read as "the same instrument, different reading."
