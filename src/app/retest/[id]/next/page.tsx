import { notFound, redirect } from "next/navigation";

import { RetestReveal } from "@/components/retest/RetestReveal";
import { diagnose } from "@/lib/engine";
import { loadRetestView } from "@/lib/retest-result";
import { retestHref } from "@/lib/retest-view";
import { createClient } from "@/lib/supabase/server";
import type { AnswerMap } from "@/lib/types";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Between a re-test result and the new plan, when the focus skill changed.
 * The diagnosis is rebuilt from the re-test's stored answers (the engine is
 * deterministic), so the story is the one the engine gives those answers.
 * A re-test that kept the same skill has nothing new to explain and goes
 * straight to the plan.
 */
export default async function RetestNextPage({ params }: { params: { id: string } }) {
  if (!UUID.test(params.id)) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`${retestHref(params.id)}/next`)}`);

  const view = await loadRetestView(supabase, user.id, params.id);
  if (!view) notFound();
  if (!view.switched || !view.isLatest) redirect("/plan");

  const { data: row } = await supabase
    .from("diagnoses")
    .select("assessment_id")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .maybeSingle();
  const { data: assessment } = row?.assessment_id
    ? await supabase.from("assessments").select("answers").eq("id", row.assessment_id).maybeSingle()
    : { data: null };
  if (!assessment?.answers || typeof assessment.answers !== "object") redirect("/plan");

  return <RetestReveal diagnosis={diagnose(assessment.answers as AnswerMap)} />;
}
