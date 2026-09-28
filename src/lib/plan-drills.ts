import type { SupabaseClient } from "@supabase/supabase-js";

import { findDrillById } from "@/lib/drill-lookup";
import type { Drill } from "@/lib/drills";
import { hasDrillingPartner, prescribeDrill } from "@/lib/roadmap";
import type { AnswerMap } from "@/lib/types";

/**
 * A saved plan's drills, as prescribed to the player who owns it.
 *
 * Plans store drill ids only, so the partner-or-solo choice made when the
 * plan was generated has to be made again at render time. It is recomputed
 * from the answers behind the plan (plan → diagnosis → assessment), using the
 * same rule `generateRoadmap` used, rather than stored — so it covers every
 * plan already in the database without a migration, and it can't drift from
 * the funnel's preview.
 *
 * If the answers can't be read (a plan with no linked diagnosis, say), the
 * partner version is shown: that is what every plan showed before this
 * existed, so the fallback never makes a plan worse than it was.
 */
export async function loadPlanDrills(
  supabase: SupabaseClient,
  plan: { drill_ids: unknown; diagnosis_id: unknown }
): Promise<Drill[]> {
  const ids = Array.isArray(plan.drill_ids) ? (plan.drill_ids as string[]) : [];
  const hasPartner = await planHasPartner(supabase, plan.diagnosis_id);
  return ids
    .map((id) => findDrillById(id))
    .filter((d): d is Drill => Boolean(d))
    .map((d) => prescribeDrill(d, hasPartner));
}

async function planHasPartner(supabase: SupabaseClient, diagnosisId: unknown): Promise<boolean> {
  if (typeof diagnosisId !== "string") return true;

  const { data: diagnosis } = await supabase
    .from("diagnoses")
    .select("assessment_id")
    .eq("id", diagnosisId)
    .maybeSingle();
  if (!diagnosis?.assessment_id) return true;

  const { data: assessment } = await supabase
    .from("assessments")
    .select("answers")
    .eq("id", diagnosis.assessment_id)
    .maybeSingle();
  const answers = assessment?.answers;
  if (!answers || typeof answers !== "object") return true;

  return hasDrillingPartner(answers as AnswerMap);
}
