-- The retention sweep's checks and deletes in one transaction, and a claim that
-- says how many rows the caller ended up with.
--
-- 1. retention_sweep(p_dry_run). The sweep used to read in one request and delete
--    in later ones, so a claim or a child row landing between them could lose data
--    or leave a partial set. Now it locks, re-checks and deletes in one transaction:
--
--    - It locks top down: assessments, then diagnoses, then plans, the order
--      claim_anonymous_records updates them, so the two can't deadlock.
--    - FOR UPDATE conflicts with a claim's UPDATE and with the FOR KEY SHARE an
--      insert takes on its parent row. A claim or child insert already running makes
--      the sweep wait, and it sees the result: each statement of this function reads
--      a fresh snapshot (READ COMMITTED). One arriving after the lock waits for the
--      sweep to commit, then finds the row kept, or finds it gone: 0 rows for a claim,
--      a foreign key error for an insert.
--    - Every condition is re-checked after the locks: unclaimed, under 30 days old
--      nowhere in the set, no claimed row and no drill session below. Deletes go
--      bottom up.
--    - The 30-day cutoff applies to every set. A row named in an unconfirmed user's
--      pending metadata gets no shorter limit.
--
--    Auth users can't be deleted here: that is the admin API's job. The function
--    returns the ids of unconfirmed users still eligible, and src/lib/retention.ts
--    reads each one fresh before deleting it. Only `p_dry_run = false` deletes
--    anything; true or null counts and changes nothing. service_role only.
--
-- 2. claim_anonymous_records now returns how many of the named rows belong to the
--    caller after the call, counting rows they already held, so a repeat of a claim
--    that succeeded still reports the full set. A row deleted, or held by another
--    account, makes the number short, and the device and the metadata are kept.
--
-- Run this BEFORE merging. The code needs the new return value: without it a claim
-- still lands, but the device and the metadata are never cleared. Code running today
-- ignores the return value and doesn't call retention_sweep, so this is safe under it.
--
-- Run it as one script: the SQL editor runs it in a single transaction, so the claim
-- function is never missing between its drop and its create.
--
-- Before, read-only:
--
--   1. The sweep isn't there and the claim returns void (expect one row:
--      sweep_functions = 0, claim_returns = void):
--
--   select
--     (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
--       where n.nspname = 'public' and p.proname = 'retention_sweep') as sweep_functions,
--     (select pg_get_function_result(p.oid) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
--       where n.nspname = 'public' and p.proname = 'claim_anonymous_records') as claim_returns;
--
--   2. Table totals. Note the numbers and compare after:
--
--   select
--     (select count(*) from public.assessments) as assessments,
--     (select count(*) from public.diagnoses) as diagnoses,
--     (select count(*) from public.plans) as plans,
--     (select count(*) from public.drill_sessions) as drill_sessions,
--     (select count(*) from auth.users) as users;
--
--   3. Old unclaimed rows. After, the dry run's numbers should not exceed these:
--
--   select
--     (select count(*) from public.assessments where user_id is null and created_at < now() - interval '30 days') as assessments,
--     (select count(*) from public.diagnoses where user_id is null and created_at < now() - interval '30 days') as diagnoses,
--     (select count(*) from public.plans where user_id is null and created_at < now() - interval '30 days') as plans;
--
-- After:
--
--   4. Functions and who can call them (expect one row: sweep_definer = true,
--      claim_returns = integer, and the six privileges false, false, true, false, true, true):
--
--   select
--     (select p.prosecdef from pg_proc p join pg_namespace n on n.oid = p.pronamespace
--       where n.nspname = 'public' and p.proname = 'retention_sweep') as sweep_definer,
--     (select pg_get_function_result(p.oid) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
--       where n.nspname = 'public' and p.proname = 'claim_anonymous_records') as claim_returns,
--     has_function_privilege('anon', 'public.retention_sweep(boolean)', 'execute') as sweep_anon,
--     has_function_privilege('authenticated', 'public.retention_sweep(boolean)', 'execute') as sweep_authenticated,
--     has_function_privilege('service_role', 'public.retention_sweep(boolean)', 'execute') as sweep_service,
--     has_function_privilege('anon', 'public.claim_anonymous_records(uuid, uuid, uuid)', 'execute') as claim_anon,
--     has_function_privilege('authenticated', 'public.claim_anonymous_records(uuid, uuid, uuid)', 'execute') as claim_authenticated,
--     has_function_privilege('service_role', 'public.claim_anonymous_records(uuid, uuid, uuid)', 'execute') as claim_service;
--
--   5. A dry run. It changes nothing. Read its counts against check 3:
--
--   select public.retention_sweep(true);
--
--   6. Totals match check 2 exactly: rerun that query.
--
-- Rolling back: drop function public.retention_sweep(boolean), then rerun
-- 20260717192417_claim_rpc.sql after dropping this claim_anonymous_records. Only
-- after reverting the code that reads the return value.

