-- Numeric outcome for a logged drill session.
--
-- Guided sessions ask the user to record a count alongside the fact that they
-- practiced ("6 of 10 drops landed"), so progress can later read as
-- "3/10 → 6/10" across sessions. Nullable because every existing row — and
-- every plain "mark done" tap — has no number attached; only guided sessions
-- write it.
--
-- The denominator (attempts) is not stored: it comes from the drill definition
-- in the app, which is fixed per drill. If drills ever get variable targets,
-- this needs a companion result_max column.

alter table public.drill_sessions
  add column if not exists result_value integer;

comment on column public.drill_sessions.result_value is
  'Guided-session score, e.g. 6 (of 10). Null for sessions logged without a number.';
