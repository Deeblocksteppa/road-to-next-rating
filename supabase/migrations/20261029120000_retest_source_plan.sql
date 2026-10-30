-- One re-test result per plan.
--
-- submitRetest had no guard against a double submit: two calls that both
-- passed the re-test gate each wrote an assessment, a diagnosis and a new
-- plan. A re-test's new plan now records the plan the re-test was taken
-- against (`source_plan_id`), and a unique index lets only one plan claim a
-- given source. The index includes user_id: the insert policy lets a player
-- write any source_plan_id on their own rows, and without user_id a row
-- pointing at someone else's plan would block that player's re-test. The action (src/lib/retest-save.ts) treats a conflict as
-- "already done": the losing call deletes its own assessment (its diagnosis
-- goes with it, by cascade) and returns the winning call's diagnosis id.
--
-- The guard sits on the plan, not the diagnosis, because a re-test result is
-- only complete once its plan exists: a submit that failed before its plan
-- landed has claimed nothing, so a retry still works.
--
-- No backfill. Plans created before this migration keep a null
-- source_plan_id, and nulls never conflict in a unique index, so the index
-- cannot fail on existing data. The code works before and after this runs:
-- without the column it saves the plan without it (no guard).
--
-- Pre-check, read-only, run before:
--
--   1. The column isn't there yet (expect 0):
--
--   select count(*) from information_schema.columns
--   where table_schema = 'public' and table_name = 'plans' and column_name = 'source_plan_id';
--
--   2. Past double submits: two or more re-test plans taken against the same
--      earlier plan (the user's newest plan created before the re-test's
--      diagnosis). Expect no rows. Any rows are history the index does not
--      touch (their source_plan_id stays null); review them by hand. A funnel
--      result claimed into an account that already had a plan can also show
--      here; its diagnosis_ids tell it apart.
--
--   with retest_plans as (
--     select p.id, p.user_id, p.created_at, p.diagnosis_id,
--       (select prev.id from public.plans prev
--         where prev.user_id = p.user_id and prev.created_at < d.created_at
--         order by prev.created_at desc limit 1) as source_plan_id
--     from public.plans p
--     join public.diagnoses d on d.id = p.diagnosis_id
--     where p.user_id is not null
--   )
--   select user_id, source_plan_id, count(*) as new_plans,
--     array_agg(id order by created_at) as plan_ids,
--     array_agg(diagnosis_id order by created_at) as diagnosis_ids
--   from retest_plans
--   where source_plan_id is not null
--   group by user_id, source_plan_id
--   having count(*) > 1;
--
-- After: the column and index exist (expect 1 and 1):
--
--   select count(*) from information_schema.columns
--   where table_schema = 'public' and table_name = 'plans' and column_name = 'source_plan_id';
--   select count(*) from pg_indexes
--   where schemaname = 'public' and indexname = 'plans_one_retest_per_source';

alter table public.plans
  add column source_plan_id uuid references public.plans (id) on delete set null;

comment on column public.plans.source_plan_id is
  'The plan this plan''s re-test was taken against. Null for a first plan from the funnel and for plans made before 20261029120000.';

create unique index plans_one_retest_per_source on public.plans (user_id, source_plan_id);
