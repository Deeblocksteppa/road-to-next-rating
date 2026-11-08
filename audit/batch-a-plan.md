# UX batch A: plan

Read-only investigation, 2026-11-08, on `main` at `f81395e`. No code changed. Stripe probes used the sandbox key (`sk_test_`) and were read-only: three requests on a made-up subscription id, a list of subscriptions, webhook endpoints and recent events.

Two items: (1) cancel and resume on a subscription Stripe has already ended, (2) the legal pages' back link. Item 2 turned out to be already shipped; see §2.

---

## 1. Cancel and resume on a subscription Stripe already ended

### 1.1 The paths today

**Cancel** (Settings → Manage subscription → "Cancel subscription")

| Step | Where | What happens |
|---|---|---|
| Entry | `src/app/settings/page.tsx:48`, `:86-105` | "Manage subscription" shows only when `profiles.subscription_status === "active"`. The Plan row reads "renews/cancels {month}" from `renews_at` and `cancel_at_period_end` on the profile, never from Stripe. |
| Screen | `src/app/settings/manage/page.tsx:20-34` | Reads the same three profile columns. Not `active` → redirect to `/settings` (`:27-29`). `cancel_at_period_end` picks the cancel or the "Keep my subscription" view (`:34`). |
| Button | `src/components/settings/CancelSubscriptionForm.tsx:29-39`, `:64-74` | Calls the server action. Any `{ error }` sets `failed`; the action's text is ignored. `{ ok }` → `router.refresh()`. |
| Action | `src/app/settings/actions.ts:61-112` | User client reads `stripe_subscription_id` (`:70-76`). None → error (`:77-82`). `retrieveOwnedSubscription` (`:84`) → `subscriptions.update(id, { cancel_at_period_end: true })` (`:91-93`) → `syncSubscription` (`:97`). Any throw → `{ error: err.message }` (`:98-106`). |
| Ownership | `src/lib/billing.ts:107-122` | `subscriptions.retrieve`, then `metadata.supabase_user_id === user.id` or null (logged). Stripe errors, `resource_missing` included, throw. |
| Profile write | `src/lib/billing.ts:74-96` | Service role. Status from `statusFromStripe` (`src/lib/stripe.ts:111-124`): `canceled`, `incomplete_expired`, `incomplete`, `paused` → `free`, which also nulls plan, `renews_at`, `cancel_at_period_end` and `stripe_subscription_id`. |

**Resume** ("Keep my subscription"): identical, `src/app/settings/actions.ts:118-162`, with `cancel_at_period_end: false` (`:145-147`). Button at `CancelSubscriptionForm.tsx:49-56`.

**What the player sees on any failure:** `SupportError` (`CancelSubscriptionForm.tsx:80-89`): "Something went wrong. Email support@roadtonextrating.com and we'll sort it out." The action's own strings (`actions.ts:79-80`, `:86-87`, `:135`, `:140-141`) never reach the screen; they only shape the logged result. The alert is `text-center` (`:82`), against the "nothing centered" rule.

### 1.2 What Stripe returns

| Call | Subscription | Result | Source |
|---|---|---|---|
| `retrieve` / `update` / `cancel` | id that doesn't exist in this account | 404, `StripeInvalidRequestError`, `code: "resource_missing"`, `param: "id"`, "No such subscription: 'sub_…'" | Probed today, sandbox, API `2026-06-24.dahlia` |
| `cancel` | already canceled | 404 `resource_missing` | STATUS, billing reconciliation third round (real sandbox run) |
| `retrieve` | already canceled | 200, `status: "canceled"`, metadata kept | Stripe behaviour; `closeOrphanedSubscription` relies on it (`billing.ts:356`) |
| `update { cancel_at_period_end }` | already canceled | Expected: 400 `invalid_request_error`, a canceled subscription accepts only `cancellation_details` and `metadata` updates. **Not confirmed**: the sandbox has no canceled subscription to try it on today. Test T0 records the exact error. | |
| `retrieve` | id from the other mode (live id, test key) | 404 `resource_missing`, message adds "a similar object exists in live mode, but a test mode key was used". | Stripe behaviour; not probed |

