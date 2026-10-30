-- Lock profiles to the reminder toggles; drill sessions only on your own plan.
--
-- 1. profiles. The "profiles: update own" policy lets a signed-in player
--    update every column of their own row through the REST API, including
--    subscription_status, plan_type, renews_at, stripe_customer_id,
--    stripe_subscription_id and email. That is a free upgrade to paid, and a
--    way to point Settings' cancel/resume at someone else's subscription.
--    RLS picks rows, not columns, so the fix is column privileges: players
--    keep UPDATE on the two reminder toggles only. Every other write goes
--    through the service role (src/lib/billing.ts, src/app/paywall/actions.ts),
--    which bypasses these grants. The signup and email-sync triggers are
--    SECURITY DEFINER and are unaffected. The policy itself stays.
--
-- 2. drill_sessions. "drill_sessions: insert own" checks only user_id, so a
--    player could log a session against another player's plan_id. The insert
--    now also requires the plan to be the caller's. A null plan_id is
--    rejected (the app always sends one).
--
-- The code works before and after this runs: no app path writes a profiles
-- column other than the two toggles with the user's own client, and
-- recordDrillSession already checks plan ownership before inserting.
--
-- Pre-check, read-only, run before:
--
--   1. Players can update every profiles column (expect one row per column,
--      grantee authenticated, and the same for anon):
--
--   select grantee, column_name from information_schema.column_privileges
--   where table_schema = 'public' and table_name = 'profiles'
--     and privilege_type = 'UPDATE' and grantee in ('anon', 'authenticated')
--   order by grantee, column_name;
--
--   2. Existing drill sessions on someone else's plan (expect 0; the policy
--      only checks new rows, so any found are history to review by hand):
--
--   select count(*) from public.drill_sessions ds
--   left join public.plans p on p.id = ds.plan_id
--   where p.id is null or p.user_id is distinct from ds.user_id;
--
-- After:
--
--   1. Only the two toggles, only for authenticated (expect exactly 2 rows:
--      authenticated drill_reminder_enabled, authenticated
--      retest_reminder_enabled):
--
--   select grantee, column_name from information_schema.column_privileges
--   where table_schema = 'public' and table_name = 'profiles'
--     and privilege_type = 'UPDATE' and grantee in ('anon', 'authenticated')
--   order by grantee, column_name;
--
--   2. No table-wide UPDATE left (expect 0):
--
--   select count(*) from information_schema.table_privileges
--   where table_schema = 'public' and table_name = 'profiles'
--     and privilege_type = 'UPDATE' and grantee in ('anon', 'authenticated');
--
--   3. The insert policy checks plan ownership (expect one row whose
--      with_check contains "plans" and "auth.uid()"):
--
--   select policyname, cmd, roles, with_check from pg_policies
--   where schemaname = 'public' and tablename = 'drill_sessions' and cmd = 'INSERT';

-- 1. profiles: column-level UPDATE for the reminder toggles only.
-- Revoking the table privilege also revokes every column privilege.
revoke update on public.profiles from anon, authenticated;
grant update (retest_reminder_enabled, drill_reminder_enabled)
  on public.profiles to authenticated;

-- 2. drill_sessions: the plan must be the caller's too.
drop policy if exists "drill_sessions: insert own" on public.drill_sessions;
create policy "drill_sessions: insert own"
  on public.drill_sessions for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.plans p
      where p.id = drill_sessions.plan_id and p.user_id = auth.uid()
    )
  );
