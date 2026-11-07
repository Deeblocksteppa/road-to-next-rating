# Sign-up by 6-digit email code: plan (UX batch B)

Read-only investigation, 2026-11-05, on `main` at `24068d7`. No code changed. Line numbers are from that commit.

Goal: after `signUp`, the same screen asks for the 6-digit code from the email, calls `verifyOtp`, claims the anonymous rows and continues to the session or the plan. The email carries the code first and the existing confirmation link as a fallback, so `/auth/confirm` keeps working unchanged.

---

## 1. Current flow map

### Save form ("Save your plan"), the only sign-up players reach

| Step | Where |
|---|---|
| Opens from "Start session" or "Save my plan" on the anonymous plan | `src/components/plan/PlanView.tsx:253-260` (Save my plan), `src/app/start/page.tsx:282-283` |
| Both buttons wait on the shared save, check who is signed in, then open the form (or claim for a signed-in retake) | `src/app/start/page.tsx:181-211` |
| Renders `SaveGate` in phase `savegate` | `src/app/start/page.tsx:248-259` |
| Form: mono "Save your plan", h1 "Keep what you just found.", reason paragraph, "Your plan" card, Google (flag off), Email, Password + Show/Hide, hint, "Create account & save plan", consent, "Not now", "Already have an account? Sign in" | `src/components/auth/SaveGate.tsx:231-381` |
| Submit: awaits `saveResult()` (complete ids), then browser `supabase.auth.signUp` with ids + consent in metadata | `SaveGate.tsx:71-104` |
| Confirmed email already exists: `identities.length === 0` shows red `email_taken` | `SaveGate.tsx:116-120`, copy `src/lib/auth-errors.ts:15` |
| Session returned (confirmation off): claim, go `/home?saved=1` | `SaveGate.tsx:122-133` |
| No session (confirmation on, today): `saveSignupPending(email)`, show "Check your inbox" | `SaveGate.tsx:137-141`, `src/lib/signup-pending.ts:21-29` |
| Ends: the player leaves; nothing happens on this screen until the link is opened somewhere | |

### "Check your inbox" screen

`SaveGate.tsx:175-228`. Shown whenever `pendingEmail` is set. Mono "Confirm your email", h1 "Check your inbox", "We sent a confirmation link to {email}…", plan line, optic "Back to my plan", `ResendConfirmation`, "Use a different email", "Your plan stays on this device while you confirm."

The same pending state also puts a status block on the plan: `PendingStatus`, `PlanView.tsx:379-409` ("Check {email} to finish saving your plan.", Resend, Use a different email, "Already confirmed? Sign in"). It hides the account block (`PlanView.tsx:245`).

`pendingEmail` is loaded from localStorage on `/start` load (`start/page.tsx:133`) and cleared when the player is signed in (`start/page.tsx:120,130,196`), starts over (`:216`), or changes email (`:284-288`, `SaveGate.tsx:209-215`). Home clears it too (`src/components/auth/ClaimOnLoad.tsx:46`).

### Resend and cooldown

`src/components/auth/ResendConfirmation.tsx`. Browser `resend({ type: "signup", email })` (`:40-44`). Cooldown is 30 s (`:9`), 60 s after a rate limit (`:49`). Labels: "Resend email", "Sending…", "Sent · resend in Ns", "Too many tries · wait Ns", "Couldn't send · try again" (`:57-66`). The countdown is component state only: a refresh resets it.

Server twin for the dead-link page: `resendConfirmation`, `src/app/auth/actions.ts:142-165`.

### "Use a different email"

`SaveGate.tsx:209-215` and `PlanView.tsx:387-393` → `start/page.tsx:284-288`: clears the pending note and reopens an empty form. The first, unconfirmed auth user stays (Privacy already says so, `src/app/privacy/page.tsx:145-147`).

### Emailed link: `/auth/confirm`

`src/app/auth/confirm/route.ts:39-72`. Live template link (checked by the owner 2026-11-07): `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/home`. The route's comment (`:26-27`) only says `type=…`. Server `verifyOtp({ type, token_hash })` (`:52`), then `claimSignupRecords` (metadata ids, `:56`), then `/home?saved=1` or `?expired=1` (`:59-63`). Failure goes to `/auth/link-error?kind=confirm&reason=expired` (`:69-71`). Works on any device: it doesn't depend on the browser that asked.