So with today's code:

- **Canceled in Stripe, profile still `active`:** `retrieve` succeeds and ownership passes (metadata survives the cancel), then `update` fails → generic support error. The profile stays `active`, so the manage page keeps offering the same button. Every tap fails the same way.
- **Id missing from Stripe** (old Stripe account, deleted test data, wrong-mode key): `retrieve` throws `resource_missing` → same generic error, same loop.

The fix doesn't need the failing `update` at all: `retrieveOwnedSubscription` already returns the subscription, and its status says it has ended.

### 1.3 Why the profile can still say "cancellable"

Profile billing columns change only through `syncSubscription` and `clearSubscription` (`billing.ts:74`, `:419`), called by checkout success, Settings and the webhook. For an ended subscription, only the webhook can fix the row. It can stay stale in five ways:

1. **`customer.subscription.deleted` never processed.** The handler (`src/app/api/stripe/webhook/route.ts:169-181`) finds the profile by metadata, then subscription id, then customer, and calls `clearSubscription`. A handler error returns 500 (`:82-88`) and Stripe retries for up to three days, then gives up. A bad signature returns 400 (`:54-58`), also retried, then dropped. Nothing else re-reads Stripe later: the billing-reconcile cron only looks for subscriptions whose account is gone.
2. **No profile matched** (`:175-178`): logged, answered 200, never retried. Rare: needs the metadata, the subscription id and the customer id all to miss.
3. **Out of order, the likeliest live cause.** Stripe doesn't promise order. `onSubscriptionUpdated` (`:152-166`) writes the event's own snapshot (`event.data.object`), not a fresh read. A `customer.subscription.updated` delivered after the `deleted` (a retry after a 500, or a slow delivery) puts the profile back to `active` with the old `renews_at` and `cancel_at_period_end`. The comment at `:83-85` says handlers write "absolute state read from Stripe", which holds for checkout (`:136`) but not here. This is the case where "Keep my subscription" shows on a dead subscription.
4. **An old subscription's events overwrite the current one.** Neither handler checks that the event's subscription is the one on the profile. Deleting an older subscription (two tabs, two checkouts: the case `findBilling`'s comment at `billing.ts:157-162` mentions) runs `clearSubscription` and drops a player who has a newer live one.
5. **Where sandbox events go.** The sandbox's only webhook endpoint is `https://roadtonextrating.com/api/stripe/webhook`, subscribed to all five handled events. Local testing has no local endpoint: a cancel in the Stripe dashboard reaches the local profile only if the production deployment accepts the sandbox signature and writes to the same Supabase project as `.env.local`. The two most recent `updated` and `completed` events (2026-11-05) show `pending_webhooks: 0`, which suggests production accepted them then. No `deleted` event is left in the last 30 days to check. If production's secret changes to live, every local dashboard cancel becomes a missed webhook.

A stale `active` profile also does harm outside Settings: Progress stays unlocked, and `/paywall` redirects active players away (`src/app/paywall/page.tsx:35`, `src/app/paywall/actions.ts:48`), so a player whose subscription really ended can't buy a new one until the row is fixed.

### 1.4 Proposed fix

**A. One refresh helper** in `src/lib/billing.ts`, server only, service role for the write:

```
refreshOwnedSubscription(userId, subscriptionId) →
  | { kind: "live", sub }       // owned, not ended; profile synced
  | { kind: "ended", sub }      // owned, canceled or incomplete_expired; profile synced to free
  | { kind: "missing" }         // resource_missing; see C
  | { kind: "not_owned" }       // metadata mismatch; nothing written (today's refusal)
```

It wraps `retrieveOwnedSubscription` (ownership unchanged: `metadata.supabase_user_id === user.id`), uses the existing `hasEnded` (`billing.ts:142`), and syncs only when ownership passes.

**B. Cancel** (`actions.ts:61`):
- `ended` → nothing sent to Stripe; return `{ ok: true, outcome: "already_ended" }`.
- `live` with `cancel_at_period_end` already true (set in the dashboard, webhook missed) → synced; return `{ ok: true }`. No `update`.
- `live` → `update(cancel_at_period_end: true)` as today. If it throws, retrieve once more: ended now (a dashboard cancel in between) → sync, `already_ended`; still live → error as today.
- `not_owned` → today's refusal, unchanged.

**Resume** (`actions.ts:118`), same shape:
- `ended` → `{ ok: false, outcome: "ended" }` with the copy below. A canceled subscription can't be reactivated in Stripe; the only way back is a new checkout.
- `live` with `cancel_at_period_end` already false (resumed elsewhere) → synced, `{ ok: true }`.
- `live` → `update(false)`, with the same re-read on failure.

**C. `resource_missing`:** the subscription isn't in this Stripe account, so it can't charge anyone through it. Then:
1. If the message says the object exists in the other mode, it's a key mix-up, not a missing subscription: change nothing, log "STRIPE MODE MISMATCH", show the generic error.
2. Otherwise search for the player's own live subscriptions the way `findBilling` does (metadata search, then the profile's customer). One found → sync the profile to it and return `resynced` (the page re-renders with the real one; the player taps again if they still want to cancel). None → `clearSubscription(user.id)` (keeps `stripe_customer_id`), log "SUBSCRIPTION MISSING", return `already_ended`.

