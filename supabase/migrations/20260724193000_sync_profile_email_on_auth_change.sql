-- Keep profiles.email in sync with auth.users.email after signup.
--
-- handle_new_user() (init_schema.sql) only fires `after insert on auth.users`,
-- so profiles.email is a one-time snapshot taken at signup. If the auth email
-- is ever changed afterward — Dashboard edit, admin API, or a future
-- self-service change-email flow — profiles.email silently goes stale while
-- auth.users.email moves on. That's exactly how two unrelated test accounts
-- ended up both showing 'atmankathir@gmail.com' in profiles.email: one
-- account's real signup email, and the other a fossil left over from before
-- its auth email was changed to something else.
--
-- Three call sites trust profiles.email as if it were current (Settings'
-- display, the Stripe customer email in paywall/actions.ts, and the
-- drill-reminder recipient in reminders.ts) — this trigger fixes all three at
-- the source instead of patching each read site.

create or replace function public.handle_user_email_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles set email = new.email where id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_email_updated
  after update of email on auth.users
  for each row
  when (new.email is distinct from old.email)
  execute function public.handle_user_email_update();

-- One-time backfill: bring existing profiles back in line with their
-- account's actual current email, undoing whatever staleness already
-- accumulated before this trigger existed.
update public.profiles p
set email = u.email
from auth.users u
where u.id = p.id
  and p.email is distinct from u.email;
