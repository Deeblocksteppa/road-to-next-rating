# Legal pages: build plan

Written 2026-10-30 on branch `legal-pages`, from `main` at `e964726`. Read-only so far: this file is the only thing written, and nothing is built. Copy source: `audit/legal-copy.md`. Current behavior: `audit/legal-inventory.md`, plus the code read for this plan.

## Decisions I need from you

Each has a default. Say "go" and I build the defaults.

| # | Question | Default |
|---|---|---|
| 1 | Is `.env.local`'s Supabase project production? `/test-user` says real visitors create rows there, and `docs/STATUS.md` treats it as the live database. | I assume yes. No local run may send to real users or delete by date. Local cron runs are dry-run only, and deletion logic is tested in PGlite or on recorded test ids. |
| 2 | The delete-confirmation copy for a subscriber whose cancellation is already scheduled. "To stop paying… cancel your subscription instead" tells them to do what they already did. | Use your line for active subscribers. For scheduled ones, show only: "Deleting your account cancels Progress right away and ends access today. You keep access until {date} if you don't delete." New copy, for your review. |
| 3 | New copy with no source in `legal-copy.md`. | I draft it and list it as unreviewed: expired-result button ("Take the assessment"), the unsubscribe page (confirm, done, invalid link), new delete errors, and the "Legal" row label. |
| 4 | Retest email window. "On retest_date" with one failed cron run means that player never gets the email. | Send when `retest_date` is today or up to 2 days ago, and not yet sent. A missed run catches up. The first deploy can't mass-email old plans. |
| 5 | On a player's re-test date they qualify for both emails, from the same cron run. | Send only the re-test email that day. If re-test reminders are off, the drill email still goes. |
| 6 | Footer on the assessment, session, re-test and paywall. A same-tab tap loses in-progress answers or a running timer, because that state isn't persisted. | Footer links open a new tab on `/start`, `/session`, `/retest` and `/paywall`, and the same tab elsewhere. Consent and paywall links always open a new tab. |
| 7 | Device wording that implies the result lives only on the device: `SaveGate.tsx:221`, `:246`, `:252`, `PlanView.tsx:244`. You asked to change only `:367`. | Leave them and flag them here. Each is literally true, but sits next to a Privacy Policy saying the rows are in our database. |
| 8 | "Everything saved to it" (`settings/delete/page.tsx:49`, `login/page.tsx:37`), while payment records stay in Stripe. | Leave them and flag them here, unless you give replacement lines. |
| 9 | One real test send to `delivered@resend.dev` (Resend's sink address, no real recipient) to prove Resend accepts the new headers. | Yes. All other email checks render without sending. |

**Answered 2026-10-30.** #1 yes, `.env.local` is production: dry-run locally, test with `/test-user` and clean up. #2 use the variant, with this copy: "Your plan already ends on {date}. Deleting your account now ends access today." #4 yes. Defaults that change no copy, delete nothing and don't touch billing stand (#5, #7, #8, #9). #3 and the 21 held defaults (copy, deletion, billing) were approved the same day; their wording is in `legal-copy.md`.

**Changed after Phase 1:** decision 6 is withdrawn. The site footer is scoped, not in the root layout. It appears on `/login`, `/signup`, `/terms`, `/privacy`, `/refunds` and `/settings` with its sub-routes, and the landing's own footer carries the same links in one row. It is off `/start`, `/session`, `/retest`, `/home`, `/plan`, `/progress` and `/paywall`. Footer links open in the same tab. Legal links inside a flow (save form, paywall) open a new tab.

**Migration order rule:** now in `docs/STATUS.md` under Conventions. Phase 4's order follows it.

## Corrections to the brief

These are places where following the brief literally would break something.

1. **Retention cleanup can delete paying players' data.** `diagnoses.assessment_id` and `plans.diagnosis_id` are `on delete cascade`, and the inventory (section 7) confirms partly claimed sets can exist. Deleting an unclaimed assessment whose diagnosis or plan is claimed would cascade through that player's plan and `drill_sessions`. The sweep must exclude any assessment or diagnosis with a claimed row, or any `drill_sessions`, below it. The dry run reports how many were skipped.
2. **A claim on deleted rows silently succeeds today.** `claim_anonymous_records` returns `void` and updates 0 rows without error. `claimAnonymousResult` then clears the device, and `/auth/confirm` redirects with `?saved=1`. So the claim path can't detect expiry as written. Existence needs its own check (Phase 5).
3. **Anonymous visitors can't check existence themselves.** They have no SELECT on those rows, by design. The check is a server action using the service role that returns one boolean. No migration needed.
4. **The expired check has to run before sign-up, not only at claim.** A returning visitor rebuilds their plan from `rtnr:result` with no network call. Checking only at claim would let them create an account and then be told the result is gone. So `/start` checks on load when ids are stored.
5. **Stripe search is eventually consistent.** Stripe's docs say not to use it for read-after-write, so a subscription minutes old may not appear. The customer list covers most of that gap, but a checkout whose profile write failed has neither. I'm adding `customers.list({ email })`, filtered on `metadata.supabase_user_id`. Query syntax is `metadata['supabase_user_id']:'<id>'`, not `=`.
6. **Your four statuses miss two that can still bill.** `incomplete` can become active if its payment completes, and `paused` can resume. Cancel everything except `canceled` and `incomplete_expired`.
7. **An open Checkout tab survives deletion.** A player could finish paying after the account is gone, creating a live subscription on a deleted user. Deletion also expires open Checkout Sessions for the customer.
8. **Merging would start deletes on the next cron.** A dry-run flag alone doesn't stop that. Real deletes require a new env var, `RETENTION_ENABLED=true`. Without it the cron always dry-runs, so nothing can delete before you've seen the counts.
9. **`.env.example` doesn't exist and is gitignored** (`.gitignore:38`, `.env*`). I'll create it with names only and add `!.env.example`. `CLAUDE.md` and `/ship` both say `.env*` stays out, so this is the one named exception.
10. **Prices are already hardcoded in the paywall** (`PaywallView.tsx:116`, `:124`, `:138-139`). "The same source" means one constant in that file, used by the cards, button and disclosure. I'll also read the real amounts from the Stripe Price objects, read-only, to confirm they match.
11. **`/unsubscribe` can't be both a page and a POST route** in Next (`page.tsx` and `route.ts` conflict). The page lives at `/unsubscribe`, and POST at `/api/unsubscribe`.
12. **Effective date.** Your brief says today, the copy says `[MERGE DATE]`, and merge waits on review. Date and `terms_version` come from one constant in `src/lib/legal.ts`, so re-dating at merge is a one-line change.

---

## Phase 1: Legal pages and links

**Files**
- New: `src/lib/legal.ts` (effective date, terms version, link names), `src/components/legal/LegalPage.tsx`, `src/components/legal/SiteFooter.tsx`, `src/app/refunds/page.tsx`, and layouts for `/settings`, `/login` and `/signup`
- Replace: `src/app/terms/page.tsx`, `src/app/privacy/page.tsx`
- Edit: `src/components/marketing/sections.tsx` (one landing footer row: logo, Sign in, legal links, email, ©), `src/app/settings/page.tsx` (Legal section)
- Also committed here: `audit/legal-copy.md`, `audit/legal-inventory.md`, this plan

**Design:** `max-w-[680px]`, Archivo headings, body 16px in `ink-1` as the current legal pages use, hairline rule between sections, left-aligned, no accent. Text is written into the page verbatim except that `[MERGE DATE]` becomes the date. A scratch script compares each page's rendered text with the markdown, line by line.

**Brackets that stay visible**
- Privacy: `[CONFIRM: Supabase and Vercel regions]`
- Refunds: `[TRUE ONCE STRIPE'S RENEWAL EMAILS ARE ON IN THE LIVE ACCOUNT]`

**Risks**
- **Pages with the footer scroll a little.** `/login`, `/signup` and `/settings/manage` are full-height, so the footer sits below the fold.
- **Width at 375.** The four links don't fit on one 15px line, so the email wraps to its own line.

**Still false after this phase:** everything in the table at the end. The pages go up before Phases 2 to 5 make them true, which is fine on an unmerged branch.

**Verify:** tsc, lint, text diff against the markdown, footer present where it belongs and absent from every flow, full-height flow screens don't scroll.

---

## Phase 2: Consent and paywall disclosure

**Files**
- Edit: `src/components/auth/SaveGate.tsx`, `src/app/signup/page.tsx`, `src/app/auth/actions.ts`, `src/lib/legal.ts` (consent metadata helper), `src/components/paywall/PaywallView.tsx`, `src/app/settings/delete/page.tsx`, `src/lib/date-format.ts` (full date)

**Risks**
- **Consent evidence is soft.** `user_metadata` can be changed by the player through `auth.updateUser`, and it's deleted with the account. Fine as you specified; a tamper-proof record would need a column and a trigger.
- **Metadata must survive the claim.** `claimSignupRecords` calls `updateUser` to null the pending ids. It should merge, and I'll confirm on a real sign-up that the two fields remain.
- **Google isn't covered.** `signInWithOAuth` sends no metadata and sits above the consent line. It's off by flag today. Turning it on would make "when you agreed to these terms" false for those users.
- **Delete confirmation dates.** `monthYear` gives "Apr 2027". A legal line about when access ends should name the day, so I'll add a full-date helper. Fallback when `renews_at` is null: "the end of your billing period".
- **Paywall length.** A longer block at 375 may push the pay button below the fold. Checked in the screenshots.
- **Naming.** The plan card says "Annual", the copy says "yearly". I'll leave both as written. It's a small M5 miss.

**Still false after this phase**
- "when you agreed to these terms" (Privacy) is false for every account that already exists: no record, and no notice sent.
- The consent line names session reminders but not the re-test reminder. Not false, since Privacy covers it, but incomplete.

**Verify:** both forms submitted against a local stand-in for Supabase, with the request body read back; consent fields surviving a real claim on a `/test-user` account; paywall in both plans; Stripe Price amounts against the displayed prices; delete page as free, active and cancel-scheduled, with and without a date. No real form sign-up was run against the hosted project.

---

## Phase 3: Account deletion billing safety

**Files**
- Edit: `src/lib/billing.ts` (find and cancel helpers), `src/app/settings/actions.ts`, `src/components/settings/DeleteAccountForm.tsx`
- New: `src/lib/device-data.ts`

**Order inside `deleteAccount`** (all finding and checking happens before anything changes)
1. Find subscriptions: the id on the profile, `subscriptions.list` by the profile's customer, `subscriptions.search` on metadata, and `customers.list` by email filtered on metadata, then list those customers' subscriptions.
2. Ownership check on all of them. Any live subscription whose metadata isn't this user: refuse and delete nothing (today's behavior, same message).
3. Expire open Checkout Sessions for those customers.
4. Cancel each immediately.
5. Delete the user. On success, return `{ ok: true }` instead of redirecting.
6. Client clears device storage, then navigates to `/login?notice=deleted`.

