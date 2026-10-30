# Legal inventory: what the app does with user data

Audited 2026-10-30 at commit `b1c7d70` (`main`). Read-only: no app code changed.

**What this covers.** Source code, migrations and config in this repo. I did not query the production database or open any dashboard, so "not found" means not in the repo.

**Check these outside the repo before relying on this file:**

| What | Where to check | Why the repo can't answer |
|---|---|---|
| Supabase and Vercel regions | Both dashboards | Section 10 |
| Managed Payments status | Stripe dashboard, or `managed_payments.enabled` on a real Checkout Session | Section 6 |
| Auth email sender (SMTP) and templates | Supabase Auth settings | Section 5 |
| Session lifetime | Supabase Auth settings | Section 3 |
| Stripe receipts, Checkout terms URL, refund settings | Stripe dashboard | Sections 1, 5, 6 |
| Scheduled jobs that delete rows | Supabase dashboard | Section 8 |
| Log and backup retention | Vercel, Resend and Supabase accounts | Section 7 |
| Live schema matches migrations | Production database | `docs/STATUS.md:33` (an uncommitted edit) says the `profiles` half of `20261029180000` is live and the rest is still to confirm |

---

## 1. Existing legal pages

### Routes

| Route | File | State |
|---|---|---|
| `/terms` | `src/app/terms/page.tsx` | Placeholder summary, labelled "Summary: full terms pending" (`:27`) |
| `/privacy` | `src/app/privacy/page.tsx` | Placeholder summary, labelled "Summary: full policy pending" (`:29`) |
| `/refund` | Not found | No route. No refund policy page exists |

Both pages are public: neither is in `PROTECTED_PREFIXES` (`src/lib/supabase/middleware.ts:9-17`). Neither shows an effective or last-updated date.

### Current text, summarized

**`/terms`**
- Says it is not the final terms and will be replaced before launch (`:32-33`).
- A coaching tool scoring your own answers against a fixed model of four skills. Not a rating body; nothing is verified against or reported to a rating system (`:36-40`).
- Readiness is a reading from your own answers; a plan does not guarantee your rating will move (`:43-45`).
- Lists what is free. Subscription is $79 per year or $7.99 per month. "Cancel any time; cancelling stops future billing and leaves the free product intact" (`:48-54`).
- Injury: unsupervised physical training, use your own judgement (`:57-59`).
- Says nothing about refunds, age, governing law, liability or termination: not found.

**`/privacy`**
- Says it is not the final policy and will be replaced before launch (`:34-36`).
- Stored: assessment answers, diagnosis, plan, drill sessions, re-tests, and email if you create an account (`:39-41`).
- Before sign-up: answers are "saved unclaimed" so they can be attached later (`:44-47`).
- Processors: Supabase, Stripe, Resend. Card details go to Stripe only (`:50-52`).
- "Your data is not sold, and it is not used to train anything" (`:55-57`).
- Says nothing about cookies, retention, deletion, user rights, Vercel or regions: not found.

### Everywhere they are linked

| Place | Linked? | Evidence |
|---|---|---|
| Landing page footer | **Yes, the only links** | `src/components/marketing/sections.tsx:569-570`, rendered only at `src/app/page.tsx:72` |
| Save form (SaveGate) | Not found | `src/components/auth/SaveGate.tsx:228-376` |
| `/signup` | Not found | `src/app/signup/page.tsx:19-95` |
| `/login` | Not found | Repo-wide search for `/terms` and `/privacy` hits only the footer |
| `/settings` | Not found | `src/app/settings/page.tsx:50-189` (only a support mailto, `:158-164`) |
| Paywall | Not found | `src/components/paywall/PaywallView.tsx:146-148` says only "Secure checkout by Stripe · Cancel anytime" |
| Emails | Not found | `src/lib/email.ts:36-46` |
| Stripe `consent_collection` | Not set | `src/app/paywall/actions.ts:72-90` |
| Stripe `custom_text` (custom terms) | Not set, deliberately | `src/app/paywall/actions.ts:84-86`: the comment says Managed Payments rejects it |

Two consequences:
- **Signed-in players have no link to either page.** Middleware redirects them from `/` to `/home` (`src/lib/supabase/middleware.ts:71-75`), so they can't reach the footer.
- **No acceptance is captured or stored.** Neither sign-up form has a checkbox or agreement line, and no column records acceptance or a terms version (migrations in section 2).

Other refund and cancel wording currently shown to players:

| Copy | Evidence |
|---|---|
| "The time left on the current period is not refunded" (delete flow) | `src/app/settings/delete/page.tsx:74-75` |
| Keep Progress until the paid period ends, nothing charged again | `src/app/settings/manage/page.tsx:47-49`, `src/app/settings/page.tsx:125` |
| "Cancel anytime. Cancelling stops billing and keeps the free tier" | `src/components/marketing/sections.tsx:500` |

---

## 2. Personal data stored

All tables are in `public`. Five exist in the migrations; `src/app/settings/actions.ts:175` says the same. Supabase Storage, Realtime and Edge Functions: not found in `src`.

