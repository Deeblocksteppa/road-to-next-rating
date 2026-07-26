-- Claim anonymous (unclaimed) records at signup.
--
-- Anonymous rows are inserted with user_id = NULL and addressed by their
-- unguessable id. The authenticated RLS UPDATE policies only match rows the
-- caller already owns (auth.uid() = user_id), so a normal client cannot flip a
-- NULL row to its own id. This SECURITY DEFINER function performs that specific,
-- constrained transition: it assigns the CALLER's uid to the given rows, and
-- only while they are still unclaimed (user_id IS NULL). It therefore cannot
-- steal a row that already belongs to someone else, and — because it targets
-- explicit ids — it cannot mass-claim every unclaimed row the way a blanket
-- "UPDATE ... WHERE user_id IS NULL" policy could.

create or replace function public.claim_anonymous_records(
  p_assessment_id uuid,
  p_diagnosis_id uuid,
  p_plan_id uuid
)
returns void
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
end;
$$;

-- Only logged-in users may claim; anon has no business calling this.
revoke all on function public.claim_anonymous_records(uuid, uuid, uuid) from public;
grant execute on function public.claim_anonymous_records(uuid, uuid, uuid) to authenticated;
