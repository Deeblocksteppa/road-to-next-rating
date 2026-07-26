-- Independent opt-out for daily drill reminders.
--
-- Re-test reminders (retest_reminder_enabled) and drill reminders are different
-- things a user might want separately: "nudge me when my re-test opens" vs.
-- "nudge me daily while a session is still due". This adds the second toggle,
-- defaulting on to match retest_reminder_enabled's default.

alter table public.profiles
  add column if not exists drill_reminder_enabled boolean not null default true;

comment on column public.profiles.drill_reminder_enabled is
  'Daily "session still due" email reminders. Independent of retest_reminder_enabled.';