Ownership of the missing object can't be checked, but the write touches only the caller's own row, and only the service role can set `stripe_subscription_id` since `20261029180000`.

**D. Showing it.** After `already_ended` the profile is `free`, so `/settings/manage` would redirect to `/settings`. The form calls `router.replace("/settings?billing=ended")` instead of `refresh()`, and Settings shows one neutral line under Subscription (ink-2, no accent, no danger) above the normal free state ("Upgrade to unlock Progress"). Proposed copy:

- Cancel, already ended: **"Your subscription had already ended. Nothing more will be charged."**
- Resume, already ended (shown on the manage screen in place of the button, with a link to Settings): **"Your subscription ended on {date}, so it can't be resumed. You can start a new one from Settings."** `{date}` from `sub.ended_at`; without one: "Your subscription has ended, so it can't be resumed. You can start a new one from Settings."
- `resynced`: no new copy; the page shows the live subscription's real state.

Left-align `SupportError` (`CancelSubscriptionForm.tsx:82`) while in the file.

**E. Heal before the tap** (recommended; see Q3): `/settings/manage` runs `refreshOwnedSubscription` on load, and `/settings` does too, but only when `renews_at` is in the past (one Stripe read, only for rows that are probably stale). An ended subscription then never shows a Cancel or Keep button.

**F. Webhook root causes** (recommended in the same branch; Q5):
- `onSubscriptionUpdated` (`route.ts:152`): retrieve the subscription from Stripe and sync that, not `event.data.object`. Fixes out-of-order deliveries (§1.3, cause 3).
- `onSubscriptionUpdated` and `onSubscriptionDeleted` (`:169`): when the profile already names a different, live subscription, leave the profile alone and log. Fixes §1.3, cause 4.

Files: `src/lib/billing.ts`, `src/app/settings/actions.ts`, `src/components/settings/CancelSubscriptionForm.tsx`, `src/app/settings/page.tsx`, `src/app/settings/manage/page.tsx`, `src/app/api/stripe/webhook/route.ts`, `Design/DESIGN_SYSTEM.md` (Settings notice), `docs/STATUS.md`. No migration, no engine change, nothing free or paid moves.

---

## 2. Legal pages back link: already done