**Keys cleared** (grep confirms these five and no `sessionStorage` anywhere): `rtnr:result`, `rtnr:assessment_id`, `rtnr:diagnosis_id`, `rtnr:plan_id`, `rtnr:signup_pending`. It also sweeps any other `rtnr:` key, so a future one isn't missed.

**Risks**
- **`resource_missing` and the new Stripe account.** Today "already gone" is tolerated, and I'll keep that, otherwise every profile holding an old-account id could never delete. Subscriptions on the old account are invisible to this code, which is safe: the old account is test-mode only, so it has no live subscriptions.
- **Partial failure.** If the second of two cancels fails, one is already cancelled. The error has to say so, like the existing line does. New wording, for review.
- **Lost response after a successful delete.** The account is gone but the browser never ran the cleanup, so storage survives until the next `/start` visit. Accepted.
- **`signOut` after the user is deleted.** Needs to still clear the cookie. Checked in the test.
- **Test leftovers.** `/test-user cleanup` only knows the profile's customer, so the metadata-only subscription needs its own teardown.

**Still false after this phase:** nothing from Terms §8 or Privacy "Deleting your account".

**Verify** (on `sk_test_`, test users only)
1. Subscription on the profile: cancelled, user deleted, all five keys gone, signed out.
2. Subscription found only by metadata (separate customer, profile empty, waiting until search returns it): cancelled, user deleted.
3. Forced failure with an invalid Stripe key on a second dev server: deletion aborts, user and data intact, error shown.
4. Failure midway, using a stub client in a scratch script: second cancel throws, deletion aborts, error is truthful.
5. Metadata mismatch: refused, nothing changed.

