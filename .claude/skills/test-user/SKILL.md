---
name: test-user
description: Create a temporary confirmed test user with the Supabase admin API and sign the browser in, optionally upgrade it with Stripe test card 4242, then cancel the subscription, delete the user and its data, and confirm the cleanup. Use for any check of signed-in or paid screens.
argument-hint: "[paid] (default: free user) · or: cleanup [email]"
allowed-tools: Bash(node --env-file=.env.local .claude/skills/test-user/scripts/test-user.mjs *)
---

# Test user

Every test user is temporary. Cleanup is part of the task, not optional, and runs even if the check in between fails.

The helper script talks to the project's Supabase and Stripe with the keys in `.env.local`. Run it from the repo root:

```bash
node --env-file=.env.local .claude/skills/test-user/scripts/test-user.mjs <command> [email]
```

| Command | Does |
|---|---|
| `create` | Creates a confirmed user `rtnr-test+<timestamp>@example.com` (no password, no email sent). Prints id and email. |
| `link <email>` | Prints a one-time sign-in URL for the local `/auth/confirm` route. |
| `status <email>` | Auth user, row counts in all five tables, Stripe customer and subscription status. |
| `cleanup <email>` | Cancels any live Stripe subscription, deletes the auth user (every table cascades from `profiles`), then prints `status`. |
| `list` | Every leftover `rtnr-test+` user. |
| `anon <assessment> <diagnosis> <plan>` | Records the ids of anonymous rows this run created (in the gitignored `anon-ledger.json`) and prints each row's owner, `created_at` and `retest_date`. |
| `anon-cleanup` | Deletes every recorded row that is still unclaimed, refuses any claimed by a real account, prints what is left, and empties the ledger once nothing is. `cleanup` runs it too. |

Any Stripe step aborts unless `STRIPE_SECRET_KEY` starts with `sk_test_`.

## Steps

1. **Leftovers.** Run `list`. If old test users exist, tell the user and clean them up first.
2. **Create.** `create`, and note the email.
3. **Sign in.** `preview_start` `dev`, then `link <email>` and navigate the browser to the printed URL. It lands on `/home` signed in. No password is typed anywhere.
4. **Give it data if needed.** For screens that need a plan, take the assessment at `/start` while signed in, or anonymously before step 3 so the sign-in claims it.
   - **Every anonymous assessment gets recorded.** As soon as the reveal finishes (the plan is saved then), read the three ids with `javascript_tool`: `["assessment","diagnosis","plan"].map(k => localStorage.getItem("rtnr:" + k + "_id"))`, and run `anon <assessment> <diagnosis> <plan>`. Do this before any sign-in, because claiming clears them from the device. Record again after every "Start over", since each run writes new rows.
5. **Paid (only when `$ARGUMENTS` includes `paid`).** From `/paywall`, continue to Stripe Checkout (test mode, `checkout.stripe.com`). Card `4242 4242 4242 4242`, any future expiry, any CVC, any postcode, any name. Confirm `/paywall/success`, then `status <email>` shows an active subscription.
6. **Do the check** the user asked for.
7. **Clean up.** Either:
   - through the app when those screens are under test: `/settings/manage` cancel, then `/settings/delete`; or
   - `cleanup <email>`, which prints the final status.
   After cleaning up through the app, run `status <user id>`, then `anon-cleanup`. Either way, finish with `list` and `anon-cleanup` (which prints "No anonymous rows recorded." once the ledger is empty).
8. **Report cleanup**, all of these must hold:
   - auth user: not found
   - profiles, assessments, diagnoses, plans, drill_sessions: 0 rows
   - Stripe subscription: `canceled` (or none)
   - `list`: no test users left
   - anon rows still present: `{"plans":0,"diagnoses":0,"assessments":0}`, with the ids that were deleted

The Stripe test-mode customer record remains after cleanup; say so. Only recorded ids are ever deleted: never delete unclaimed rows by date or any other filter, since real visitors create them too.

## Notes

- Moving a plan's re-test date to today (to reach "re-test open" states) is allowed on a test user only, through the admin client in a scratchpad script. Note it in the report, since week and day labels will read oddly.
- Never use a real person's email, and never reuse a test user across tasks.