`/terms`, `/privacy` and `/refunds` have had a back link since `24068d7` (2026-11-05), in `src/components/legal/LegalPage.tsx:23-45`: signed in, "Back to Settings" (`/settings`); signed out or no user, "Back to home" (`/`). 15px, `ink-2`, underlined, 44px tall. STATUS, "Legal pages back link".

The proposal in this request (previous page from history, else `/home` or `/`) is the version that was built first and removed. Codex found that a round trip `/terms → /privacy → /terms` sent the player Home, and history can't tell an in-app previous page from an outside one or from the other legal page. `BackLink.tsx` and the history logic were deleted on purpose.

**New tabs.** `FlowLink` (`src/components/legal/FlowLink.tsx:15-18`) opens Terms, Privacy and Refunds in a new tab from the save form's consent line (`ConsentLine.tsx:8-9`) and the paywall (`PaywallView.tsx:163-164`), so the form and the checkout choice survive. That tab has no history. The fixed link still works there: it goes to Settings or the landing inside the new tab, and the original tab stays where it was. A script can't close a tab it didn't open, so "Close this tab" isn't an option. Settings (`settings/page.tsx:174-185`) and the footers open in the same tab.

**Recommendation:** no change. Only open point: signed in, Settings or Home (Q7).

---

## 3. Test plan (Stripe test mode only)

**Before starting:** `.env.local` has `STRIPE_SECRET_KEY=sk_test_…` (checked today). Every user from `/test-user`, upgraded with card 4242. Profile states that a webhook would normally fix are set with a scratch script in the scratchpad using the service role, never committed.

**Note on webhooks:** sandbox events go to production (§1.3, cause 5), not to `localhost`. To exercise the local webhook code, run `stripe listen --forward-to localhost:3000/api/stripe/webhook` and start the dev server with the CLI's `whsec_` as `STRIPE_WEBHOOK_SECRET` (production still receives its own copy). For the missed-webhook cases, don't rely on delivery failing: write the stale profile by hand after the cancel.

Record for each case: what the screen shows, the profile's six billing columns before and after, and the Stripe calls made (dashboard → Developers → Logs).

| # | Setup | Action | Expected |
|---|---|---|---|
| T0 | Paid test user; dashboard: cancel immediately | Scratch script: `update(cancel_at_period_end: true)`, `update(false)`, `cancel()` | Record exact errors (expect 400 for both updates, 404 `resource_missing` for `cancel`). Confirms §1.2 before the code relies on it. |
| T1 | Paid; dashboard: cancel immediately; webhook delivered (production, or `stripe listen`) | Open Settings | Profile `free`, sub id null, customer kept. Settings shows Upgrade, `/settings/manage` redirects. Today's behaviour; regression check. |
| T2 | Paid; dashboard: cancel immediately; then script restores `active`, `cancel_at_period_end=false`, the old `renews_at` and sub id (webhook missed) | `/settings/manage` → Cancel subscription | Before fix: generic error, profile unchanged. After: no `update` call in the Stripe log, `/settings?billing=ended` with "Your subscription had already ended…", profile `free`. With E: the manage page redirects before any tap. |
| T3 | As T2 but `cancel_at_period_end=true` (stale "Cancellation scheduled") | Keep my subscription | Before: generic error. After: "…so it can't be resumed…" with the ended date; profile `free`; `/paywall` now opens (no longer redirects). |
| T4 | Paid; dashboard: cancel at period end (still active); script sets `cancel_at_period_end=false` | Cancel subscription | No `update` call; profile `cancel_at_period_end=true`; "Cancellation scheduled". Reverse: dashboard resume, profile left `true` → Keep my subscription → synced, no `update`. |
| T5 | Paid; script sets `stripe_subscription_id='sub_doesnotexist000000'` | Cancel subscription | Owned live subscription found by search → profile re-points to it, page shows its real state, nothing cancelled. Variant: real subscription cancelled first → profile `free`, "SUBSCRIPTION MISSING" logged. |
| T6 | Canceled subscription; dashboard: set its metadata `supabase_user_id` to another uuid; profile stale as T2 | Cancel, then Keep | Refusal, profile unchanged, mismatch logged. Ownership still enforced on ended subscriptions. |
| T7 | Stub only | Missing-error message containing "similar object exists in live mode" | Nothing written, "STRIPE MODE MISMATCH" logged, generic error. |
| T8 | `stripe listen` running; paid user | Dashboard: cancel at period end, then cancel immediately; then `stripe events resend <the updated event id>` | Profile stays `free` (F: updated re-reads Stripe). Before the fix: back to `active` and "Cancellation scheduled". |
| T9 | Two subscriptions for one user (two checkout tabs) with `stripe listen` | Cancel the older one immediately in the dashboard | Profile keeps the newer one (F). Before: dropped to free. |
| T10 | Manage page open on a paid user | Dashboard: cancel immediately, then tap Cancel without reloading | Same as T2 after the fix (the re-read on failure, or the first retrieve, sees it ended). |