`/auth/callback` (`src/app/auth/callback/route.ts:18-50`) stays for Google and old PKCE emails. Not touched.

### `/login`

`src/app/login/page.tsx`: server form → `login` server action (`src/app/auth/actions.ts:22-46`). On error redirects to `/login?error=<code>`; `email_not_confirmed` becomes "Confirm your email first. The link is in your inbox." (`auth-errors.ts:13,39-40`). On success claims metadata ids (`actions.ts:38`) and redirects to `next` (default `/home`, with `?saved=1` / `?expired=1` after a claim). Middleware sends signed-in players away from `/login` and `/signup` (`src/lib/supabase/middleware.ts:71-76`).

### `/signup`

`src/app/signup/page.tsx` + `signup` server action (`actions.ts:49-76`). Old shadcn styling, `minLength={6}` (the save form uses 8). Nothing in `src` links to it (only middleware and its own redirect). It sends consent but no pending ids, and ends on `/signup?check_email=1` "Check your email for a confirmation link". Audit item M12 already says retire or restyle it.

### `/auth/link-error`

`src/app/auth/link-error/page.tsx`. Dead link → form to send a new confirmation email (`:71-90`), "Already confirmed? Sign in".

---

## 2. The claim today

### What runs, where

| Path | Claims | Code |
|---|---|---|
| Save form, session returned (confirmation off; not today's setting) | Device ids, browser RPC | `SaveGate.tsx:126` → `persistence.ts:261-265` |
| Emailed link `/auth/confirm` | Metadata ids, server | `confirm/route.ts:56` → `src/lib/claim-signup.ts:38-92` |
| `/auth/callback` | Metadata ids, server | `callback/route.ts:29` |
| **Password login** | **Yes, metadata ids, server** | `actions.ts:38`. Device ids only later, on `/home` (`ClaimOnLoad`) or `/start` |
| `/home` load | Device ids (saves missing rows first) | `ClaimOnLoad.tsx:45-64` → `persistence.ts:309-329` |
| `/start` load, signed in with a stored result | Device ids | `start/page.tsx:94-123` |
| Signed-in retake, either button | Device ids | `start/page.tsx:193-198` |

So the password login path does claim: the ids stored in the account's metadata at sign-up, on any device. The device's own copy is claimed when the player reaches `/home` or `/start` on that device.

### Device keys

`rtnr:assessment_id`, `rtnr:diagnosis_id`, `rtnr:plan_id` (`persistence.ts:30-34`); the answers in `local-result` (`clearLocalResult` / `loadLocalResult`); the pending sign-up `rtnr:signup_pending` = `{ email, at }` (`signup-pending.ts:13-19`).

### The shared save before the claim

`saveAnonymousResult` (`persistence.ts:168-182`) is one promise per set of answers. It starts when the assessment ends (`start/page.tsx:164`), saves missing rows in order with fixed ids and three attempts each (`:66-76`, `:145-157`), and resolves with all three ids or rejects. The buttons wait on it (`start/page.tsx:186`), and `SaveGate` awaits it again before `signUp` (`SaveGate.tsx:82`), so the sign-up's metadata always carries the complete set. A rejection keeps the form on screen with the generic error.

### The RPC

`claim_anonymous_records`, latest definition `supabase/migrations/20261101120000_retention_sweep_function.sql:258-302`. Security definer, needs `auth.uid()`, assigns only rows still unclaimed, returns how many of the named rows the caller holds. Both callers treat anything short of the full count as a failure: `persistence.ts:243-252` throws `ClaimIncompleteError`; `claim-signup.ts:81-84` returns `"none"` and keeps the metadata ids.

### Can it run right after `verifyOtp` on the same device?

Yes. `verifyOtp` with `{ email, token, type }` returns a session (`node_modules/@supabase/auth-js/dist/module/GoTrueClient.js:1992-2026`), and the browser client saves it to cookies right there (`_saveSession`, `:2017`). The next RPC from the same browser client reads that session from storage and runs as the new user. The device still has the ids and answers (nothing is cleared while pending, `SaveGate.tsx:135-137`), and `saveResult()` resolves at once with the stored ids.

### If verify succeeds but the claim fails

The player is signed in; the device keeps everything. This is already the rule in `claimAnonymousResult` (clears only after the full count, `persistence.ts:261-265`). The code screen should then go to `/home` without `?saved=1`, where `ClaimOnLoad` retries (`ClaimOnLoad.tsx:53`) and shows "Plan saved" only once the plan is really there. Going to `/session` without a claimed plan would bounce to `/home` anyway (`src/app/session/page.tsx:63`). The pending note is cleared (being signed in makes it false); the ids and answers are not.

---

## 3. Consent on sign-up

`consentMetadata()` (`src/lib/legal.ts:26-31`) returns `{ terms_accepted_at: now, terms_version: TERMS_VERSION }`. It is spread into `options.data` with the pending ids on the save form (`SaveGate.tsx:97-102`) and sent alone on `/signup` (`actions.ts:59`). `ConsentLine` sits under the button (`src/components/legal/ConsentLine.tsx`). The plan leaves the `signUp` call and its `options.data` exactly as they are. `verifyOtp` and `resend` send no metadata, and the claim's metadata update only nulls the three id keys (`claim-signup.ts:53-62`), so consent survives.

One existing behavior to know: when an address already has an **unconfirmed** user, a second `signUp` does not update that user (see 5b), so its consent timestamp and ids stay from the first attempt.

---

## 4. Library versions and API

Installed: `@supabase/supabase-js` 2.110.7, `@supabase/auth-js` 2.110.7, `@supabase/ssr` 0.12.3 (`package.json:13-14`), Next 14.2.35, React 18.

**`verifyOtp` type for a sign-up code: decided by test in Phase 1.** `VerifyEmailOtpParams` is `{ email, token, type: EmailOtpType }` and `EmailOtpType` includes both `'signup'` and `'email'` (`auth-js/dist/module/lib/types.d.ts:669-693`). The live link uses `type=email`, and `resend` uses `'signup'`. Phase 1 tries each on our project and keeps the one that works (`SIGNUP_CODE_TYPE`).

```ts
const { data, error } = await supabase.auth.verifyOtp({ email, token: code, type: SIGNUP_CODE_TYPE });
```

**`resend`:** `ResendParams` allows `type: 'signup' | 'email_change'` with `email` (`types.d.ts:694-703`). Current usage is already right (`ResendConfirmation.tsx:40-44`). It mints a new token, so the previous email's code and link stop working. `resend` returns no data, only an error.

**Session cookie, client vs server action.** The browser client is `createBrowserClient` (`src/lib/supabase/client.ts`), which stores the session in non-httpOnly cookies through `document.cookie` and uses `flowType: "pkce"` (`@supabase/ssr/dist/module/createBrowserClient.js:37`). PKCE only affects redirect links, not `POST /verify`, which returns the session directly. After a browser `verifyOtp`, the cookies are set before the call returns; the middleware (`src/lib/supabase/middleware.ts:24-52`) reads and refreshes them on the next request, and server actions and server components see the user. A server action would also work (cookies set via `cookieStore.set`, `src/lib/supabase/server.ts:25-29`, as `login` does today).

**Recommendation: call `verifyOtp` from the browser**, like `signUp` and `resend` already are on this screen. Supabase rate-limits token checks per IP. From the browser that is the player's IP; from a server action every player shares Vercel's outgoing IPs, so one person guessing codes could use up everyone's allowance. Then call one small server action to claim the metadata ids (see Phase 1). That action reads the session from the cookies the browser just set.

---

## 5. Edge cases

**(a) Email already has a confirmed account.** With confirmations on, GoTrue answers 200 with an obfuscated user whose `identities` is `[]`, no session, and sends no email. The code already detects this (`SaveGate.tsx:116`). New behavior: neutral inline message plus "Log in" (Phase 2). Trade-off: telling a visitor "you already have an account" confirms that an address is registered (enumeration). Owner's decision: show it.

**(b) Email exists but unconfirmed.** GoTrue treats it as a new sign-up from the client's view: `identities` is non-empty, no session, and it sends a fresh confirmation email (a new code; the old one dies). It does **not** update the existing user, so the password and metadata (ids, consent) stay from the first attempt. Consequences:
- The code screen is right: the new email has a valid code.
- If the player typed a different password this time, the account keeps the first one. They are signed in after the code, and "Forgot password" fixes it later. See open question 4.
- If the first attempt was a different result (another device, or before "Start over"), the metadata names those older rows. The device claim after verify still claims this device's rows; the server claim also claims the older ones. Same as today.
- Inside the minimum interval (default 60 s) GoTrue returns 429 `over_email_send_rate_limit`, which shows today as "Too many attempts. Wait a few minutes and try again." Phase 1 should route this case to the code screen instead, because an email went out under a minute ago (open question 5).

**(c) Password login, unconfirmed.** GoTrue checks the password first; `email_not_confirmed` only comes back when the password is right, so routing on it reveals nothing new. Today: `/login?error=unconfirmed`, "Confirm your email first. The link is in your inbox." (`actions.ts:31-33`, `auth-errors.ts:13`). Proposal (Phase 2): send a fresh code (`resend` type `signup`) and show the code screen in place, with the email already known. After verify: claim the metadata ids and continue to `next`.

**(d) Wrong code, expired code, too many attempts.**
- GoTrue returns the same error for wrong and expired: 403, code `otp_expired`, "Token has expired or is invalid". The client cannot tell them apart. Decided (owner, 2026-11-07): no time-based guess. One message, `code_failed`: "That code didn't work or has expired.", with the Resend control right under it. A code from an email replaced by a resend reads the same.
- A code longer or shorter than 6 never reaches the server: the field only submits at exactly 6 digits.
- Too many attempts: GoTrue has no per-code lockout; it limits token checks per IP (Auth > Rate Limits, default 30 per 5 minutes) and answers 429 `over_request_rate_limit`. Show the existing `rate_limited` copy: "Too many attempts. Wait a few minutes and try again."
- Network failure or 5xx: the existing generic line.

**(e) Refresh, or leaving and coming back.** The pending email survives in localStorage. `/start` reloads into the plan with `PendingStatus` (`start/page.tsx:133`, `PlanView.tsx:113-115`); tapping Start session or Save my plan reopens `SaveGate`, which shows the code screen because `pendingEmail` is set. The resend countdown should be computed from `at` (60 s minus elapsed), so a refresh does not reset it. Two more cases:
- The link opened in another tab on the same device signs the player in on the server and lands on `/home`, which claims and clears. The original tab's code screen doesn't know. Proposal: on `visibilitychange` / `focus`, call `signedInStatus()` (`persistence.ts:286-296`); if "yes", claim and continue as if the code had been entered.
- The link opened on another device: that device is signed in and the metadata ids are claimed. This device is not signed in, and its code is now spent ("That code didn't work"). The way out is logging in here; `/home` then clears the device copy (its rows are already the player's, so the RPC returns 3). See open question 3 for a "Log in" escape on the code screen.

Unconfirmed for more than 30 days: `/start` load finds the rows gone, clears the device and the pending note (`start/page.tsx:75-86`), so the code screen never shows. If the server claim after verify still answers `expired`, clear the device and go to `/home?expired=1`.

**(f) Signed-in player retaking on `/start`.** Unchanged and must stay so: both buttons claim directly and go to `/session` or `/plan` without opening `SaveGate` (`start/page.tsx:188-198`), and the pending note is cleared on load (`:130`). The code screen is only reachable through `SaveGate`, so the retake path never sees it. Phase 1 re-checks this.

---

## 6. Supabase dashboard settings (owner changes by hand)

Do these **before** Phase 1 is deployed, and before testing it locally, since there is one project. The new email is backwards compatible: today's production screen says "open the link", and the link stays in the email. The reverse order (code screen live, old email with no code) would strand every new sign-up.

| Setting | Where (Supabase dashboard) | Value |
|---|---|---|
| Confirm email | Authentication > Sign In / Providers > Email | On (unchanged) |
| Email OTP length | same page | **6**. If it is 8 today, the code field and copy break; check first |
| Email OTP expiration | same page | **3600 s (1 hour)**. The link uses the same token, so this is also the link's lifetime. Not mirrored in code (no time-based error copy) |
| Minimum interval between emails | Authentication > Rate Limits (per-user email frequency) | **60 s**, to match the Resend countdown |
| Emails per hour | Authentication > Rate Limits | Check it. On Supabase's built-in SMTP it is very low (a few per hour across the whole project), which would block real sign-ups and the test plan. Whether SMTP is set to Resend isn't recorded in the repo (`audit/legal-inventory.md:265`) |
| Token verifications | Authentication > Rate Limits | Default (30 per 5 min per IP) is fine |
| Confirm signup template | Authentication > Emails > Confirm signup | Below |

### Confirm signup template

Subject:

```
{{ .Token }} is your Road to Next Rating code
```

Body (plain, light background for mail clients, system fonts, no em dashes):

```html
<div style="max-width:480px;margin:0 auto;padding:32px 16px;background:#ffffff;color:#131315;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <p style="margin:0 0 12px;font-size:16px;line-height:1.5;">
    Your code to finish creating your Road to Next Rating account:
  </p>
  <p style="margin:0 0 12px;font-family:'SFMono-Regular',Menlo,Consolas,'Courier New',monospace;font-size:36px;font-weight:600;letter-spacing:8px;line-height:1.2;">
    {{ .Token }}
  </p>
  <p style="margin:0 0 28px;font-size:16px;line-height:1.5;">
    Enter it on the screen where you signed up. It expires in 1 hour.
  </p>
  <p style="margin:0 0 4px;font-size:15px;line-height:1.5;color:#55555a;">
    Or open this link:
  </p>
  <p style="margin:0 0 28px;font-size:15px;line-height:1.5;">
    <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/home" style="color:#131315;text-decoration:underline;">Confirm my account</a>
  </p>
  <p style="margin:0;font-size:15px;line-height:1.5;color:#55555a;">
    If you didn't sign up, you can ignore this email.
  </p>
</div>
```

Notes: the link is the live template's, unchanged (`type=email&next=/home`; this section said `type=signup` until the owner checked, 2026-11-07). The owner set OTP length 6, expiry 3600 and this template on 2026-11-07. The code and the link are one token, so using either spends both. "1 hour" must match the expiry setting. The link always opens `{{ .SiteURL }}` (production), even for a sign-up made on localhost.

---

## 7. Implementation, one commit per phase

Branch `signup-otp` (new copy the owner hasn't read). Engine, scoring, stories, readiness: untouched. Design for every screen: dark, optic only on the primary button, Instrument Sans body ≥16px, inputs 16px, IBM Plex Mono for the code field, hairlines, nothing centered, no em dashes.

### Phase 1: code screen, verify, claim, resend

Files:
- `src/components/auth/CodeEntry.tsx` (new). Props: `email`, `sentAt`, `onVerified`, `onChangeEmail`. Built in the decided layout from the start (it is new, so nothing to redo in Phase 3):
  - h1 "Enter the code we emailed"; line "Sent to {email} · Change email" (Change email is a text button).
  - One `<input type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]*">`, `font-mono`, about 28px, `tracking-[0.3em]`, `tabular-nums`, `aria-label="6-digit code"`, autofocus. No `maxLength`, so a pasted "123 456" or "123-456" works: `onChange` keeps digits only, first 6. At 6 digits it submits once (guarded, disabled while checking). On error the digits are selected so typing replaces them.
  - Errors under the field, `role="alert"`: `code_failed` "That code didn't work or has expired." (section 5d), with the Resend control right under it / existing `rate_limited` / existing `generic`.
  - "Resend code" text button, 60 s countdown from `sentAt` ("Resend code in 42s", tabular-nums). A successful resend re-saves `signup_pending` with a new `at` and clears the error.
  - On `focus` / `visibilitychange`: if `signedInStatus()` is "yes", call `onVerified()` (the link was opened in another tab).
- `src/components/auth/ResendConfirmation.tsx`: becomes the countdown control used above (60 s, label "Resend code", time from a `sentAt` prop), or is replaced by it. `PlanView`'s `PendingStatus` uses the same control.
- `src/lib/signup-pending.ts`: `saveSignupPending(email)` already stamps `at`; add a `touchSignupPending()` (or call save again) for resends. No new keys.
- `src/app/auth/actions.ts`: new `claimMySignup()` server action: `getUser()` from cookies, `claimSignupRecords(supabase, user)`, returns `"none" | "claimed" | "expired"`. Never throws (the helper never does).
- `src/components/auth/SaveGate.tsx`: replace the "Check your inbox" branch (`:175-228`) with `<CodeEntry>`. `onVerified`:
  1. `const ids = await saveResult()` (resolves at once from storage);
  2. `await claimMySignup()` (metadata ids; clears them); if `"expired"`, `clearDeviceResult()` and go to `/home?expired=1`;
  3. `await claimAnonymousResult(ids)` (device ids; the RPC is a no-op for rows already claimed in step 2 and returns 3, then the device is cleared);
  4. `clearSignupPending()`, then `window.location.assign(reason === "session" ? "/session" : "/plan")`.
  5. If step 3 throws: `clearSignupPending()` only, go to `/home` (no `?saved=1`); `ClaimOnLoad` retries.
- `SaveGate` signUp handling: a 429 `over_email_send_rate_limit` on sign-up goes to the code screen for that address (open question 5).
- Copy constants: add `code_failed: "That code didn't work or has expired."` to `src/lib/auth-errors.ts`. Mirror `RESEND_COOLDOWN_SECONDS = 60` next to it with a comment naming the dashboard setting. No expiry constant.
- Unchanged on purpose: the `signUp` call and its `options.data`, `/auth/confirm`, `/auth/callback`, `claim-signup.ts`, the RPC, `persistence.ts`.

Verify:
- `npx tsc --noEmit`, `npm run lint`, `npm run build`.
- Real flows with test addresses (section 8): new sign-up via Start session lands on `/session` with the plan; via Save my plan lands on `/plan`. After each: `status <user id>` shows 1 assessment, 1 diagnosis, 1 plan; localStorage has no `rtnr:` ids, answers or pending note; `user_metadata` has no `pending_*` keys and still has `terms_accepted_at` / `terms_version`.
- Paste with spaces; wrong code; code from an email replaced by a resend; resend countdown survives a refresh; rate-limit message (repeat wrong codes until 429).
- Claim failure: block the RPC request in the pane's devtools (or make it fail) after verify: lands on `/home`, signed in, device still holds the ids; unblock, reload: "Plan saved".
- Link in a second tab of the same browser: the code tab notices on focus and continues.
- Signed-in retake on `/start` (with `/test-user`): both buttons still skip the form.
- `/verify` screenshots at 375 and 1440 of the code screen (empty, error, countdown).

### Phase 2: existing accounts and unconfirmed log-ins

- **Existing confirmed email** (`SaveGate.tsx:116-120`): instead of the red alert, a neutral block under the fields (hairline above, `text-ink`, `role="status"`): "You already have an account with this email." and a full-width "Log in" button. While the block shows, "Log in" takes the optic and "Create account" turns secondary (one accent per screen). Editing the email field hides the block.
- **Inline log-in view in `SaveGate`** (a third view, beside form and code): h1 "Log in", the email pre-filled, password with Show/Hide, optic "Log in", "Forgot password?" (to `/forgot-password`), "Back" (to the form). Same behavior whether opened from the existing-email block or the top-right link (Phase 3). Submit: browser `signInWithPassword` (per-IP limit, like sign-up), then the same `onVerified` steps 1 to 5 as Phase 1. The plan becomes the account's current plan, like a signed-in retake does today (open question 6).
  - `invalid_credentials`: existing `credentials` copy.
  - `email_not_confirmed`: browser `resend({ type: "signup" })`, `saveSignupPending(email)`, show `CodeEntry`.
- **`/login` page, unconfirmed**: move the form into a client component. The `login` server action returns `{ unconfirmed: email }` for `email_not_confirmed` instead of redirecting (other errors keep redirecting). The client then calls browser `resend`, and shows `CodeEntry` in place. After verify: `claimMySignup()`, then `next` (default `/home`, with `?saved=1` / `?expired=1` as `login` does). The email stays in component state, never in the URL. If this device holds an anonymous result, `/home`'s `ClaimOnLoad` claims it as today.
- **`/signup`**: redirect to `/start` (open question 7). Otherwise it would keep promising a link-only email and have no code screen.
- `AUTH_ERRORS.unconfirmed` stops being shown on `/login`; keep the key for old URLs.

Verify: tsc, lint, build. Existing confirmed address on the save form: message, Log in with the right password lands on `/session` or `/plan` with the new plan claimed; wrong password shows the error; Forgot password round trip ends on `/home` with the plan claimed by `ClaimOnLoad`. Unconfirmed address: re-sign-up gets a code that works; log-in on `/login` and on the inline view both reach the code screen and continue. Retake path still skips the form. `/verify` at 375 and 1440 on the message, the log-in view and `/login`'s code state.

### Phase 3: save form and remaining copy

Save form (`SaveGate.tsx:231-381`) rebuilt to the decided layout:
- Top row: small text link "Log in" at the right (opens the inline log-in view).
- h1 "Save your plan"; one line: "Free account. Your plan and session numbers stay with you."
- One grouped field block: Email row, hairline, Password row with Show/Hide. Each row keeps a visible label inside the block (mono, uppercase, e.g. EMAIL / PASSWORD) so the label doesn't vanish when typed over. Inputs 16px.
- Optic full-width "Create account" directly under the block ("Creating account…" while busy).
- `ConsentLine` unchanged.
- "Not now" as a quiet, left-aligned text link.

Removed from this form:
1. The mono label "Save your plan" (`:234-236`); its words become the h1.
2. h1 "Keep what you just found." (`:237-239`).
3. Both reason paragraphs, including the "Start session" variant "Sessions need a free account…" (`:246-258`). `reason` still picks `/session` vs `/plan` after verify.
4. The "Your plan" card with the dot, skill and weeks (`:262-270`). `bottleneckTitle` and `weeksTarget` props go unused; drop them.
5. The Google button and OR divider (`:283-301`, flag off today) and `handleGoogle` (`:144-172`) from this form (open question 8).
6. The separate field labels above each input (`:307-310`, `:323-326`), replaced by the in-block labels.
7. The password hint paragraph "At least 8 characters." (`:350-352`); `minLength={8}` stays, and the hint moves into the password placeholder ("8+ characters").
8. Button label "Create account & save plan" (`:360`) → "Create account".
9. Bottom "Already have an account? Sign in" (`:374-379`).
10. Centering on "Not now" (`:369`); the design rule allows centering only on the reveal.

Also in Phase 3:
- `PendingStatus` (`PlanView.tsx:379-409`): "Enter the code we sent to {email} to finish saving your plan." with an "Enter code" text button that opens the code screen, the countdown resend, "Change email", and the log-in escape if open question 3 is yes.
- `/auth/link-error`: "a new link is on its way" (`:48`) → "a new code and link are on their way"; button "Send a new confirmation link" (`:88`) → "Send a new code".
- "Sign in" → "Log in" wherever a player sees it (open question 9): `/login` button, `PendingStatus`, `/auth/link-error`.
- Docs: `Design/DESIGN_SYSTEM.md` save-gate and check-inbox sections; `docs/STATUS.md`.

Verify: tsc, lint, build, `/verify` at 375 and 1440 for the form (empty, error, existing-email block), code screen, log-in view, plan with a pending sign-up. Reviewer subagent on the diff. Read every new line aloud for em dashes and 16px.

---

## 8. Test plan

One Supabase project, so every test touches production auth. Rules:
- Fresh addresses only, all on the owner's inbox with a plus tag: `<owner>+rtnr-otp-NN@gmail.com`. Never a real player's address. No address reused across phases.
- Local app (`preview_start dev`). The email link opens production (`{{ .SiteURL }}`), which is fine: `/auth/confirm` there runs the same code.
- Record every anonymous result with `test-user.mjs anon` before signing up (the `/test-user` skill's step 4).
- Emails: the owner reads the code from their inbox and types or relays it (open question 10).
- Watch the hourly email limit; space the runs.

| # | Address | Viewport | Case |
|---|---|---|---|
| 1 | `+rtnr-otp-01` | 375 | New sign-up from Start session, type the code, lands on `/session` |
| 2 | `+rtnr-otp-02` | 1440 | New sign-up from Save my plan, paste the code with a space, lands on `/plan` |
| 3 | `+rtnr-otp-03` | 375 then other browser | Sign up in the pane at 375; open the email link in a second browser with no cookies (Chrome, or the owner's laptop). Link lands on `/home` signed in with the plan. Back on the pane: code reads "That code didn't work"; log in there; `/home` claims, device cleared, still one plan |
| 4 | `+rtnr-otp-02` again | 375 | New anonymous result, sign up with the confirmed address: existing-account block, Log in, lands on `/session` or `/plan`, account now has 2 diagnoses, the new one current |
| 5 | `+rtnr-otp-05` | 375 | Sign up, leave; sign up again with a different password: code works; check which password logs in (expect the first) |
| 6 | `+rtnr-otp-06` | 1440 | Sign up, leave the code screen; `/login` with the right password: code screen, verify, `/home` with "Plan saved" |
| 7 | `+rtnr-otp-07` | 375 | Wrong code; code from a replaced email; repeated wrong codes until 429; refresh mid-countdown |
| 8 | `+rtnr-otp-08a`, `-08b` | 375 | Change email: 08a stays unconfirmed, 08b verifies and gets the plan |
| 9 | `rtnr-test+…@example.com` (`/test-user`) | 375 | Signed-in retake on `/start`: both buttons skip the form |
| 10 | `+rtnr-otp-10` | 375 | Link opened in a second tab of the same browser: the code tab continues on focus |
| 11 | (any above) | 375 | Claim failure: block the RPC after verify, lands on `/home`, unblock, "Plan saved" |

### Users to delete afterwards

`+rtnr-otp-01`, `-02`, `-03`, `-05`, `-06`, `-07`, `-08a`, `-08b`, `-10`, plus the `/test-user` user from row 9.

`test-user.mjs cleanup` only resolves `rtnr-test+` addresses (`.claude/skills/test-user/scripts/test-user.mjs:11,47-53`), so it refuses these. Options: delete confirmed ones in the app at `/settings/delete` and unconfirmed ones (08a, and any left unverified) in the Supabase dashboard under Authentication > Users; or let Phase 1 add a second allowed prefix to the helper, read from `.env.local` (open question 11). Either way, then run `status <user id>` for each (works by id after deletion), `anon-cleanup`, and `list`. Delete users before `anon-cleanup`: rows claimed by a plus-tag user look like a real account to the helper and would be refused.

---

## 9. Open questions, each with a recommendation

Answered 2026-11-07: every recommendation below accepted, except question 12's expiry now has no copy depending on it (see 5d).

1. **`verifyOtp` in the browser or a server action?** Browser, then a small server action to claim the metadata ids. Keeps Supabase's per-IP limit on the player's IP.
2. **Code screen: keep a primary "Continue" button as well as auto-submit?** Yes. Optic, full width, disabled until 6 digits, "Checking…" while busy. Enter works, a failed auto-submit has a visible retry, and the screen has its one accent.
3. **Code screen: a log-in escape for "I opened the link on my laptop"?** Yes, one quiet line under Resend: "Already confirmed? Log in", opening the inline log-in view. Without it the phone is stuck on a spent code.
4. **Re-sign-up on an unconfirmed address with a new password:** set the new password after the code? No. Leave GoTrue's behavior; Forgot password covers it. Setting it would mean holding the password in memory through the code screen.
5. **Sign-up hits the 60 s email interval (429) on an unconfirmed address:** show the code screen anyway? Yes, with the countdown running. An email went out under a minute ago. Other 429s keep the error.
6. **Log in from the save form makes the new result the account's current plan without asking.** Accept: the player chose "Save your plan", and the signed-in retake already does the same.
7. **`/signup`:** redirect to `/start`. Nothing links to it, it has no pending ids, and it would need its own code screen.
8. **Google on the save form:** remove the hidden button and `handleGoogle` now; redesign when Google is switched on.
9. **"Sign in" vs "Log in":** "Log in" everywhere a player reads it (M5, one name per concept).
10. **Reading test codes:** the owner relays each code in chat. The alternative is letting Claude read the inbox in Chrome, which is more access than this needs.
11. **Test cleanup:** add an env-configured second prefix to `test-user.mjs` in Phase 1 so plus-tag users can be listed and deleted by the helper. Small tooling change, saves dashboard clicks and makes the cleanup provable.
12. **OTP expiry:** 1 hour. Long enough for the link fallback across devices; shorter makes the link fragile, longer gives more time to guess a code.
13. **Mono labels inside the grouped field block, or placeholders only?** Mono labels. A placeholder-only label disappears when the player goes back to check what they typed (the existing comment at `SaveGate.tsx:305-307`).

---

## Codex review

One review of the whole `signup-otp` branch after Phase 3 (owner, 2026-11-07); the `reviewer` subagent runs at the end of each phase instead. Points to look at: the claim order after verify and its failure path; the existing-account message (enumeration, accepted); the code field's submit guard; per-IP rate limits with browser vs server calls; `/login`'s new non-redirect result; the dashboard settings being applied before deploy.

## What this means

A one-time code and the confirmation link are two ways of handing back the same secret Supabase put in the email. Today the player must leave the app to click the link; with the code they type it into the screen they are already on, so the app signs them in right there and can attach their plan straight away. The link stays in the email as a backup and still works from any device.
