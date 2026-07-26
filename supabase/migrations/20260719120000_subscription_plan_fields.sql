-- Minimal plan tracking ahead of real Stripe billing.
--
-- The placeholder checkout in /paywall needs to remember which plan the user
-- picked and when it "renews" so Settings can show "Annual · renews Apr 2027"
-- instead of just a bare active/free status. Once Stripe is wired up, these
-- become mirrors of Stripe subscription data (or are replaced by it) rather
-- than the source of truth.

alter table public.profiles
  add column plan_type text,        -- 'annual' | 'monthly' | null (free tier)
  add column renews_at timestamptz; -- null when free

comment on column public.profiles.plan_type is 'annual | monthly | null (free tier)';
comment on column public.profiles.renews_at is 'Placeholder renewal date, set by the /paywall checkout stand-in. Null when free.';