---

## Phase 4: Email

**Files**
- New: `src/lib/unsubscribe.ts` (token sign and verify), `src/app/unsubscribe/page.tsx`, `src/app/api/unsubscribe/route.ts`, `src/lib/retest-reminders.ts`, `supabase/migrations/<timestamp>_retest_reminder_sent_at.sql`, `.env.example`
- Edit: `src/lib/email.ts` (rendering split from sending, footers, headers), `src/lib/reminders.ts`, `src/app/api/cron/drill-reminders/route.ts` (`?dry=1`), `.gitignore`

**Migration: yes.** `plans.retest_reminder_sent_at timestamptz`, nullable.
- **Order: you run it on production before merge,** with before/after check queries in the migration file. It's additive, so the code running today ignores it.
- If the code ships first, the re-test pass finds the column missing, logs it and sends nothing, because sending without a record is how doubles happen. Drill reminders carry on.
- A dry run also works without the column, so verification doesn't depend on it.

**Idempotency:** claim with a conditional update (`set sent_at where id = ? and sent_at is null`, returning the row), then send. A rerun finds nothing to claim. If the send fails, the claim is released so the window in decision 4 retries it. Resend's idempotency key on the plan id covers a crash between send and release. I'll confirm the installed SDK's option name at build.

**Who gets the re-test email:** `retest_reminder_enabled` on, the player's newest plan by `created_at` (same as `openRetestPlan`), status `active`, date in the window, not yet sent. A finished re-test makes a newer plan with a future date, so "re-test isn't done" follows from that. `{skill}` uses `SKILL_LABELS`, the in-sentence names ("your third-shot drop"), so the line reads "started training your third-shot drop".

