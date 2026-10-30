-- Plans store their in-game rule and re-test goal as text when they are
-- created (src/lib/persistence.ts, src/app/retest/actions.ts), so the em-dash
-- sweep in src/lib/roadmap.ts only reaches new plans. This rewrites the three
-- stored strings that carried an em dash (batch 2 plan, rows 46–48).
--
-- Exact matches only: a row is touched only if its text is the old string,
-- character for character. Safe to run twice; the second run matches nothing.
--
-- Expected counts, run before and after (after: all three are 0):
--   select
--     count(*) filter (where in_game_rule = 'When you''re caught mid-court, reset soft instead of attacking — even if you lose the point. You''re trading this week''s games for next month''s level.') as reset_rule,
--     count(*) filter (where in_game_rule = 'When someone speeds up at you, your first job is to stay in the point — not counter-attack. Block first, look for offense second.') as net_defense_rule,
--     count(*) filter (where retest_metric = 'Can you reset a hard ball at your feet from mid-court without it floating up? Count 10 attempts — aim for 6+ clean.') as reset_metric
--   from public.plans;

-- Row 46: reset in-game rule.
update public.plans
set in_game_rule = 'When you''re caught mid-court, reset soft instead of attacking, even if you lose the point. You''re trading this week''s games for next month''s level.'
where in_game_rule = 'When you''re caught mid-court, reset soft instead of attacking — even if you lose the point. You''re trading this week''s games for next month''s level.';

-- Row 47: net-defense in-game rule.
update public.plans
set in_game_rule = 'When someone speeds up at you, your first job is to stay in the point, not counter-attack. Block first, look for offense second.'
where in_game_rule = 'When someone speeds up at you, your first job is to stay in the point — not counter-attack. Block first, look for offense second.';

-- Row 48: reset re-test goal.
update public.plans
set retest_metric = 'Can you reset a hard ball at your feet from mid-court without it floating up? Count 10 attempts. Aim for 6+ clean.'
where retest_metric = 'Can you reset a hard ball at your feet from mid-court without it floating up? Count 10 attempts — aim for 6+ clean.';