Also: a stub script in the style of the earlier billing rounds (every `refreshOwnedSubscription` branch and each action outcome, with a count that fails against the old code); `npx tsc --noEmit`, `npm run lint`, `npm run build`; `/verify` at 375 and 1440 on `/settings?billing=ended` and the resume-ended manage screen. Cleanup: `/test-user` cleanup for every user (subscriptions cancelled, users and data deleted, confirmed), stop `stripe listen`, restore `STRIPE_WEBHOOK_SECRET`.

---

## 4. Open questions (each with a recommendation)

1. **Where does the "already ended" line show?** Recommend: Settings, under Subscription, one neutral line from `?billing=ended`, with the normal free state under it. Keeps the manage page's rule (paid only) intact.
2. **Copy** (§1.4 D): "Your subscription had already ended. Nothing more will be charged." and "Your subscription ended on {date}, so it can't be resumed. You can start a new one from Settings." Recommend: approve as written. "Nothing more will be charged" is true because C only clears when no live owned subscription exists.
3. **Heal on page load (E)?** Recommend: yes on `/settings/manage`; on `/settings` only when `renews_at` is past. Without it, the player meets a wrong button first and the fix only kicks in on the tap.
4. **`resource_missing` → drop to free automatically?** Recommend: yes, after the search finds no live owned subscription, with the mode-mismatch guard and a log line. The alternative (support email) leaves the player stuck and unable to resubscribe.
5. **Webhook fixes (F) in this batch?** Recommend: yes. They cause the stale state; A to E only clean up after it. Both are small and live in one file.
6. **Daily sweep for stale `active` rows** (profiles with `renews_at` well past, re-read and synced)? Recommend: post-launch backlog, using the reconcile cron's dry-run flag pattern. E covers the screens a player uses to cancel or pay, but not Progress staying unlocked for someone who never opens Settings.
7. **Legal back link signed in: Settings or Home?** Recommend: keep Settings. That's where the app's legal links are, and Settings has its own back to Home. Don't bring back history.
8. **Sandbox webhook endpoint points at production.** Is that intended until launch? Recommend: keep it until launch, then make sure the live endpoint and production's secret are the live ones, and test locally with `stripe listen`. Otherwise local tests depend on what production is running.

---

## What this means

The app keeps its own copy of each player's subscription so it doesn't have to ask Stripe on every screen. Stripe updates that copy by sending messages (webhooks), and if one goes missing or arrives out of order, the copy says "active" after Stripe has ended it. The Cancel button then asks Stripe to cancel something already cancelled, Stripe says no, and the player sees an error. The fix: when that happens, ask Stripe for the real state and update the copy, and make the webhook re-check with Stripe instead of trusting the order messages arrive in.

Codex review recommended: the branch for this batch (billing: cancel, resume, webhook).
