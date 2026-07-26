-- One drill session per (plan, drill) per UTC day.
--
-- Makes "mark done" idempotent at the database level: a double-tap (or a raced
-- double-submit) can't create two rows for the same drill on the same day. The
-- app also checks-before-insert for a clean UX, but this index is the hard
-- guarantee.
--
-- The expression `(completed_at at time zone 'utc')::date` is immutable
-- (timezone(text, timestamptz) is immutable), so it's valid in an index.
create unique index drill_sessions_one_per_day
  on public.drill_sessions (
    plan_id,
    drill_id,
    ((completed_at at time zone 'utc')::date)
  );