**Unsubscribe:** the token holds user id and reminder type, signed HMAC-SHA256 and compared in constant time, with no expiry so old emails keep working. POST with `List-Unsubscribe=One-Click` returns 200. The page's button POSTs and gets a 303 back to a done screen. GET on the API route redirects to the page and changes nothing. A deleted user's token updates 0 rows and still shows done.

**Risks**
- **Missing secret.** Without `EMAIL_UNSUBSCRIBE_SECRET`, sends fail rather than go out with no link. So **set it in Vercel before merge, or every reminder errors.**
- **Secret rotation** kills old links. They show the invalid page, which points to Settings.
- **Email links can't use the request's host.** A cron request has no player-facing origin, so links use `NEXT_PUBLIC_SITE_URL`, falling back to `https://roadtonextrating.com`. Please check that variable in Vercel.
- **`plans: update own` still allows any column** (already in Outstanding), so a player could set their own `sent_at`. It only mutes their own email.
- **Drill reminders can still double-send on a rerun.** Vercel can deliver a cron twice. Not in this brief, and not changed here.
- **1000-row cap.** The existing reminder queries are capped by Supabase's default page size. The re-test pass pages properly. The drill pass is unchanged and will silently miss users at scale.
- **Postal address.** Not added: these reminders are transactional.

**Still false after this phase**
- All of Privacy "Emails" is false until this is deployed with the secret set.
- "Billing emails (receipts and renewal notices) come from Stripe" depends on dashboard settings (table below).

**Verify**
- Render both emails to files and read them
- Token round trip, tampered token rejected, wrong-type token rejected
- GET leaves the toggle unchanged; POST turns off only that type; one-click POST returns 200
- Dry-run cron with seeded test users: re-test date today, past window, future, already sent, toggle off, re-test done, null date
- Claim logic and a double run in PGlite