### Which rows can exist for anonymous (unclaimed) users

| Table | Anonymous rows? | Evidence |
|---|---|---|
| `assessments` | **Yes** (`user_id` null) | Nullable `init_schema:33`; anon insert policy `:110-113`; written by `src/lib/persistence.ts:76-81` |
| `diagnoses` | **Yes** (`user_id` null) | `init_schema:42`, `:134-137`; `src/lib/persistence.ts:97-109` |
| `plans` | **Yes** (`user_id` null) | `init_schema:55`, `:156-159`; `src/lib/persistence.ts:120-129` |
| `drill_sessions` | No | `user_id` NOT NULL `init_schema:69`; authenticated only `:178-181` |
| `profiles` | No | `id` references `auth.users` `init_schema:20` |

`init_schema` = `supabase/migrations/20260717185014_init_schema.sql`.

Anonymous rows are written from the browser when the assessment ends (`src/app/start/page.tsx:115`), before the player is offered an account. They have no email, IP, user-agent or device-id column. The only identifying content possible is whatever the player types into the two free-text answers below.

### `profiles` (one per auth user)

| Column | Holds | Source |
|---|---|---|
| `id` | Auth user id | `init_schema:20` |
| `email` | Email, kept in sync with auth | `init_schema:21`; `20260724193000_sync_profile_email_on_auth_change.sql:29-33` |
| `display_name` | **No writer found.** Settings only displays it (`src/app/settings/page.tsx:72-73`) and players have no update grant on it | `init_schema:22`; `20261029180000_profiles_column_grants.sql:71-73` |
| `subscription_status` | `free` or `active` (the schema comment also lists `canceled`) | `init_schema:23`; `src/lib/stripe.ts:97-109` |
| `stripe_customer_id` | `cus_…`, kept after cancelling | `init_schema:24`; `src/lib/billing.ts:135-136` |
| `stripe_subscription_id` | `sub_…` | `20260724120000_stripe_billing_fields.sql:13` |
| `plan_type` | `annual` or `monthly` | `20260719120000_subscription_plan_fields.sql:10` |
| `renews_at` | Current period end | `20260719120000_subscription_plan_fields.sql:11` |
| `cancel_at_period_end` | Pending cancellation flag | `20260724120000_stripe_billing_fields.sql:14` |
| `retest_reminder_enabled` | Preference, default on | `init_schema:25` |
| `drill_reminder_enabled` | Preference, default on | `20260723120000_drill_reminder_enabled.sql:8-9` |
| `created_at` | Timestamp | `init_schema:26` |

A `profiles` row is created by trigger as soon as `auth.users` gets a row, which means **before the email is confirmed** (`init_schema:203-218`).

### `assessments`

| Column | Holds | Source |
|---|---|---|
| `id`, `user_id`, `created_at` | Row id, owner (or null), timestamp | `init_schema:32-33`, `:36` |
| `answers` (jsonb) | All answers, including **two free-text fields**: `rating` (`src/lib/questions.ts:5-9`) and `play_frequency` (`src/lib/questions.ts:14-16`). The rest are multiple-choice playing-habit and skill answers | `init_schema:34` |
| `band` | Copy of the free-text `rating` answer | `init_schema:35`; `src/lib/persistence.ts:80` |

### `diagnoses`

| Column | Holds | Source |
|---|---|---|
| `id`, `assessment_id`, `user_id`, `created_at` | Links and timestamp | `init_schema:40-42`, `:49` |
| `bottleneck`, `runners_up`, `root_cause`, `story_id` | Engine output | `init_schema:43-46` |
| `readiness`, `skill_scores` | Score and per-skill scores | `init_schema:47-48` |

### `plans`

| Column | Holds | Source |
|---|---|---|
| `id`, `diagnosis_id`, `user_id`, `created_at` | Links and timestamp | `init_schema:53-55`, `:61` |
| `drill_ids`, `in_game_rule`, `retest_metric` | Generated plan content | `init_schema:56-58` |
| `retest_date`, `status` | Re-test date, plan state | `init_schema:59-60` |
| `source_plan_id` | Plan the re-test was taken against | `20261029120000_retest_source_plan.sql:60-61` |

### `drill_sessions`

| Column | Holds | Source |
|---|---|---|
| `id`, `plan_id`, `user_id`, `drill_id` | Links | `init_schema:67-70` |
| `completed_at` | When it was logged | `init_schema:71` |
| `result_value` | Score, 0 to 10 | `20260720120000_drill_session_result_value.sql:13-14`; `src/app/(app)/plan/actions.ts:48` |
| `notes` | **No writer found** | `init_schema:72` |

### `auth.users` (managed by Supabase, not in the migrations)

The app sends these to it:
- Email and password (`src/components/auth/SaveGate.tsx:90-92`, `src/app/auth/actions.ts:49-51`). Password handling is Supabase's; the app never stores it in a table.
- User metadata: `pending_assessment_id`, `pending_diagnosis_id`, `pending_plan_id` (`src/components/auth/SaveGate.tsx:95-99`). These are set to null after a successful claim (`src/lib/claim-signup.ts:54-60`).