create function public.retention_sweep(p_dry_run boolean)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cutoff timestamptz := now() - interval '30 days';
  v_assessments uuid[];
  v_diagnoses uuid[];
  v_plans uuid[];
  v_eligible uuid[];
  v_blocked_claimed uuid[];
  v_blocked_recent uuid[];
  v_delete_assessments uuid[];
  v_delete_diagnoses uuid[];
  v_delete_plans uuid[];
  v_skipped_partly_claimed integer;
  v_users uuid[];
  v_unconfirmed integer;
  v_deleted_assessments integer;
  v_deleted_diagnoses integer;
  v_deleted_plans integer;
begin
  -- Lock each set whole, top down. Roots are old unclaimed assessments, and the old
  -- unclaimed diagnoses and plans with no parent, which RLS lets anyone insert.
  -- A row claimed while this waits on it drops out of the WHERE when it wakes.
  select coalesce(array_agg(s.id), '{}') into v_assessments
  from (
    select a.id from public.assessments a
    where a.user_id is null and a.created_at < v_cutoff
    order by a.id
    for update of a
  ) s;

  select coalesce(array_agg(s.id), '{}') into v_diagnoses
  from (
    select d.id from public.diagnoses d
    where d.assessment_id = any (v_assessments)
       or (d.assessment_id is null and d.user_id is null and d.created_at < v_cutoff)
    order by d.id
    for update of d
  ) s;

  select coalesce(array_agg(s.id), '{}') into v_plans
  from (
    select p.id from public.plans p
    where p.diagnosis_id = any (v_diagnoses)
       or (p.diagnosis_id is null and p.user_id is null and p.created_at < v_cutoff)
    order by p.id
    for update of p
  ) s;

  -- With the locks held nothing below can change. Read everything again: a claim or
  -- an insert that made the locks above wait has committed by now.
  with plan_state as (
    select p.id, p.diagnosis_id,
      p.user_id is not null
        or exists (select 1 from public.drill_sessions s where s.plan_id = p.id) as claimed,
      p.created_at >= v_cutoff as recent
    from public.plans p
    where p.id = any (v_plans)
  ),
  diagnosis_state as (
    select d.id, d.assessment_id,
      d.user_id is not null or coalesce(bool_or(ps.claimed), false) as claimed,
      d.created_at >= v_cutoff or coalesce(bool_or(ps.recent), false) as recent
    from public.diagnoses d
    left join plan_state ps on ps.diagnosis_id = d.id
    where d.id = any (v_diagnoses)
    group by d.id
  ),
  assessment_state as (
    select a.id,
      a.user_id is not null or coalesce(bool_or(ds.claimed), false) as claimed,
      a.created_at >= v_cutoff or coalesce(bool_or(ds.recent), false) as recent
    from public.assessments a
    left join diagnosis_state ds on ds.assessment_id = a.id
    where a.id = any (v_assessments)
    group by a.id
  ),
  roots as (
    select id, claimed, recent from assessment_state
    union all
    select id, claimed, recent from diagnosis_state where assessment_id is null
    union all
    select id, claimed, recent from plan_state where diagnosis_id is null
  )
  select
    coalesce(array_agg(id) filter (where not claimed and not recent), '{}'),
    coalesce(array_agg(id) filter (where claimed), '{}'),
    coalesce(array_agg(id) filter (where recent and not claimed), '{}')
  into v_eligible, v_blocked_claimed, v_blocked_recent
  from roots;

  select coalesce(array_agg(a.id), '{}') into v_delete_assessments
  from public.assessments a
  where a.id = any (v_assessments) and a.id = any (v_eligible);

  select coalesce(array_agg(d.id), '{}') into v_delete_diagnoses
  from public.diagnoses d
  where d.id = any (v_diagnoses)
    and (d.id = any (v_eligible) or d.assessment_id = any (v_eligible));

  select coalesce(array_agg(p.id), '{}') into v_delete_plans
  from public.plans p
  where p.id = any (v_plans)
    and (p.id = any (v_eligible) or p.diagnosis_id = any (v_delete_diagnoses));

  -- Sets kept for a claimed row, plus old unclaimed rows under a parent that isn't
  -- old and unclaimed. Named by the set's top row, so a set counts once.
  select count(*) into v_skipped_partly_claimed
  from (
    select unnest(v_blocked_claimed) as id
    union
    select d.assessment_id
    from public.diagnoses d
    where d.user_id is null and d.created_at < v_cutoff
      and d.assessment_id is not null
      and not (d.assessment_id = any (v_assessments))
    union
    select coalesce(d.assessment_id, d.id)
    from public.plans p
    join public.diagnoses d on d.id = p.diagnosis_id
    where p.user_id is null and p.created_at < v_cutoff
      and not (d.user_id is null and d.created_at < v_cutoff)
  ) s;

  if p_dry_run is distinct from false then
    v_deleted_plans := cardinality(v_delete_plans);
    v_deleted_diagnoses := cardinality(v_delete_diagnoses);
    v_deleted_assessments := cardinality(v_delete_assessments);
  else
    delete from public.plans where id = any (v_delete_plans) and user_id is null;
    get diagnostics v_deleted_plans = row_count;
    delete from public.diagnoses where id = any (v_delete_diagnoses) and user_id is null;
    get diagnostics v_deleted_diagnoses = row_count;
    delete from public.assessments where id = any (v_delete_assessments) and user_id is null;
    get diagnostics v_deleted_assessments = row_count;
  end if;

  -- Unconfirmed sign-ups. Their pending rows went through the rules above with every
  -- other set, so a row named in metadata stays until it is 30 days old on its own.
  select
    count(*),
    coalesce(array_agg(u.id order by u.id) filter (
      where u.last_sign_in_at is null
        and u.confirmation_sent_at < now() - interval '2 days'
        and not exists (select 1 from public.profiles pr where pr.id = u.id and pr.stripe_customer_id is not null)
        and not exists (select 1 from public.assessments o where o.user_id = u.id)
        and not exists (select 1 from public.diagnoses o where o.user_id = u.id)
        and not exists (select 1 from public.plans o where o.user_id = u.id)
        and not exists (select 1 from public.drill_sessions o where o.user_id = u.id)
    ), '{}')
  into v_unconfirmed, v_users
  from auth.users u
  where u.email_confirmed_at is null
    and u.confirmed_at is null
    and u.created_at < v_cutoff;

  return jsonb_build_object(
    'cutoff', v_cutoff,
    'assessments', v_deleted_assessments,
    'diagnoses', v_deleted_diagnoses,
    'plans', v_deleted_plans,
    'skippedPartlyClaimed', v_skipped_partly_claimed,
    'skippedRecentRows', cardinality(v_blocked_recent),
    'skippedUsers', v_unconfirmed - cardinality(v_users),
    'userIds', to_jsonb(v_users)
  );
