-- ============================================================================
-- TEST-DATA SEED — Progress "logged sessions" series
-- ============================================================================
-- Gives a real test account enough scored drill_sessions to render the enriched
-- Progress readiness chart — the subordinate "YOUR LOGGED SESSIONS" series —
-- with a believable improving trend (result_value 4 → 8 over ~18 days).
--
-- Target account: blackpanther6161@outlook.com
--
-- HOW TO RUN
--   Paste into the Supabase SQL Editor for THIS project. It runs as a
--   privileged role that bypasses RLS, so it can read auth.users and write on
--   the account's behalf. Run the sections top to bottom.
--
-- SAFETY
--   • All synthetic rows are tagged notes = 'seed:test-progress' so Section 5
--     can delete exactly what this added and nothing else.
--   • The seed insert is idempotent — re-running won't duplicate (unique index
--     on plan+drill+UTC-day). Nothing here is destructive.
--
-- PREREQUISITES for the enriched chart to be VISIBLE (checked in Section 0):
--   1. The account needs 2+ diagnoses (at least one re-test) — the readiness
--      chart, and therefore the session series under it, only renders once
--      there is re-test history. Section 4 can synthesize a re-test if needed.
--   2. To see it UN-blurred (the paid "full" view, not the locked/blurred
--      teaser), subscription_status must be 'active' — Section 3.
-- ============================================================================


-- ── Section 0 — DIAGNOSTICS · run first to see the account's state ──────────
select
  u.id as user_id,
  (select count(*) from public.diagnoses d where d.user_id = u.id) as diagnosis_count,
  p.subscription_status,
  (select d.bottleneck from public.diagnoses d
     where d.user_id = u.id order by d.created_at desc limit 1) as current_bottleneck,
  (select pl.id from public.plans pl
     where pl.user_id = u.id order by pl.created_at desc limit 1) as current_plan_id
from auth.users u
join public.profiles p on p.id = u.id
where lower(u.email) = lower('blackpanther6161@outlook.com');
--  diagnosis_count < 2  → chart won't render yet; run Section 4.
--  subscription_status != 'active' → chart shows blurred; run Section 3.


-- ── Section 1 — SEED the scored sessions ───────────────────────────────────
-- Picks the primary drill of the account's CURRENT bottleneck (same drill set
-- the Progress page reads), then logs 6 sessions on distinct days with an
-- improving result_value. No-op if the account has no plan/diagnosis yet.
with usr as (
  select id as user_id
  from auth.users
  where lower(email) = lower('blackpanther6161@outlook.com')
),
pl as (
  select p.id as plan_id
  from public.plans p
  join usr on usr.user_id = p.user_id
  order by p.created_at desc
  limit 1
),
dg as (
  select d.bottleneck
  from public.diagnoses d
  join usr on usr.user_id = d.user_id
  order by d.created_at desc
  limit 1
),
drill as (
  -- Bottleneck skill → its primary drill id (matches src/lib/drills.ts).
  select case (select bottleneck from dg)
    when 'third_shot_drop' then 'drop_basket'
    when 'reset'           then 'reset_ladder'
    when 'net_defense'     then 'speedup_defense'
    when 'dink_patience'   then 'dink_50'
    else 'drop_basket'     -- sensible default if bottleneck is unset
  end as drill_id
),
seed(days_ago, val) as (
  values (18, 4), (15, 5), (11, 5), (8, 6), (4, 7), (1, 8)
)
insert into public.drill_sessions
  (plan_id, user_id, drill_id, result_value, completed_at, notes)
select
  pl.plan_id,
  usr.user_id,
  drill.drill_id,
  seed.val,
  -- 18:00 UTC on (today_utc - days_ago), so each row lands on its own UTC day.
  (((( now() at time zone 'utc')::date - seed.days_ago)::timestamp
      + interval '18 hours') at time zone 'UTC'),
  'seed:test-progress'
from usr, pl, drill, seed
on conflict (plan_id, drill_id, ((completed_at at time zone 'utc')::date))
do nothing;


-- ── Section 2 — VERIFY what got seeded ─────────────────────────────────────
select ds.drill_id, ds.result_value,
       (ds.completed_at at time zone 'utc')::date as utc_day
from public.drill_sessions ds
join auth.users u on u.id = ds.user_id
where lower(u.email) = lower('blackpanther6161@outlook.com')
  and ds.notes = 'seed:test-progress'
order by ds.completed_at;
-- Expect 6 rows, values 4,5,5,6,7,8 on six different days.


-- ── Section 3 (OPTIONAL) — unblur the paid "full" Progress view ─────────────
-- Only if Section 0 showed subscription_status != 'active'.
-- update public.profiles set subscription_status = 'active'
--   where lower(email) = lower('blackpanther6161@outlook.com');
-- Revert when done:
-- update public.profiles set subscription_status = 'free'
--   where lower(email) = lower('blackpanther6161@outlook.com');


-- ── Section 4 (OPTIONAL) — force the chart to render (needs 2+ diagnoses) ────
-- Run ONLY if Section 0 showed diagnosis_count = 1. Clones the existing baseline
-- diagnosis into a synthetic "re-test" with a higher readiness, dated now(), so
-- the readiness line has two points. Purely test data.
-- insert into public.diagnoses
--   (assessment_id, user_id, bottleneck, runners_up, root_cause, story_id,
--    readiness, skill_scores, created_at)
-- select d.assessment_id, d.user_id, d.bottleneck, d.runners_up, d.root_cause,
--        d.story_id, least(coalesce(d.readiness, 58) + 16, 100), d.skill_scores, now()
-- from public.diagnoses d
-- join auth.users u on u.id = d.user_id
-- where lower(u.email) = lower('blackpanther6161@outlook.com')
-- order by d.created_at desc
-- limit 1;
--
-- Then (optional) backdate the baseline so the span reads in weeks, not hours:
-- update public.diagnoses set created_at = now() - interval '20 days'
-- where id = (
--   select d.id from public.diagnoses d
--   join auth.users u on u.id = d.user_id
--   where lower(u.email) = lower('blackpanther6161@outlook.com')
--   order by d.created_at asc limit 1
-- );


-- ── Section 5 (OPTIONAL) — CLEANUP: remove everything this script seeded ─────
-- delete from public.drill_sessions ds
-- using auth.users u
-- where ds.user_id = u.id
--   and lower(u.email) = lower('blackpanther6161@outlook.com')
--   and ds.notes = 'seed:test-progress';
-- (If you ran Section 4, also delete the synthetic diagnosis you created and
--  restore the baseline's created_at — those aren't tagged, so remove by id.)