**Until that claim runs, the metadata links an email address to the "anonymous" rows.** That includes sign-ups that are never confirmed. Other columns Supabase keeps there are not visible from this repo.

---

## 3. Browser storage

### localStorage

No key has an expiry. All are written by this app under the `rtnr:` prefix.

| Key | Holds | Purpose | Cleared when |
|---|---|---|---|
| `rtnr:result` | All assessment answers plus timestamp (`src/lib/local-result.ts:18`, `:28-29`) | Rebuild the anonymous result on return | Rows claimed (`src/lib/persistence.ts:219`) or Start over (`src/app/start/page.tsx:151`) |
| `rtnr:assessment_id` | Row uuid (`src/lib/persistence.ts:26`) | Claim at sign-up | Claim, Start over, or a new assessment (`src/lib/persistence.ts:193-195`; `src/app/start/page.tsx:109`, `:152`) |
| `rtnr:diagnosis_id` | Row uuid (`src/lib/persistence.ts:27`) | Same | Same |
| `rtnr:plan_id` | Row uuid (`src/lib/persistence.ts:28`) | Same | Same |
| `rtnr:signup_pending` | **Email address in plain text** plus timestamp (`src/lib/signup-pending.ts:13`, `:23-24`) | Show "check your inbox" after sign-up | Visit to `/home` (`src/components/auth/ClaimOnLoad.tsx:39`), Start over, or "Use a different email" (`src/components/auth/SaveGate.tsx:208`) |

Sign-out (`src/app/auth/actions.ts:192-197`) and account deletion don't clear any of these. Deletion is a server action, so it can't reach the browser's storage.

### sessionStorage

Not found.

### Cookies

The app sets none directly. All come from the Supabase client, wired up in `src/lib/supabase/client.ts:14-17`, `src/lib/supabase/server.ts:17-36` and `src/lib/supabase/middleware.ts:27-46`, with no custom cookie options.

| Cookie | Purpose | Attributes |
|---|---|---|
| `sb-<project-ref>-auth-token`, split into `.0`, `.1` and so on above 3180 characters | Signed-in session. Refreshed by middleware on every request except static assets (`src/middleware.ts:16`, `src/lib/supabase/middleware.ts:50-52`) | Library defaults: `path=/`, `SameSite=Lax`, `HttpOnly=false`, `Max-Age` 400 days |
| `sb-<project-ref>-auth-token-code-verifier` | PKCE verifier for the sign-in, sign-up and reset flows | Same defaults. Removed when the flow completes (`@supabase/auth-js` `GoTrueClient.js:760`, `:772`) |

Name and defaults come from library source, not a live browser: `node_modules/@supabase/ssr/dist/main/utils/constants.js:4-11`, `chunker.js:8`, `createBrowserClient.js:40`, and `@supabase/supabase-js` `dist/index.mjs`.

- The 400 days is the cookie's lifetime. How long a session stays valid is a Supabase Auth setting: not found in the repo.
- `HttpOnly=false` means page JavaScript can read the session cookie.
- Cookie banner or consent UI: not found.
- Analytics, advertising or other third-party cookies set by app code: not found.

---

## 4. Third parties

| Service | Called from | Data it receives | Evidence |
|---|---|---|---|
| **Supabase** (database, auth) | **Browser directly**, server, and service-role server | All data in section 2. Anonymous visitors' browsers call it when the assessment ends | `src/lib/supabase/client.ts`, `server.ts`, `admin.ts`; `src/lib/persistence.ts:66` |
| **Stripe** | Server, plus a browser redirect to hosted Checkout; inbound webhook | Section 6 | `src/lib/stripe.ts:26-30`; `src/components/paywall/PaywallView.tsx:72`; `src/app/api/stripe/webhook/route.ts` |
| **Resend** | Server only | Recipient email, plus session count and drill names in the body | `src/lib/email.ts:13-20`, `:40-46` |
| **Vercel** | Hosting and cron | All requests pass through it. Runtime logs include user ids and Stripe object ids | `.vercel/project.json`; `vercel.json:2-7`; `src/lib/reminders.ts:162`; `src/lib/billing.ts:113-117`; `src/app/api/stripe/webhook/route.ts:108`, `:128`, `:143` |
| **Google OAuth** | Coded, but **off by flag** | Would apply only if enabled | `src/lib/auth-flags.ts:23`. Flag absent from `.env.local`; the comment at `:6-8` says the provider is off in Supabase. Production env not visible |

