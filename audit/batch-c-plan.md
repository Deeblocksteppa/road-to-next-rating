# UX batch C: plan · "don't sell before there's something to buy"

Read-only investigation, 2026-11-08, on `main` at `c11618b`. No code changed. No database or Stripe calls were made.

Decided rules (owner): one server-side "has completed re-test" helper from the same source as `retest-gate.ts`; before the first re-test, free players see no upgrade entry anywhere and subscribers see their paid cards unlocked with empty states; after the first re-test nothing changes; `/paywall` stays reachable by URL.

## Owner's answers to §10 (2026-11-08)

These override the sections below where they differ. Build on `ux-batch-c`, don't merge.

**Built** on `ux-batch-c` (2026-11-08); what shipped, the checks and what's left are in `docs/STATUS.md`. Two corrections from the build: §0.2's retake fix holds only until the player's first re-test (after it, a retake diagnosis still shows as a re-test row in a paid chart and history, `src/lib/progress.ts`); and a retake on free Day One now reads "Your first re-test on {date} adds the next reading." instead of "One point so far".

- **Rule 2 changed: no locked cards on Day One.** A free player before their first re-test keeps Day One exactly as today: no locked cards, no upgrade. The only free-before-re-test changes are (a) Settings' Plan row is a plain "Plan · Free" with no upgrade link, and (b) Progress classifies with `hasCompletedRetest` instead of "two diagnoses". The free-pre locked cards in §3, §4.1 and §7 are dropped, along with their READINESS LINE / RE-TEST HISTORY labels.
- **Q1.** No locked-card wording may imply the cards become free. "Part of the paid plan, offered after your first re-test." is used only where true; after the re-test the current "Unlock Progress" path stays. With rule 2 changed, no pre-re-test screen shows locked cards, so the line isn't used anywhere; the post-re-test teasers ("Your readiness line across every re-test, whichever way it went.", "Re-test history, with how every skill moved each time.") make no free claim and stay.
- **Q2.** Before merge, the owner runs one read-only count in the SQL Editor; a one-time fix, with before and after checks, is used only if the count is above zero. Both are in §12. Claude runs neither.
- **Q3.** Yes: for subscribers before their re-test, the Readiness section replaces Day One's "one point so far" line.
- **Q4.** Yes: one history empty state covers both history and breakdown.
- **Q5.** Yes: a lapsed subscriber before their re-test resubscribes through `/paywall` by URL only.
- **Q6.** Yes: the logged-sessions chart stays in the full state only.

---

## 0. Two findings that change the shape of the work

**0.1 Today, almost nobody sees an upgrade on Progress before a re-test.** `src/app/(app)/progress/page.tsx:87` sends every player with fewer than two diagnoses to Day One, free or paid. Day One has no locked cards and no button. The locked cards with "Unlock Progress" appear only at two or more diagnoses (`:110`). So the rule "locked cards keep their placeholder preview" describes a screen free pre-re-test players mostly don't get today. Two consequences:

- Free before re-test: to follow rule 2 literally, Day One gains the two locked cards (no button). That is new UI, not a removal. See Q1.
- Subscribed before re-test: today they see Day One and **nothing they paid for**. Rule 3 is a new state: Day One plus the paid sections, empty where they need a re-test.

**0.2 "Two or more diagnoses" is not "has re-tested".** A signed-in player who retakes the assessment on `/start` (or claims a second funnel result into an existing account) gets a second diagnosis and plan with no re-test. Progress today treats them as post-re-test: free sees "Unlock Progress"; paid sees a chart and a history that labels the retake "Mid-plan check" or "Full re-test" (`src/lib/progress.ts:132-171`). The new helper fixes this as a side effect: both go to the pre-re-test state.

---

## 1. Every upgrade entry point

