-- One re-test reminder per plan.
--
-- The cron claims a plan with a conditional update (set this column where it is
-- null) before it sends, so a rerun or a second delivery finds nothing to claim.
-- A failed send clears it again, so the next day's run retries while the date is
-- still in the window (the re-test date or up to 2 days after it).
--
-- Additive and nullable. Code running today ignores the column. Run this BEFORE
-- merging the code: without the column the re-test pass logs it and sends nothing.
-- No backfill: old plans are outside the window, so the first run can't email them.
--
-- Before, read-only:
--
--   1. The column isn't there yet (expect 0):
--
--   select count(*) from information_schema.columns
--   where table_schema = 'public' and table_name = 'plans'
--     and column_name = 'retest_reminder_sent_at';
--
--   2. Total plans. Note the number and compare after:
--
--   select count(*) from public.plans;
--
--   3. Roughly who the first run can email, if it ran today: each player's newest
--      plan, active, date in the window, re-test reminders on. Read it as the size
--      of the first send:
--
--   select count(*) as first_send
--   from public.plans p
--   join public.profiles pr on pr.id = p.user_id
--   where p.status = 'active'
--     and p.retest_date between (now() at time zone 'utc')::date - 2
--                           and (now() at time zone 'utc')::date
--     and pr.retest_reminder_enabled
--     and pr.email is not null
--     and p.created_at = (select max(n.created_at) from public.plans n where n.user_id = p.user_id);
--
-- After:
--
--   4. The column exists, is a nullable timestamptz (expect one row:
--      timestamp with time zone, YES):
--
--   select data_type, is_nullable from information_schema.columns
--   where table_schema = 'public' and table_name = 'plans'
--     and column_name = 'retest_reminder_sent_at';
--
--   5. Nothing is marked sent, and the plan count matches check 2 (expect
--      marked = 0):
--
--   select count(*) as plans, count(retest_reminder_sent_at) as marked from public.plans;

alter table public.plans
  add column retest_reminder_sent_at timestamptz;

comment on column public.plans.retest_reminder_sent_at is
  'When the re-test reminder for this plan was claimed for sending. Null: not sent.';
