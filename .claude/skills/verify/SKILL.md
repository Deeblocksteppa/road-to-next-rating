---
name: verify
description: Type-check, lint, and screenshot changed screens at 375px and 1440px, then report anything off against CLAUDE.md and the design docs. Use after any UI or copy change, before /ship.
argument-hint: "[routes to check, e.g. /home /plan] (default: inferred from the diff)"
allowed-tools: Bash(npx tsc --noEmit*), Bash(npm run lint*), Bash(git diff*), Bash(git status*)
---

# Verify

Check the current change. Report; do not fix unless the user asks.

## 1. Static checks

Run both, even if the first fails:

```bash
npx tsc --noEmit
```

```bash
npm run lint
```

Record each error as `file:line message`. A clean run is one line: "tsc clean, lint clean".

## 2. Pick the screens

If `$ARGUMENTS` names routes, use those. Otherwise read `git status --short` and `git diff --name-only HEAD` and map files to routes:

| Changed path | Routes |
|---|---|
| `src/app/page.tsx`, `src/components/marketing/*` | `/` |
| `src/app/start/*`, `components/assessment/*`, `components/diagnosis/*`, `components/auth/SaveGate.tsx` | `/start` (walk to the screen that changed) |
| `src/app/(app)/home/*`, `components/home/*` | `/home` |
| `src/app/(app)/plan/*`, `components/plan/*` | `/plan` |
| `src/app/(app)/progress/*`, `components/progress/*` | `/progress` |
| `src/app/session/*`, `components/session/*` | `/session` |
| `src/app/retest/*`, `components/retest/*` | `/retest` |
| `src/app/paywall/*`, `components/paywall/*` | `/paywall` |
| `src/app/settings/*`, `components/settings/*` | `/settings` and the subpage |
| `src/lib/*` copy or logic | every screen that renders it (grep the importers) |

If nothing visible changed, say so and stop after step 1.

Signed-in routes need a session. If the browser isn't signed in, use `/test-user` to create one, and run its cleanup at the end of this skill.

## 3. Screenshots

1. `preview_start` with `name: "dev"` (reuses a running server).
2. For each route, at **375×812** then **1440×900** (`resize_window` with width and height):
   - navigate, wait for the page to settle, take a `screenshot`, and scroll for long pages so the whole screen is seen;
   - run the check script below with `javascript_tool`;
   - `read_console_messages` with `onlyErrors: true`.
3. Finish with `resize_window` preset `desktop`.

Check script (paste as is):

```js
(() => {
  const r = { overflowX: document.documentElement.scrollWidth > innerWidth, small: {}, dashes: [], italic: [], shadow: [], gradient: [] };
  const clear = /^(rgba\(0, 0, 0, 0\) 0px 0px 0px 0px(, )?)+$/;
  for (const el of document.querySelectorAll("body *")) {
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden") continue;
    if (cs.boxShadow !== "none" && !clear.test(cs.boxShadow)) r.shadow.push(el.tagName + " " + el.className.toString().slice(0, 60));
    if (cs.backgroundImage.includes("gradient")) r.gradient.push(el.tagName + " " + el.className.toString().slice(0, 60));
    const own = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join("").trim();
    if (!own) continue;
    if (cs.fontStyle === "italic") r.italic.push(own.slice(0, 50));
    if (own.includes("—")) r.dashes.push(own.slice(0, 80));
    const mono = /mono/i.test(cs.fontFamily);
    if (!mono && own.split(/\s+/).length >= 6 && parseFloat(cs.fontSize) < 16) (r.small[cs.fontSize] ??= []).push(own.slice(0, 50));
  }
  for (const k in r.small) r.small[k] = { count: r.small[k].length, e: r.small[k].slice(0, 3) };
  return r;
})()
```

Gradients are allowed only on the locked/blur scrim and the landing's closing section. Focus rings are filtered out of `shadow`.

## 4. Look, not just measure

On each screenshot, check against CLAUDE.md's hard rules and DESIGN.md:

- one accent meaning per screen; nothing centered except the reveal;
- text wraps cleanly at 375 (no mid-word breaks on big titles, no orphaned single words in headlines);
- one dominant element; nothing clipped, overlapping, or cut off by the tab bar;
- copy: no em dashes, one name per concept, example data on the landing has its `ExampleTag` beside it;
- 1440 holds together (centered column or a real desktop layout, not a stretched phone).

## 5. Report

```
Static: tsc clean · lint 2 warnings (file:line …)
Screens: /home 375 ✓ 1440 ✓ · /plan 375 ✗ 1440 ✓

Anything off (most serious first):
1. /plan 375: "Week 1 of 3 — Volume" em dash (src/app/(app)/plan/page.tsx:42)
2. …
```

Each item names the route, width, what is wrong, and the source `file:line` when you can find it. Mention body text under 16px as one grouped item with counts. If nothing is off, say what was checked. Then list any test user created and confirm its cleanup.