end;
$$;

revoke all on function public.retention_sweep(boolean) from public, anon, authenticated;
grant execute on function public.retention_sweep(boolean) to service_role;

-- A new return type can't go through create or replace.
drop function public.claim_anonymous_records(uuid, uuid, uuid);

create function public.claim_anonymous_records(
  p_assessment_id uuid,
  p_diagnosis_id uuid,
  p_plan_id uuid
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'must be authenticated to claim records';
  end if;

  if p_assessment_id is not null then
    update public.assessments
      set user_id = v_uid
      where id = p_assessment_id and user_id is null;
  end if;

  if p_diagnosis_id is not null then
    update public.diagnoses
      set user_id = v_uid
      where id = p_diagnosis_id and user_id is null;
  end if;

  if p_plan_id is not null then
    update public.plans
      set user_id = v_uid
      where id = p_plan_id and user_id is null;
  end if;

  return (select count(*) from public.assessments where id = p_assessment_id and user_id = v_uid)
       + (select count(*) from public.diagnoses where id = p_diagnosis_id and user_id = v_uid)
       + (select count(*) from public.plans where id = p_plan_id and user_id = v_uid);
end;
$$;

revoke all on function public.claim_anonymous_records(uuid, uuid, uuid) from public, anon;
grant execute on function public.claim_anonymous_records(uuid, uuid, uuid) to authenticated;