| # | Where | What the player sees | Who sees it today | After batch C |
|---|---|---|---|---|
| 1 | `src/components/progress/ProgressView.tsx:228-237` | "Unlock Progress" button → `/paywall?from=/progress`. Optic, or secondary when the re-test is open (`:230-234`). Rendered by `LockedState` only. | Free, 2+ diagnoses (`progress/page.tsx:110`), which includes retakes with no re-test (0.2). | **Changes** (by classification, not in the component): `LockedState` is reached only with a completed re-test. Component unchanged. |
| 2 | `src/app/settings/page.tsx:141-150` | Plan row as a link: "Plan … Upgrade to unlock Progress ›" → `/paywall?from=/settings`. | Every free player, from the first day. | **Changes:** before the first re-test the row is static "Plan · Free" (§4.2). After, unchanged. |
| 3 | `src/components/retest/DeltaScreen.tsx:149-153` (copy `:44`, href `:84`) | Ghost text link under the primary: "Unlock the other skills, readiness history and weeks with both sessions" → `/paywall?from=/retest/{id}`. | Free, on a re-test result with a previous reading. | **No change** (rule 6, §5). A re-test result exists only after a completed re-test. |
| 4 | `src/components/retest/DeltaScreen.tsx:133-141` | `LockedCard` "The other three skills" with a direction teaser (`:37-41`). No link of its own. | Free, same screen as #3. | No change. |

Not entry points, checked:

- `/paywall` itself (`src/app/paywall/page.tsx`, `src/components/paywall/PaywallView.tsx`): the destination. Stays reachable by URL (rule 5). Subscribers are redirected away (`page.tsx:34-37`). Stripe's `cancel_url` returns to it (`src/app/paywall/actions.ts:93`): inside the flow, not an entry.
- `/paywall/success` ("You're in. Progress is unlocked."): after purchase.
- Landing pricing (`src/components/marketing/sections.tsx:427-500`): prices as information, its only button is "Start the assessment" → `/start` (rule 7 holds). See §6.
- Home, Plan, session and recap, re-test flow, `/retest/[id]/next`: no upgrade link (grep for `paywall`, `upgrade`, `unlock`, `subscribe` across `src`).
- Emails (`src/lib/email.ts`, `reminders.ts`, `retest-reminders.ts`, `src/app/api/cron`): no paywall link.
- Terms §5 (`src/app/terms/page.tsx:76-90`) and Refunds describe the paid plan; no link.

---

## 2. The "has completed re-test" helper

**Source.** `retest-gate.ts` reads the `plans` table (newest plan by `created_at`). A completed re-test is recorded there too: `saveRetest` (`src/lib/retest-save.ts:88-91`) inserts the new plan with `source_plan_id`, and that insert is what makes a result count ("a result is only complete once its plan exists", `:23-26`). So:

> A player has completed a re-test when they own a plan with `source_plan_id` set.

No new column, no new table.

**Where it lives.** `src/lib/retest-gate.ts`, next to `openRetestPlan`:

```ts
/** True once the player owns a plan made by a re-test (`source_plan_id` set). */
export async function hasCompletedRetest(supabase: SupabaseClient, userId: string): Promise<boolean>
// select id from plans where user_id = userId and source_plan_id is not null limit 1
// Throws on error, like openRetestPlan.
```

Throwing, not defaulting: a silent `false` would show a subscriber empty states instead of their data; a silent `true` would sell before a re-test. The page's error boundary is the honest outcome.

**How each screen gets it (server only).**