---

## Phase 5: Retention cleanup

**Files**
- New: `src/lib/retention.ts`, `src/app/api/cron/retention/route.ts`, `src/app/start/actions.ts` (existence check)
- Edit: `vercel.json`, `src/lib/persistence.ts`, `src/lib/claim-signup.ts`, `src/app/start/page.tsx`, `src/components/auth/ClaimOnLoad.tsx`, `src/app/(app)/home/page.tsx`, `src/app/auth/confirm/route.ts`, `src/app/auth/actions.ts` (the password sign-in claim), `src/app/auth/callback/route.ts`, `.env.example`

**Cascade answer:** deleting an assessment does cascade to its diagnoses, plans and drill sessions, which is exactly the danger in correction 1.

**What the sweep deletes, all older than 30 days**
1. Assessments with `user_id` null and no claimed diagnosis, claimed plan or drill session below them. The delete itself repeats `user_id is null`, so a claim landing mid-run can't be cascaded away: the RPC claims all three rows in one transaction.
2. Unclaimed diagnoses with a null `assessment_id`, and unclaimed plans with a null `diagnosis_id`, under the same conditions. RLS lets anon insert those.
3. Auth users with `email_confirmed_at` null and `created_at` past the cutoff, via paged `listUsers`. Rows named in their `pending_*` metadata go too, unclaimed only. Skipped and counted if they have a `last_sign_in_at`, a Stripe customer or any claimed row.

Batched for PostgREST's row and URL limits. No migration.

**Expired result**
- `/start` on load: stored ids that no longer exist → clear the device, show the expired copy and a restart button.
- `/home` (`ClaimOnLoad`) and `/start`'s signed-in branch: check before attaching. If gone, clear; never call the save that would write new rows. Show the copy only if the account has no plan, since a player with a plan doesn't need it.
- `/auth/confirm`, password sign-in and `/auth/callback`, the three places that claim from metadata: same check in `claimSignupRecords`, then clear the metadata and land on `/home?expired=1` instead of `?saved=1`.
- Check fails on the network: treat as still there. Never wipe a device on a failed request.

**As built.** A set is also kept, and counted, if a row below its top row is under 30 days old, because a return visit can save a missing plan under an old diagnosis. After the Codex review, the checks and deletes are one Postgres transaction (`retention_sweep`, 20261101120000): it locks each set top down, re-checks it and deletes it bottom up, so a claim mid-run waits or makes the set ineligible. The 30-day cutoff now applies to every set, which replaces approved default 18: rows named in an unconfirmed user's metadata no longer go early. Auth users are never deleted: a delete could race someone confirming, so the 30 days covers the results saved with an unconfirmed sign-up, and the address stays until someone asks. `/start` signed-in check uses `getUser`, not the cookie, so a cookie from a deleted account still shows the copy. `/auth/callback` shares the claim code but wasn't exercised: Google is off and old PKCE links can't be replayed.

**Dry run:** `?dry=1` counts only, and the route dry-runs unless `RETENTION_ENABLED=true`. It requires `CRON_SECRET` always; unlike the reminder route, a missing secret means refusal, not open access. Output: assessments, diagnoses and plans to delete, partly claimed sets skipped, recent sets skipped.

**Risks**
- **Real deletes are irreversible.** Backups aside, nothing brings them back. The sequence is: I run the dry run and show you the counts, you read them, you set the env var. I don't run a real delete against this database in testing.
- **Confirm-link window.** Someone signing up on day 29 and confirming on day 31 finds their rows gone. They get the expired copy, not an error.
- **`/test-user`'s rule.** It says never delete unclaimed rows by date, and that stays right for the tool. This cron is the one deliberate exception, and tests stay on recorded ids.
- **Vercel plan limits** on cron count and duration aren't visible from here. Two daily crons should fit; the first dry run will show timing.

