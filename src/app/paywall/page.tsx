import { redirect } from "next/navigation";

import { PaywallView } from "@/components/paywall/PaywallView";
import { safeReturn } from "@/lib/safe-return";
import { createClient } from "@/lib/supabase/server";

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
  return <PaywallView returnTo={safeReturn(searchParams.from)} />;
}
