-- Readiness moves from 40 + 45 × (share of the maximum skill levels), which
-- ran 40–85, to a 0–100 scale where the worst possible answers score 0 and
-- the best score 100 (src/lib/readiness.ts). Same ordering, new scale.
--
-- The four skill levels sum to between 1 and 12: every skill can score 0 to
-- 3 except soft-game patience, whose worst answers score 1. So:
--   readiness = round(100 × (sum of levels − 1) / 11)
--
-- The app already computes readiness from each diagnosis's stored
-- `skill_scores` when it reads a row, so it is correct before this runs. This
-- brings the stored column into line for anything that reads it directly
-- (SQL, exports).

-- Rows with a full set of stored skill levels: recompute exactly.
update public.diagnoses d
set readiness = s.readiness
from (
  select id,
    greatest(0, least(100, round(100 * (sum((elem ->> 'level')::numeric) - 1) / 11)))::int as readiness
  from public.diagnoses, jsonb_array_elements(skill_scores) as elem
  where jsonb_typeof(skill_scores) = 'array'
  group by id
  having count(*) = 4
) s
where d.id = s.id;

-- Any row without them: invert the old formula to a level sum, then rescale.
update public.diagnoses
set readiness = greatest(0, least(100,
  round(100 * (((readiness - 40) * 12.0 / 45) - 1) / 11)))::int
where readiness is not null
  and (skill_scores is null or jsonb_typeof(skill_scores) <> 'array' or jsonb_array_length(skill_scores) <> 4);