| Screen | Call | Passed to the client |
|---|---|---|
| Progress (`src/app/(app)/progress/page.tsx`) | Added to the existing `Promise.all` (`:49-64`) with the user's server client. | Only through `viewData.kind` (§4.1). No boolean, no paid data in the pre states beyond the streak for subscribers. |
| Settings (`src/app/settings/page.tsx`) | One call after the profile read, only when the profile is free (a paid profile doesn't need it). | Nothing: the page renders the static row or the link. |
| Re-test result | Not needed: post by definition. | |

Both pages are server components already; `ProgressView` has no `"use client"`. The helper never runs in the browser.

**Things that can make the column lie.**

- **Re-tests saved before migration `20261029120000` (run on production 2026-10-29)** have `source_plan_id` null; the migration did no backfill. Those players would read as "before first re-test": a free one loses "Unlock Progress", a paying one sees empty states over real history. Before shipping, run a read-only count on production: accounts with two or more plans and no plan with `source_plan_id`. If any are real players, backfill by hand (see Q2). Production had 30 plans in total on 2026-11-01, most of them test accounts.
- **`plans: update own` lets a player change any column** (STATUS, Outstanding, Batch 2). A player could set or clear `source_plan_id` through the REST API. The worst case is seeing the other state's UI with their own tier's data: no paid data reaches a free player either way (§4.1). Already on the list to restrict.
- `on delete set null`: a source plan goes only with its diagnosis or the whole account; retention deletes unclaimed rows only. Not a practical risk.

---

## 3. States

"Paid" stays what it is everywhere: `profiles.subscription_status === "active"` (scheduled cancellations included).

| | Before first re-test | After first re-test |
|---|---|---|
| **Free** | Progress: Day One + 2 locked cards, no button. Settings: "Plan · Free", static. | Unchanged: locked state with "Unlock Progress"; Settings upgrade link. |
| **Paid** | Progress: Day One + readiness, history (empty states), weeks with both sessions (live). Settings unchanged. | Unchanged: full state. |

No diagnosis at all: the empty prompt, as now (tier doesn't matter).

---

## 4. Screen changes

### 4.1 Progress

**Classification** (`progress/page.tsx:85-163`), replacing `diags.length < 2`:

1. No diagnosis → `empty` (unchanged).
2. No completed re-test → `day-one`, now with a `tier` part:
   - free: `{ tier: "free", readingCount }`. Nothing else read.
   - paid: `{ tier: "paid", streak }`. Reads `getWeeklyStreak` only. The readiness series, history rows and the logged-sessions series are **not** loaded (they'd sit in the RSC payload under an empty state).
3. Completed re-test + free → `locked` (unchanged).
4. Completed re-test + paid → `full` (unchanged). A completed re-test always adds a diagnosis, so `full` has at least two readings; if somehow it had one, the chart already handles a one-point series.

The open-re-test block (`:166-172`, `RetestOpen`) is unchanged and still leads every state.

**Free, before first re-test** (`DayOneState` + new tail):

- Day One as today: "First re-test" date, readings strip, the one-point line (`ProgressView.tsx:89-151`).
- Then the two `LockedCard`s from `LockedState` (`:212-218`), same placeholders (`ChartPlaceholder`, `HistoryPlaceholder` shaped by `readingCount`), with a mono label and the new teaser (§7). No button, no `flex-1` spacer, no price.
- No accent on the screen unless the re-test is open (then `RetestOpen` has it, as today).
- DESIGN.md's locked rule says the current headline number stays visible above the card. Here the headline is the re-test date, and readiness lives on the plan screen (Phase B). The date stays the one dominant element; no "Readiness now" is added.

**Paid, before first re-test** (`DayOneState` + new sections, no `LockedCard`, no lock icon, no blur):

- Day One's date block and readings strip as today.
- **Readiness** section (hairline, mono label, the one-point mark from `:136-139`, the empty sentence). It replaces the one-point line, which would otherwise say the same thing twice ("Your first re-test on Nov 29 adds the second reading." over "Fills in after your re-test on Nov 29."). See Q3.
- **Re-test history** section: hairline, mono label, the empty sentence. The re-test breakdown has no section of its own on Progress: each history row opens `/retest/[id]`, which shows it. So "breakdown, history" is one empty state here. See Q4.
- **Weeks with both sessions**: `StreakContent` (`:444-475`) with live data, unchanged ("Your first full week starts it." at zero).
- Neutral throughout: no optic, so the one accent stays with `RetestOpen` when it shows, else none (as Day One today).

**Retest date in the empty sentence**: the date of the plan the gate reads (newest by `created_at`, `plans[0]` on this page), formatted with `monthDay` ("Nov 29") like the Day One headline. Three cases: future date, open (date today or past), no date (§7).

### 4.2 Settings

`src/app/settings/page.tsx:120-151`:

- Paid: unchanged (Plan row, Manage subscription, caption).
- Free, completed re-test: unchanged ("Upgrade to unlock Progress ›").
- Free, no completed re-test: the existing static `Row` (`:253-284`) with label "Plan", value "Free". No chevron, not a link, `text-ink` value.
- The ended-subscription notice (`:153-157`) still shows under the group in both free states.

### 4.3 Docs

- `Design/DESIGN_SYSTEM.md`: "Progress: Day One" (two pre-re-test variants), "Progress: locked (FREE)" (also drop the stale "Unlock Progress: $79/year": the button has no price), Settings ("Free · Upgrade…" only after the first re-test).
- `DESIGN.md` locked treatment: one line that a pre-re-test locked card has no button.
- `docs/STATUS.md`.

---

## 5. Re-test result: the upgrade entry (report only)

It exists. On `/retest/[id]` for a free player with a previous reading (`DeltaScreen.tsx:79-158`):

- Under the score and "What you trained", a `LockedCard` labelled "The other three skills" (lock icon, mono label) with a teaser that follows the result: up "See where the rest of the points came from.", flat "See whether anything shifted underneath the same score.", down "See which of them slipped and which held." (`:37-41`). The placeholder is skill names only; levels are never sent (`:136-140`).
- The optic primary is the way forward: "See my next plan" (latest) or "Back to Progress" (older).
- Under it, a ghost text link (15px, `ink-2`, centered within its full-width box): "Unlock the other skills, readiness history and weeks with both sessions" → `/paywall?from=/retest/{id}`, so checkout returns to this result.
- Paid players get the breakdown card and no link. The baseline result (`BaselineScreen`, `:233-276`) has no upgrade.

No change proposed.

---

## 6. Landing pricing copy

`sections.tsx:492`: "Offered inside the app after a re-test, right beside the change it explains."

- **Today it doesn't match:** Settings offers the upgrade from the first day, and Progress offers it after a retake with no re-test.
- **After batch C it matches:** every in-app entry is reached only after a completed re-test. The re-test result's link is "right beside the change it explains"; Progress's sits under readiness and "Since start"; Settings' is the one that isn't beside the change, but it is after a re-test, and the sentence describes where the offer is made, not every place it can be found. No landing change needed.
- The rest of the section still holds: the heading and body (`:432-436`), the FREE list (`:384-390`) and PAID list (`:392-397`). "Weeks with both sessions" is listed as paid and a subscriber gets it live before the re-test, which fits.
- `/paywall` by URL before a re-test is not "offered inside the app": nothing links to it.

---

## 7. New copy (no em dashes)

| Where | String | Notes |
|---|---|---|
| Progress, free pre, locked chart card label | READINESS LINE | Mono, uppercase in CSS. |
| Progress, free pre, locked history card label | RE-TEST HISTORY | |
| Progress, free pre, both teasers | "Unlocks after your first re-test." | As decided. See Q1: it reads as free. Suggested instead: "Part of the paid plan, offered after your first re-test." |
| Progress, paid pre, section labels | READINESS · RE-TEST HISTORY | Existing labels. "Weeks with both sessions" unchanged. |
| Progress, paid pre, empty sentence, date ahead | "Fills in after your re-test on {Nov 29}." | Same sentence in both sections. |
| Progress, paid pre, empty sentence, re-test open | "Fills in after your re-test. It's open now." | A past date in "on Nov 8" reads wrong. |
| Progress, paid pre, empty sentence, no date | "Fills in after your first re-test." | Matches Day One's "Not scheduled". |
| Settings, free pre, Plan row value | "Free" | Label "Plan" exists. |

Nothing else changes in wording. All of it is new player-facing copy and needs the owner's read.

---

## 8. Edge cases

1. **Subscribed before batch C ships, no re-test yet.** Today: Day One, nothing paid shown. After: Day One plus readiness and history empty states and live weeks with both sessions. Settings unchanged (Manage subscription). They reached the paywall through Settings, which no longer offers it to a free pre-re-test player; nothing to undo for them.
2. **Subscription ended before the re-test.** The profile goes free (webhook, Manage, or Settings' heal past `renews_at`), so they're free-pre: locked cards, no button; Settings "Plan · Free" with the ended notice under it ("…You're on the free plan now."). Their streak is no longer loaded. They have no in-app way to resubscribe until their re-test; only `/paywall` by URL (Q5). A paid row past `renews_at` that nobody healed still shows paid on Progress (backlog item, unchanged).
3. **Re-test open but not finished.** The re-test flow saves nothing until submit, so they're pre. `RetestOpen` leads Progress (accent); paid empty sentence reads "…It's open now." A submit that wrote its diagnosis and failed before its plan leaves them pre, which matches `saveRetest`'s rule that a result counts once its plan exists; retrying works. The submit redirects to `/retest/[id]` only after the plan insert, so the result screen and the next Progress load agree.
4. **Player on their second plan.**
   - From a re-test: post. Any plan with `source_plan_id` counts, so a third or fourth plan stays post.
   - From a signed-in retake on `/start` or a second claimed funnel result: pre (0.2). A free player loses "Unlock Progress" until they re-test; a paying one sees empty states instead of a two-point chart and a history that mislabelled the retake as a re-test. The empty sentence uses the newest plan's date, the same plan the re-test gate opens.
   - Re-tests before 2026-10-29 without `source_plan_id`: read as pre until backfilled (§2, Q2).
5. **Re-test result reached by a typed URL for a retake diagnosis.** `DeltaScreen` compares any diagnosis with the one before it, so it shows the upgrade link. Nothing in the UI links there for a pre player (history isn't shown pre). Left as is.
6. **`/paywall` by URL before a re-test.** Works (rule 5). Its pitch uses the latest two diagnoses (`loadRetestDirection`, `src/lib/retest-result.ts:230-251`), so after a retake it says "Up N points" about a retake. Pre-existing, low impact; not in scope.
7. **Helper fails.** Progress and Settings show the error page instead of guessing (§2).

---

## 9. Verification plan

Run after the build, in this order: `npx tsc --noEmit`, `npm run lint`, `npm run build`, then `/verify` on each screen below.

**Production read (before merge, read-only):** count accounts with two or more plans and no `source_plan_id` plan; list them for Q2.

**Test users** (`/test-user`, cleanup run for each, Stripe test customers deleted):

| User | Setup | Check |
|---|---|---|
| free-pre | `/test-user` | Progress: Day One + two locked cards, new teaser, no button, no `/paywall` href in HTML. Settings: "Plan · Free", no link. |
| paid-pre | `/test-user paid` (upgrades through `/paywall` by URL) | Progress: empty states with the date, streak live, no lock icon, no chart series or history rows in HTML/RSC payload. Settings: Manage subscription. |
| free-post | `/test-user`, move the plan's `retest_date` to today with the admin client (allowed on test users), take the real re-test in the UI | Progress: locked + "Unlock Progress". Settings: upgrade link. Re-test result: link present. |
| paid-post | as free-post, then `paid` | Progress: full. Settings: Manage subscription. |

Extra states (one screenshot each at 375): paid-pre with the re-test open ("It's open now.", `RetestOpen` the only accent); free-pre with the re-test open; free retake (second `/start` result on free-pre: still no button); a `/paywall` direct visit by free-pre (still loads).

**Screenshots:** Progress and Settings for each of the four users at 375 and 1440: 16 shots, in `audit/screens/batch-c/` (gitignored). `/verify`'s check script on each: no overflow, nothing under 16px, no dashes, shadows or gradients, one accent at most.

**Leak check:** free-pre and paid-pre Progress HTML and RSC payload contain no readiness series, history rows or session series values (free-pre also no streak).

---

## 10. Open questions

1. **"Unlocks after your first re-test" reads as free.** After the re-test a free player still sees the cards locked, with a button. CLAUDE.md rule 8 (never overclaim). Keep the decided line, or use "Part of the paid plan, offered after your first re-test."? And should free-pre Day One gain the locked cards at all (0.1), or stay as today with nothing locked?
2. **Pre-migration re-tests.** If the production count finds real players whose re-test predates `source_plan_id`, backfill by hand (a reviewed one-off update), or accept that they read as pre-re-test?
3. **Paid pre: replace Day One's one-point line with the Readiness section** (recommended, avoids saying it twice), or keep both?
4. **"Re-test breakdown" on Progress.** There's no breakdown section; history rows open it. One history empty state covers it (recommended), or do you want a separate section?
5. **Lapsed subscriber before their re-test** has no way back in except `/paywall` by URL. Fine for now, or keep the Settings upgrade row for players with a Stripe customer?
6. **Logged sessions series for paid pre.** It's paid, comes from drill logs (not the re-test), and today shows only in the full state. Show it live before the re-test, like weeks with both sessions, or leave it to the full state (this plan's default)?

---

## 12. Production queries: re-tests saved before `source_plan_id` (for the owner, SQL Editor)

**How a pre-migration re-test is recognised.** Since the first version of the re-test action (`eea00a1`, 2026-07-26) a re-test has set the player's older active plans to `status = 'completed'`, and nothing else in the app writes `completed` (claims, retakes and the plan screen never do; `reminders.ts` only reads it). Before `20261029120000` the action set that status and then inserted the new plan, with no `source_plan_id`. So a player whose re-test predates the column has: no plan with `source_plan_id`, a `completed` plan, and a plan created after it. A re-test whose plan insert failed leaves a `completed` plan with nothing after it: that player never finished a re-test and isn't counted.

**Count (read-only, run before merge).** Expect 0. Test accounts can show up (STATUS lists two whose baseline `created_at` was moved by hand); `user_ids` lets you check them.

```sql
-- Players who completed a re-test before plans.source_plan_id existed.
select count(*) as players, coalesce(array_agg(c.user_id), '{}') as user_ids
from (
  select p.user_id
  from public.plans p
  where p.user_id is not null
  group by p.user_id
  having bool_and(p.source_plan_id is null)
     and exists (
       select 1
       from public.plans done
       join public.plans later
         on later.user_id = done.user_id and later.created_at > done.created_at
       where done.user_id = p.user_id and done.status = 'completed'
     )
) c;
```

**Result (owner, production, 2026-11-08): `players = 2`**, `73f35f36…` and `7bede4e3…`. Both are old dev test accounts (the two whose baseline `created_at` was moved by hand, also found by the `20261029120000` pre-check), not real players. **Decision: no backfill.** The preview and the fix below were not run.

**One-time fix (only if `players` is above zero).** Per player, it sets `source_plan_id` on one plan: the first plan created after their newest `completed` plan, pointing at that plan. That is the re-test's real source, since the old action completed every older plan before inserting the new one. One row per player, so the unique index `(user_id, source_plan_id)` can't conflict. It touches no other column.

One case it can get wrong (reviewer): a pre-migration re-test that retired the old plans but whose plan insert failed, followed later by a signed-in retake. The retake's plan is "created after a completed plan", so it would be marked as the re-test. The data can't tell these apart: no column records when a plan was retired, and a retake's rows look like a re-test's. The preview shows the target's `diagnosis_id`, the source plan's `retest_date` and `days_after_source` so each row can be checked by hand (a re-test usually lands near or after its source's re-test date; a retake can come at any time). If a row looks like a retake, don't run step 2: send the row to Claude, and the fix gets an exclusion for that player first. A wrong mark has low impact: that player is treated as having re-tested, so a free player sees the existing upgrade entries.

**1. Preview (read-only).** Note the number of rows: it goes into step 2.

```sql
with candidates as (
  select p.user_id
  from public.plans p
  where p.user_id is not null
  group by p.user_id
  having bool_and(p.source_plan_id is null)
     and exists (
       select 1 from public.plans done
       join public.plans later on later.user_id = done.user_id and later.created_at > done.created_at
       where done.user_id = p.user_id and done.status = 'completed'
     )
),
last_done as (
  select distinct on (p.user_id) p.user_id, p.id as source_id, p.created_at, p.retest_date
  from public.plans p join candidates using (user_id)
  where p.status = 'completed'
  order by p.user_id, p.created_at desc
)
select distinct on (p.user_id)
  p.user_id, p.id as plan_id, p.diagnosis_id, p.created_at, l.source_id,
  l.retest_date as source_retest_date,
  round(extract(epoch from (p.created_at - l.created_at)) / 86400.0, 1) as days_after_source,
  (select count(*) from public.plans where source_plan_id is not null) as plans_with_source
from public.plans p join last_done l using (user_id)
where p.created_at > l.created_at
order by p.user_id, p.created_at asc;
```

**2. Fix.** Set `expected` to the preview's row count before running. The check is inside the SQL: if the update touches any other number of rows, it raises an error and the whole block is rolled back, so nothing changes. One statement, safe to run as a single script in the SQL Editor.

```sql
do $$
declare
  expected int := 0;  -- set to the number of rows the preview returned
  n int;
begin
  with candidates as (
    select p.user_id
    from public.plans p
    where p.user_id is not null
    group by p.user_id
    having bool_and(p.source_plan_id is null)
       and exists (
         select 1 from public.plans done
         join public.plans later on later.user_id = done.user_id and later.created_at > done.created_at
         where done.user_id = p.user_id and done.status = 'completed'
       )
  ),
  last_done as (
    select distinct on (p.user_id) p.user_id, p.id as source_id, p.created_at
    from public.plans p join candidates using (user_id)
    where p.status = 'completed'
    order by p.user_id, p.created_at desc
  ),
  target as (
    select distinct on (p.user_id) p.user_id, p.id as plan_id, l.source_id
    from public.plans p join last_done l using (user_id)
    where p.created_at > l.created_at
    order by p.user_id, p.created_at asc
  )
  update public.plans p
  set source_plan_id = t.source_id
  from target t
  where p.id = t.plan_id and p.source_plan_id is null;

  get diagnostics n = row_count;
  if n <> expected then
    raise exception 'updated % rows, expected %: rolled back, nothing changed', n, expected;
  end if;
  raise notice 'updated % rows', n;
end $$;
```

**3. After (read-only).** Run the count again (expect `players = 0`), and:

```sql
select count(*) as plans_with_source from public.plans where source_plan_id is not null;
```

Expect the preview's `plans_with_source` plus the number of rows fixed.

---

## Files the build would touch

`src/lib/retest-gate.ts`, `src/app/(app)/progress/page.tsx`, `src/components/progress/ProgressView.tsx`, `src/app/settings/page.tsx`, `Design/DESIGN_SYSTEM.md`, `DESIGN.md`, `docs/STATUS.md`. Not touched: `DeltaScreen.tsx`, `/paywall`, the landing, the engine.

Codex review recommended once built: it changes what is offered to free and paid players (paywall entry points) and rebuilds Progress's pre-re-test state.