Also:
- **Stripe.js:** not found. `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is in `.env.local` but nothing in `src` reads it, and no Stripe browser package is in `package.json:11-25`.
- **Email hosting for `support@` and `hello@`:** not found (`src/lib/contact.ts:2`, `src/lib/email.ts:10`). Whoever hosts the support inbox will also receive player messages.

### Analytics, tracking, scripts and fonts

| Item | Result | Evidence |
|---|---|---|
| Vercel Analytics, Speed Insights | Not found | `package.json:11-34`; repo search of `src` |
| Error tracking (Sentry and similar) | Not found | Same |
| Product analytics, ads, tag managers (PostHog, GA, GTM, Segment, Mixpanel, Hotjar, Plausible) | Not found | Same |
| Third-party scripts (`next/script`, `<script>`) | Not found | Repo search of `src` |
| `<iframe>`, `<img>`, `<video>`, `<audio>`, `sendBeacon`, `XMLHttpRequest`, `WebSocket` in app code | Not found | Repo search of `src` |
| Remote image or rewrite config | None; config is empty | `next.config.mjs:2` |
| Direct `fetch` to an outside URL | Not found. The only `fetch` wraps the Supabase admin client | `src/lib/supabase/admin.ts:29` |
| **Fonts** | **`next/font/google`, not remote CSS.** Archivo, Instrument Sans and IBM Plex Mono | `src/app/layout.tsx:2`, `:6-26` |
| Remote font CSS (`fonts.googleapis.com`, `@import`) | Not found | `src`; also no `fonts.googleapis` or `fonts.gstatic` string in the local `.next` output, which holds self-hosted `.woff2` files in `.next/static/media` |

The local `.next` folder is a dev build with no `BUILD_ID`, so the font check is not proof from a production build. Loading the live site with the browser's network panel open would confirm it.

---

## 5. Emails

### Sent through Resend from app code: one email only

`sendDrillReminder` is the only caller of `emails.send` (`src/lib/email.ts:27`, `:40`).

| | |
|---|---|
| **Sender** | `Road to Next Rating <hello@roadtonextrating.com>` (`src/lib/email.ts:10`) |
| **Subject** | "One session left this week" or "N sessions left this week" (`src/lib/email.ts:36-37`) |
| **Trigger** | Vercel Cron, daily at 18:00 UTC, `GET /api/cron/drill-reminders` (`vercel.json:2-7`, `src/app/api/cron/drill-reminders/route.ts:17-28`) |
| **Who gets it** | `drill_reminder_enabled` on, has an email, latest plan not completed or abandoned and has drills, nothing logged today, fewer than the weekly sessions done (`src/lib/reminders.ts:25-29`, `:50-54`, `:117`, `:131`, `:141-142`) |
| **Paid only?** | No, there is no subscription filter (`src/lib/reminders.ts:50-54`) |
| **Default** | **On, without asking** (`20260723120000_drill_reminder_enabled.sql:8-9`) |
| **Opt out** | Settings toggle, sign-in required (`src/app/settings/page.tsx:145-149`, `src/app/settings/actions.ts:30-45`) |
| **Unsubscribe link or `List-Unsubscribe` header** | **Not found** (`src/lib/email.ts:40-46`) |
| **Postal address in the email** | Not found (`src/lib/email.ts:38`, `:45`) |
| **Stops when** | Only when the plan's status changes, and **only a re-test does that** (`src/lib/retest-save.ts:129-135`). No writer sets `abandoned`. A player who stops using the app keeps getting up to one email a day |

Unconfirmed sign-ups are not emailed in practice. Their profile qualifies, but they have no claimed plan, so they are skipped (`src/lib/reminders.ts:117`).

### Re-test reminder: not found

The Settings toggle "Email me when my re-test opens" (`src/app/settings/page.tsx:137-142`) only saves `retest_reminder_enabled` (`src/app/settings/actions.ts:20-23`). A repo-wide search finds that column read only by Settings. **No code sends this email.**

### Auth emails: triggered by Supabase, not by app Resend code

| Email | Trigger | Evidence |
|---|---|---|
| Sign-up confirmation | Sign-up from the save form or `/signup` | `src/components/auth/SaveGate.tsx:90`; `src/app/auth/actions.ts:49` |
| Resent confirmation | "Resend email", or the dead-link page | `src/components/auth/ResendConfirmation.tsx:40-44`; `src/app/auth/actions.ts:145-149` |
| Password reset | `/forgot-password` | `src/app/auth/actions.ts:117-119` |
| Email change, magic link, invite | Accepted at `/auth/confirm`, but **no code path requests them** | `src/app/auth/confirm/route.ts:14-21` |

Templates live in Supabase (`src/app/auth/confirm/route.ts:26-27`). Whether Supabase's SMTP is set to Resend: not found in the repo. There is no opt-out for these, and they are only sent on request.

### Other emails

- Stripe receipts or renewal notices: not found in code; these are controlled by Stripe account settings.
- Welcome, payment-confirmation or cancellation emails from the app: not found.

---

## 6. Stripe

### Managed Payments

**Not enabled by the checkout code; I can't confirm it from the repo.**
- The session does not pass `managed_payments` (`src/app/paywall/actions.ts:72-90`).
- The installed SDK does offer it as a per-session option (`node_modules/stripe/esm/resources/Checkout/Sessions.d.ts:2226`, `:2560-2565`).
- The only evidence it's on is a comment: "this account has Stripe Managed Payments on" (`src/app/paywall/actions.ts:84-86`).
- A completed session reports it in `managed_payments.enabled` (`Sessions.d.ts:194`, `:531-536`).

This decides who the seller of record is, which your Terms and Refund pages have to name.

### Data sent to Stripe

| When | Data | Evidence |
|---|---|---|
| First checkout, `customers.create` | **Email**; metadata `supabase_user_id` | `src/app/paywall/actions.ts:58-61` |
| `checkout.sessions.create` | Customer id, price id, quantity 1, `client_reference_id` (user id), metadata `supabase_user_id` and `plan`, the same metadata on the subscription, return URLs, `allow_promotion_codes: true` | `src/app/paywall/actions.ts:72-90` |
| Hosted Checkout page | Card and billing details go directly to Stripe. No related params are set in code | `src/components/paywall/PaywallView.tsx:72` |

Not sent: answers, diagnoses, plans, sessions.

Stored back in `profiles` from Stripe: status, plan, period end, cancel flag, subscription id, customer id (`src/lib/billing.ts:82-92`). The webhook handles `checkout.session.completed` and `customer.subscription.updated` and `.deleted` (`src/app/api/stripe/webhook/route.ts:14-18`).

### Cancel behavior

| Action | What happens | Evidence |
|---|---|---|
| **Cancel** in Settings | `cancel_at_period_end: true`. Access continues to period end, then the webhook drops to free | `src/app/settings/actions.ts:91-93`; `src/lib/billing.ts:124-138` |
| **Resume** | Sets the flag back to false | `src/app/settings/actions.ts:145-147` |
| **Delete account** | **Cancels immediately** with `subscriptions.cancel`, no `prorate` or `invoice_now` | `src/app/settings/actions.ts:224-227` |
| Failed payment | `past_due` and `unpaid` stay `active` until Stripe gives up | `src/lib/stripe.ts:91-105` |

### Refund code

**Not found.** There is no `refunds` call anywhere in `src`. The only mention is the "not refunded" line in the delete flow (`src/app/settings/delete/page.tsx:75`). There is also no way to process a refund in the app, so any refund has to happen in Stripe by hand.

Also not found: a Billing Portal, or an in-app way to change card or plan. A code comment confirms neither exists (`src/app/settings/page.tsx:117-120`).

---

## 7. Account deletion

Flow: `/settings/delete`, type `DELETE`, then `deleteAccount` (`src/app/settings/actions.ts:188-258`).

1. Re-check the typed word (`:196-198`).
2. Read `stripe_subscription_id` (`:203-207`).
3. If there is one, confirm Stripe's metadata says it belongs to this user. **If not, refuse and delete nothing** (`:211-223`).
4. Cancel it immediately unless it is already cancelled (`:224-227`). "Already gone in Stripe" is tolerated; any other Stripe error stops the deletion (`:230-231`).
5. Delete the auth user with the service role (`:235`).
6. Sign out, then redirect to `/login?notice=deleted` (`:250-257`).

### Removed

| Item | How | Evidence |
|---|---|---|
| `auth.users` row | Admin delete | `src/app/settings/actions.ts:235` |
| `profiles` | Cascade from `auth.users` | `init_schema:20` |
| `assessments`, `diagnoses`, `plans`, `drill_sessions` with this `user_id` | Cascade from `profiles` | `init_schema:33`, `:42`, `:55`, `:69` |
| Rows chained below those | Cascade via parent links | `init_schema:41`, `:54`, `:68` |
| The Stripe subscription named on the profile | Cancelled now, no refund | `src/app/settings/actions.ts:225`; `src/app/settings/delete/page.tsx:74-75` |
| Auth cookie | Cleared by sign-out, best effort | `src/app/settings/actions.ts:250-254` |

The cascades were read from the migrations; I did not run a deletion for this audit.

### Left behind

| Item | Detail | Evidence |
|---|---|---|
| **Stripe Customer** | Email and `metadata.supabase_user_id` remain. No `customers.del` call anywhere. Deliberate, per the comment | `src/app/settings/actions.ts:179-180`; `src/app/paywall/actions.ts:58-61` |
| **Stripe invoices, payment records, cancelled subscription object** | Remain, with `supabase_user_id` in the subscription metadata | `src/app/settings/actions.ts:179-180`; `src/app/paywall/actions.ts:81-83` |
| **Unclaimed anonymous rows** | Null `user_id` means no cascade. Includes results from earlier Start overs on the same device and any claim that failed | `src/app/settings/actions.ts:176-177`; `src/lib/claim-signup.ts:47-50` |
| **Partly claimed sets** | Possible from an older build's leftover ids. An unclaimed parent or sibling row survives if its owned child is deleted | `src/lib/persistence.ts:250-254` |
| **`localStorage` on the device** | Not cleared | Section 3 |
| **Vercel logs** | User ids, subscription ids. The webhook logs one more line when the post-deletion event finds no profile | `src/lib/reminders.ts:162`; `src/app/api/stripe/webhook/route.ts:142-145` |
| Resend send history, Supabase backups and auth logs | Outside the code; retention not found | |

### Gaps

- **A live subscription can survive deletion.** Only the id on the profile is cancelled; the code never lists the customer's subscriptions (`src/app/settings/actions.ts:209`). The profile id could be empty or wrong if the player deletes before the webhook or success page syncs, or if two checkout tabs created two subscriptions (the guard at `src/app/paywall/actions.ts:48` only checks status). That subscription would keep billing a deleted user, and the webhook would find no profile to update.
- **A subscription with no matching metadata blocks deletion**, for example one made by hand in the Stripe dashboard (`src/app/settings/actions.ts:218-223`). The player is told to email support.
- **A partial failure is possible.** The subscription can be cancelled and the account deletion can then fail; the error message says so (`src/app/settings/actions.ts:242-244`).
- **Unconfirmed sign-ups can't delete themselves.** They can't sign in, and no cleanup was found. Their `auth.users` row, `profiles` row with email, and metadata links all remain.
- **The UI overstates it.** "Everything saved to it" (`src/app/settings/delete/page.tsx:49-50`) and "Your account and everything saved to it have been deleted" (`src/app/login/page.tsx:37`) don't mention what stays in Stripe.
- **Self-service export:** not found.

---

## 8. Anonymous data retention

**There is no cleanup of unclaimed anonymous rows.** They stay indefinitely.

| Checked | Result | Evidence |
|---|---|---|
| Crons | One only, for reminders | `vercel.json:2-7` |
| App deletes | Only one `.delete()` in `src`: a signed-in player's own duplicate re-test assessment | `src/lib/retest-save.ts:112-116` |
| Migrations | No `pg_cron`, TTL or delete job | `supabase/migrations/` |
| Start over | Clears the browser only. Rows stay, and the next assessment writes three new ones | `src/app/start/page.tsx:150-159`, `:107-115` |
| Visitor deleting their own rows | Not possible: anon has insert only, with no select or delete policy | `init_schema:110-131` |
| Dev tool | Removes only rows it created itself. Not a retention process | `.claude/skills/test-user/scripts/test-user.mjs:133` |

Unconfirmed sign-ups have no cleanup either (section 7). Jobs scheduled directly in the Supabase dashboard would not show in the repo.

---

## 9. Age

**Not found.** No age question, birth-date field or age gate exists anywhere.
- No such column in any migration.
- None of the assessment questions asks it (`src/lib/questions.ts`).
- Neither sign-up form asks it (`src/components/auth/SaveGate.tsx:300-359`, `src/app/signup/page.tsx:41-68`).
- The Terms and Privacy pages don't mention it.
- A case-insensitive search of `src` and the migrations for age, birth, DOB, COPPA and minor terms returned only one unrelated code comment.

---

## 10. Regions

| Service | Result | Evidence |
|---|---|---|
| Supabase project region | **Not found.** No `supabase/config.toml`; the project URL has the form `<ref>.supabase.co`, with no region in it | `supabase/` holds only `migrations/`; `.env.local` |
| Vercel function region | **Not found.** No `regions` key and no `preferredRegion` export. The two `runtime = "nodejs"` exports set the runtime, not a region | `vercel.json:1-8`; `src/app/api/cron/drill-reminders/route.ts:6`; `src/app/api/stripe/webhook/route.ts:10` |
| Linked Vercel project file | Holds ids and project name only | `.vercel/project.json` |

---

## Follow-up (items 11–14)

Added 2026-10-30, same commit (`b1c7d70`) and same limits: code, migrations and config only, with no dashboards or live database checked.

### 11. Paywall text before the redirect to Checkout

All wording is in `src/components/paywall/PaywallView.tsx`. Annual is preselected (`:56`). This is the text as rendered, top to bottom:

| Element | Verbatim text | Line |
|---|---|---|
| Eyebrow and headline, no re-test yet | "Progress" / "See what every re-test changes." | `:32` |
| Eyebrow and headline, after a re-test | "Up N point(s)" / "See where every point came from."; "Score held" / "See what shifted underneath it."; "Down N point(s)" / "See which skills slipped, and which held." | `:36-42` |
| Feature 1 | "How the other skills moved on every re-test (the one you trained is free)" | `:17` |
| Feature 2 | "Your readiness chart across every re-test, with logged sessions beneath it" | `:18` |
| Feature 3 | "Re-test history and weeks with both sessions" | `:19` |
| Annual card | "Annual", badge "SAVE 17%", "$79 / year · equivalent to $6.58 per month" | `:115-117` |
| Monthly card | "Monthly", "$7.99 / month · billed monthly" | `:123-124` |
| Button | "Continue · $79/year" or "Continue · $7.99/month" ("Taking you to checkout…" while pending) | `:135-139` |
| Line under the button | "Secure checkout by Stripe · Cancel anytime" | `:147` |

| You asked about | What the paywall says |
|---|---|
| Price | Stated, on the card and on the button |
| Billing period | Stated: "/ year", "/ month · billed monthly" |
| **Auto-renew wording** | **None.** "Renew", "recurring", "automatic" and "until you cancel" appear nowhere in the file |
| **How to cancel** | **Only "Cancel anytime."** It doesn't say where or how, or when cancelling takes effect |
| Refund wording, Terms or Privacy link | None |

- The displayed prices are hard-coded in this file. The amount charged comes from the `STRIPE_PRICE_ANNUAL` and `STRIPE_PRICE_MONTHLY` env values (`src/lib/stripe.ts:35-39`). Whether they match: not determinable from code.
- The landing page has the same gap: "Cancel anytime. Cancelling stops billing and keeps the free tier." (`src/components/marketing/sections.tsx:500`).
- Wording on Stripe's hosted Checkout page, including any renewal or terms text: not determinable from code. The session sets no custom text (`src/app/paywall/actions.ts:72-90`), and the comment says the product description comes from the Stripe dashboard (`:84-86`).

### 12. Renewal reminders

**No app code emails anyone before a renewal, yearly or monthly.**

| Checked | Result | Evidence |
|---|---|---|
| Crons | One only, for drill reminders | `vercel.json:2-7`; `src/app/api/cron/` holds only `drill-reminders` |
| Resend emails | Only the drill reminder | `src/lib/email.ts:27`, `:40` |
| Webhook events | No `invoice.upcoming` or any other `invoice.*` event is handled; unhandled events are acknowledged and ignored | `src/app/api/stripe/webhook/route.ts:14-18`, `:52-54` |
| In-app notice | Settings shows "Annual · renews Apr 2027" to a player who opens it. It gives month and year only, not the day | `src/app/settings/page.tsx:90`; `src/lib/date-format.ts:6-9` |

**Stripe settings: not determinable from code.** Whether Stripe sends a renewal notice depends on account settings, and none of them are in the repo.

**Which subscription emails Stripe sends under Managed Payments: not determinable from code, and the repo has no note on it.** A search of tracked files for "Managed Payments" and "merchant of record" finds only the comment at `src/app/paywall/actions.ts:84-86`, which is about `custom_text` and says nothing about email. The one other related note is `audit/app-critique.md:240`, which says there is no way to see receipts in the app.

### 13. Cancellation

**Every path:**

| Path | Effect | Evidence |
|---|---|---|
| **Settings → Manage subscription → Cancel subscription** | **Cancels at period end** (`cancel_at_period_end: true`) | `src/app/settings/page.tsx:95-102`; `src/components/settings/CancelSubscriptionForm.tsx:64-74`; `src/app/settings/actions.ts:91-93` |
| `/settings/manage` opened directly | Same page and same action. Requires sign-in; non-subscribers are sent back to `/settings` | `src/app/settings/manage/page.tsx:16-18`, `:27-29` |
| **Settings → Delete account** | **Cancels immediately**, no refund (item 14) | `src/app/settings/actions.ts:224-227` |
| Email support | Manual, with no code behind it. Offered in Settings and when cancelling fails | `src/app/settings/page.tsx:158-164`; `src/components/settings/CancelSubscriptionForm.tsx:83-87` |
| Stripe Billing Portal | Not found | No `billingPortal` call anywhere in `src`; `audit/app-critique.md:240` |
| Link in a Stripe email | Not determinable from code | |

A cancellation made outside the app, in the Stripe dashboard for example, is mirrored by the webhook (`src/app/api/stripe/webhook/route.ts:119-148`). When Stripe ends a subscription after failed payments, the webhook mirrors that too (`src/lib/stripe.ts:91-95`).

**Steps from Settings:**

1. Under Subscription, tap "Manage subscription" (`src/app/settings/page.tsx:100`). Only paid players see this row (`:84`).
2. `/settings/manage` shows "Cancel your subscription?" and "You'll keep Progress access until Apr 2027, the time you've already paid for, then move to the free plan. Nothing is charged again." (`src/app/settings/manage/page.tsx:43-49`, month and year from `:31-33`). "Never mind" returns to Settings (`:60`).
3. Tap "Cancel subscription" (`src/components/settings/CancelSubscriptionForm.tsx:73`). **That one tap is the confirmation**; nothing is typed.
4. The server confirms the subscription belongs to the player, then updates it in Stripe (`src/app/settings/actions.ts:84-93`) and writes the result to the profile (`:97`).
5. The page changes to "Cancellation scheduled" and "Your subscription is set to cancel. You keep Progress access until Apr 2027, then you move to the free plan." with a "Keep my subscription" button that undoes it (`src/app/settings/manage/page.tsx:43`; `src/components/settings/CancelSubscriptionForm.tsx:44-55`). Settings shows "cancels Apr 2027" (`src/app/settings/page.tsx:90`).

**At period end,** Stripe sends `customer.subscription.deleted` and the webhook drops the player to free (`src/app/api/stripe/webhook/route.ts:136-148`; `src/lib/billing.ts:124-138`).

- If it fails, or if no subscription id is on the profile, the player sees only "Something went wrong. Email support@roadtonextrating.com and we'll sort it out." (`src/components/settings/CancelSubscriptionForm.tsx:83-87`).
- The app sends no cancellation confirmation email (`src/lib/email.ts:27`). Whether Stripe sends one: not determinable from code.
- The access-until date shows month and year only, not the day (`src/app/settings/manage/page.tsx:31-33`; `src/lib/date-format.ts:6-9`).

### 14. Does account deletion cancel the Stripe subscription?

**Yes, immediately, if the profile has a subscription id.** It runs before the auth user is deleted, and it does not use `cancel_at_period_end`. A subscription already scheduled to cancel at period end is also cancelled at once, because its status is still active.

`src/app/settings/actions.ts:209-235`:

```ts
    if (profile?.stripe_subscription_id) {
      try {
        const owned = await retrieveOwnedSubscription(
          user.id,
          profile.stripe_subscription_id
        );
        // Not theirs: cancel nothing and delete nothing. Their own billing may
        // still be live under another id, so a deletion here could leave a
        // deleted user being charged.
        if (!owned) {
          return {
            error:
              "We couldn't match the subscription on your account, so nothing was changed. Email support@roadtonextrating.com and we'll sort it out.",
          };
        }
        if (owned.status !== "canceled") {
          await getStripe().subscriptions.cancel(owned.id);
          subscriptionCancelled = true;
        }
      } catch (err) {
        // Already gone in Stripe is fine; anything else stops the deletion.
        const code = (err as { code?: string } | null)?.code;
        if (code !== "resource_missing") throw err;
      }
    }

    const { error } = await createAdminClient().auth.admin.deleteUser(user.id);
