import { redirect } from "next/navigation";

import { RetestFlow } from "@/components/retest/RetestFlow";
import { isRetestOpen } from "@/lib/retest-gate";
import { createClient } from "@/lib/supabase/server";

/**
 * The re-test, only on or after the current plan's retest_date. Before then,
 * or with no date, there is nothing to take: back to the plan, which shows
 * when it opens.
 */
export default async function RetestPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login?next=/retest");
  }

  if (!(await isRetestOpen(supabase, user.id))) {
    redirect("/plan");
  }

  return <RetestFlow />;
}
