import { redirect } from "next/navigation";

import { PaywallView } from "@/components/paywall/PaywallView";
import { loadRetestDirection } from "@/lib/retest-result";
import { DEFAULT_RETURN, safeReturn } from "@/lib/safe-return";
import { createClient } from "@/lib/supabase/server";

const RETEST_PATH = /^\/retest\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;

export default async function PaywallPage({
  searchParams,
}: {
  searchParams: { from?: string };
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login?next=/paywall");
  }

  // Sanitised here, not in the view: `from` is attacker-controllable and now
  // renders as the back link's href, not just as a server-side redirect target.
  const returnTo = safeReturn(searchParams.from);

  // A subscriber has nothing to buy here. Send them on to what they came for
  // rather than offering the plan they're already on (never back to /paywall).
  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_status")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.subscription_status === "active") {
    redirect(returnTo.startsWith("/paywall") ? DEFAULT_RETURN : returnTo);
  }

  // The pitch follows the score's actual direction: the re-test the player
  // came from, else their latest. A player whose score just fell is never
  // told they're improving.
  const retestId = RETEST_PATH.exec(returnTo)?.[1] ?? null;
  const reading = await loadRetestDirection(supabase, user.id, retestId);

  return <PaywallView returnTo={returnTo} reading={reading} />;
}
