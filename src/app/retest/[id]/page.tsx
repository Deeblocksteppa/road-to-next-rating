import { notFound, redirect } from "next/navigation";

import { DeltaScreen } from "@/components/retest/DeltaScreen";
import { loadRetestView } from "@/lib/retest-result";
import { retestHref } from "@/lib/retest-view";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * One re-test's result, reopenable at any time: right after the re-test,
 * from a row in Progress's re-test history, and on return from checkout
 * (the paywall's `from` points here, so a player who pays to see the
 * breakdown lands on the breakdown).
 */
export default async function RetestResultPage({ params }: { params: { id: string } }) {
  if (!UUID.test(params.id)) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(retestHref(params.id))}`);
  }

  const view = await loadRetestView(supabase, user.id, params.id);
  if (!view) notFound();

  return <DeltaScreen view={view} />;
}
