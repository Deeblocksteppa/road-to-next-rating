-- Real Stripe billing — the columns the webhook writes back into.
--
-- `stripe_customer_id` already exists from the init schema. This adds the
-- subscription pointer and the pending-cancellation flag, so Settings can
-- reference the right Stripe objects (cancel, check status) and can tell
-- "renews Apr 2027" apart from "cancels Apr 2027".
--
-- plan_type/renews_at (added in 20260719120000) stop being placeholder values
-- written by the checkout stand-in and become mirrors of Stripe subscription
-- data, written only by the webhook once Stripe confirms.

alter table public.profiles
  add column if not exists stripe_subscription_id text,
  add column if not exists cancel_at_period_end boolean not null default false;

comment on column public.profiles.stripe_customer_id is
  'Stripe Customer id (cus_…). Created on first checkout, reused after.';
comment on column public.profiles.stripe_subscription_id is
  'Stripe Subscription id (sub_…) for the active/canceling subscription. Null when free.';
comment on column public.profiles.cancel_at_period_end is
  'True once the user cancels: access continues until renews_at, then Stripe sends subscription.deleted.';
comment on column public.profiles.renews_at is
  'End of the current Stripe billing period. Renewal date, or access-until date when cancel_at_period_end.';

-- The webhook resolves an incoming event back to a profile by these ids.
create index if not exists profiles_stripe_customer_id_idx
  on public.profiles (stripe_customer_id);
create index if not exists profiles_stripe_subscription_id_idx
  on public.profiles (stripe_subscription_id);