**Still false after this phase**
- "Results never saved to an account: deleted after 30 days" and "Sign-ups never confirmed: the results saved with them are deleted after 30 days" stay false until `RETENTION_ENABLED` is set and the first real run finishes.
- Partly claimed sets that the sweep skips outlive 30 days. If the dry run shows any, you decide what happens to them.
- A device copy stays in the visitor's own browser until they come back, when it's cleared. A device result with no stored ids (private mode at save time) has nothing to check against and stays.

**Verify**
- PGlite with all migrations: old unclaimed set deleted, young kept, claimed kept, partly claimed kept with no claimed row lost, drill sessions intact, a claim landing just before the delete survives.
- Real project, recorded test ids only: unconfirmed test user removed by a scratch script scoped to `rtnr-test+`.
- Real UI: stale ids on `/start`, on `/home` signed in, and through a confirm link. Each shows the copy, clears the device, makes no new rows and logs no error.
- Then the production dry run, shown to you.

---

## Copy that stays false or unproven after all five phases

None of this is fixed by code. Everything here needs you, KC or a dashboard.

| Copy | Where | What makes it true |
|---|---|---|
| Stripe as described, no Managed Payments | Terms §5, Refunds, header of `legal-copy.md` | The new account has to be live: keys, webhook secret, price ids. The code comment says the current one has Managed Payments on, which also changes who the seller is. |
| "Charges appear on your statement as ROADTONEXTRATING" | Terms §5 | Statement descriptor on the new account |
| "Billing emails (receipts and renewal notices) come from Stripe" | Privacy | Dashboard settings. Not sent by app code. |
| "We'll email you before your yearly plan renews" | Refunds (bracketed) | Same setting, on the live account. |
| "When we refund a yearly charge, we also cancel the plan" | Refunds | A promise you keep by hand: cancel immediately, then refund. `charge.refunded` is deliberately not handled. |
| "stored and processed in the United States" | Privacy (bracketed) | Supabase and Vercel regions, from both dashboards |
| "database access rules that keep each player's data private" | Privacy | The `drill_sessions` half of `20261029180000` is still unconfirmed on production (Outstanding) |
| "Server logs and backups: limited time" | Privacy | Provider retention settings, not visible from the repo |
| "kept by Stripe and by us" | Privacy | Deletion removes our copy of the Stripe ids. "By us" is true only in the sense of your Stripe account. Small, but worth KC's read. |
| "we will email you before" a price change; "reply within 2 business days"; "respond within 45 days" | Terms, Refunds, Privacy | Promises you keep by hand. No code does these. |
| "a Virginia sole proprietorship" | Terms | Only you can confirm it |
| "Account emails… are always sent" | Privacy | Reads against `CLAUDE.md` rule 8 ("no always"). Left verbatim, flagged for KC. "always available" in Terms §10 is a disclaimer and fine. |

**Checked and true:** ImprovMX is live (MX records for the domain point to `mx1` and `mx2.improvmx.com`, checked today). `legal-copy.md` has no em dashes. Plans are always 3 weeks (`roadmap.ts:108`), so "Three weeks ago you started" holds for real plans. App code has no analytics or trackers, per the inventory.

**Stripe housekeeping:** H6 in Outstanding (the product description still says plans are included) shows on Checkout next to this new copy.

## Backlog

- Before enabling Google sign-in, send terms_accepted_at/terms_version on that path.

## Env vars and migrations

| What | Needed by | When |
|---|---|---|
| `EMAIL_UNSUBSCRIBE_SECRET` (new) | Phase 4 | Vercel, before merge, or reminders stop |
| `RETENTION_ENABLED` (new) | Phase 5 | Only after you've read the dry-run counts |
| `NEXT_PUBLIC_SITE_URL` (existing) | Phase 4 | Check it's set to the live domain |
| `plans.retest_reminder_sent_at` | Phase 4 | Run on production before merge |

## Finish

Full `/verify` at 375 and 1440: `/terms`, `/privacy`, `/refunds`, save form, paywall in both plans, delete confirmation, unsubscribe page. Test users cleaned up and reported. Then the summary you asked for. `docs/STATUS.md` stays untouched until you say the copy is reviewed, and nothing merges. Touches sign-up, billing and a main flow, so the report ends with a Codex review recommendation.