```

- **No refund.** The call passes no options, and a paid player is told first: "Your subscription is cancelled immediately as part of this, so you are not billed again. The time left on the current period is not refunded." (`src/app/settings/delete/page.tsx:74-75`).
- **Limit:** only the id on the profile is cancelled. With no id on the profile, nothing is cancelled and the deletion still proceeds, so a subscription missing from the profile keeps billing (section 7, Gaps).

---

## Statements that would be false today

Each of these is common in a standard policy and is contradicted by the code. Fix the code or word around it.

1. **"We delete your data when you delete your account."** The Stripe Customer, invoices and subscription record survive, as do unclaimed rows, device storage and logs (section 7).
2. **"We don't store anything until you create an account," or "your plan stays on your device if you skip."** Rows go to Supabase when the assessment ends, before any choice. The current UI already implies this: "Not now, keep it on this device" (`src/components/auth/SaveGate.tsx:367`), also `:247`, `:252`, and `src/components/plan/PlanView.tsx:244`.
3. **"Anonymous data is deleted after X days," or "kept only as long as needed."** There is no cleanup of any kind (section 8). Unconfirmed sign-ups, which include an email, are also kept indefinitely.
4. **"Anonymous data can't be linked to you."** A sign-up attempt writes the row ids into that email's auth metadata until a claim succeeds (section 2). Free-text answers can also contain anything the player typed.
5. **"Every email has an unsubscribe link,"** or **"we email you only if you opt in."** There is no link or header, the opt-out requires signing in, and reminders default to on for all players (section 5).
6. **"We send re-test reminders," or "you control re-test emails."** No such email exists; the toggle does nothing. Separately, drill reminders have no end date while a plan stays active (section 5).
7. **"Our processors are Supabase, Stripe and Resend,"** as the current `/privacy` says. Vercel is missing (`src/app/privacy/page.tsx:50-52`), and so is whoever hosts the support inbox.
8. **"We store only your answers and email."** `profiles` also holds Stripe ids, plan, renewal date and preferences (section 2). The current `/privacy` omits these (`:39-41`).
9. **"Session cookies expire when you close your browser,"** or **"auth cookies are HttpOnly."** Library defaults give a 400-day cookie that JavaScript can read (section 3).
10. **"Refunds are handled in the app,"** or **"you can update your card in Settings."** Neither exists. Deleting an account also ends a paid period at once with no refund, unlike a normal cancel (section 6).
11. **"By creating an account you agreed to these Terms,"** if it implies a record. No acceptance is captured, and signed-in players can't reach the pages (section 1).
12. **"You must be 13 (or 18) to use this service,"** if it implies a check. Nothing is asked or enforced (section 9).
13. **"We tell you before checkout that your subscription renews automatically and how to cancel."** The paywall has no auto-renew wording and says only "Cancel anytime" (item 11). What Stripe's Checkout page shows is not determinable from code.
14. **"Cancelling always keeps your access until the end of the paid period."** True for Manage subscription, false for Delete account, which ends it immediately with no refund, even if a period-end cancellation was already scheduled (items 13, 14).
15. **"You can cancel or manage billing in a customer portal," or "without signing in."** There is no portal. In-app cancelling requires sign-in, and the only other route is emailing support (item 13).

Don't state these until checked outside the repo: data-storage region (section 10), Stripe as merchant of record (section 6), and that subscribers get an email before renewal or after cancelling. The app sends neither, so either would have to come from Stripe (items 12, 13).
