-- Road to Next Rating — initial schema
-- Tables, RLS policies, and the new-user profile trigger.
--
-- Anonymous-first flow: a player completes the assessment, diagnosis, and plan
-- BEFORE signing up. Those rows are created with user_id = NULL ("unclaimed")
-- and later claimed by assigning the signed-up user's id. Because of that,
-- user_id is intentionally NULLABLE on assessments, diagnoses, and plans.
--
-- Reading/claiming unclaimed (user_id IS NULL) rows is NOT permitted through
-- the anon/authenticated RLS policies below — those rows are addressed by their
-- unguessable id and must be fetched/claimed from a privileged server context
-- (service_role key, which bypasses RLS, or a SECURITY DEFINER RPC). This keeps
-- anonymous rows from being listed/read by just anyone.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.profiles (
  id                      uuid primary key references auth.users (id) on delete cascade,
  email                   text,
  display_name            text,
  subscription_status     text not null default 'free', -- 'free' | 'active' | 'canceled'
  stripe_customer_id      text,
  retest_reminder_enabled boolean not null default true,
  created_at              timestamptz not null default now()
);

comment on column public.profiles.subscription_status is 'free | active | canceled';

create table public.assessments (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references public.profiles (id) on delete cascade, -- NULLABLE: anonymous-first
  answers    jsonb,
  band       text,
  created_at timestamptz not null default now()
);

create table public.diagnoses (
  id            uuid primary key default gen_random_uuid(),
  assessment_id uuid references public.assessments (id) on delete cascade,
  user_id       uuid references public.profiles (id) on delete cascade, -- NULLABLE: anonymous-first
  bottleneck    text,
  runners_up    text[],
  root_cause    text,
  story_id      text,
  readiness     int,
  skill_scores  jsonb,
  created_at    timestamptz not null default now()
);

create table public.plans (
  id            uuid primary key default gen_random_uuid(),
  diagnosis_id  uuid references public.diagnoses (id) on delete cascade,
  user_id       uuid references public.profiles (id) on delete cascade, -- NULLABLE: anonymous-first
  drill_ids     text[],
  in_game_rule  text,
  retest_metric text,
  retest_date   date,
  status        text, -- 'active' | 'completed' | 'abandoned'
  created_at    timestamptz not null default now()
);

comment on column public.plans.status is 'active | completed | abandoned';

create table public.drill_sessions (
  id           uuid primary key default gen_random_uuid(),
  plan_id      uuid references public.plans (id) on delete cascade,
  user_id      uuid not null references public.profiles (id) on delete cascade,
  drill_id     text,
  completed_at timestamptz not null default now(),
  notes        text
);

-- Foreign-key / lookup indexes
create index assessments_user_id_idx      on public.assessments (user_id);
create index diagnoses_assessment_id_idx  on public.diagnoses (assessment_id);
create index diagnoses_user_id_idx        on public.diagnoses (user_id);
create index plans_diagnosis_id_idx       on public.plans (diagnosis_id);
create index plans_user_id_idx            on public.plans (user_id);
create index drill_sessions_plan_id_idx   on public.drill_sessions (plan_id);
create index drill_sessions_user_id_idx   on public.drill_sessions (user_id);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.profiles       enable row level security;
alter table public.assessments    enable row level security;
alter table public.diagnoses      enable row level security;
alter table public.plans          enable row level security;
alter table public.drill_sessions enable row level security;

-- profiles: owner-only. Inserts are handled by the on-signup trigger
-- (SECURITY DEFINER), so no INSERT policy is exposed to clients.
create policy "profiles: select own"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id);

create policy "profiles: update own"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- assessments
-- Anyone (anon or authenticated) may INSERT an unclaimed row (user_id IS NULL);
-- authenticated users may also insert rows owned by themselves.
create policy "assessments: insert own or anonymous"
  on public.assessments for insert
  to anon, authenticated
  with check (user_id is null or auth.uid() = user_id);

-- Only the owner can read/update/delete. Unclaimed rows (user_id IS NULL) are
-- deliberately NOT selectable here — they are reached by id server-side.
create policy "assessments: select own"
  on public.assessments for select
  to authenticated
  using (auth.uid() = user_id);

create policy "assessments: update own"
  on public.assessments for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "assessments: delete own"
  on public.assessments for delete
  to authenticated
  using (auth.uid() = user_id);

-- diagnoses
create policy "diagnoses: insert own or anonymous"
  on public.diagnoses for insert
  to anon, authenticated
  with check (user_id is null or auth.uid() = user_id);

create policy "diagnoses: select own"
  on public.diagnoses for select
  to authenticated
  using (auth.uid() = user_id);

create policy "diagnoses: update own"
  on public.diagnoses for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "diagnoses: delete own"
  on public.diagnoses for delete
  to authenticated
  using (auth.uid() = user_id);

-- plans
create policy "plans: insert own or anonymous"
  on public.plans for insert
  to anon, authenticated
  with check (user_id is null or auth.uid() = user_id);

create policy "plans: select own"
  on public.plans for select
  to authenticated
  using (auth.uid() = user_id);

create policy "plans: update own"
  on public.plans for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "plans: delete own"
  on public.plans for delete
  to authenticated
  using (auth.uid() = user_id);

-- drill_sessions: owner-only, no anonymous path (user_id is NOT NULL).
create policy "drill_sessions: insert own"
  on public.drill_sessions for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "drill_sessions: select own"
  on public.drill_sessions for select
  to authenticated
  using (auth.uid() = user_id);

create policy "drill_sessions: update own"
  on public.drill_sessions for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "drill_sessions: delete own"
  on public.drill_sessions for delete
  to authenticated
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- New-user trigger: create a profiles row for every new auth.users row
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
