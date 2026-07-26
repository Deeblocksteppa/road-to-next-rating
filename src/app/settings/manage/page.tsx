import Link from "next/link";
import { redirect } from "next/navigation";

import { CancelSubscriptionForm } from "@/components/settings/CancelSubscriptionForm";
import { monthYear } from "@/lib/date-format";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ManageSubscriptionPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login?next=/settings/manage");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_status, renews_at, cancel_at_period_end")
    .eq("id", user.id)
    .maybeSingle();

  // Only paid users have anything to cancel.
  if (profile?.subscription_status !== "active") {
    redirect("/settings");
  }

  const untilLabel = profile.renews_at
    ? monthYear(profile.renews_at)
    : "the end of your current billing period";
  const cancelPending = profile.cancel_at_period_end === true;

  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col justify-center gap-6 bg-background px-6 py-8 text-ink">
      <div className="flex flex-col gap-2.5">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-3">
          Manage subscription
        </p>
        <h1 className="text-balance font-display text-2xl font-bold tracking-[-0.01em]">
          {cancelPending ? "Cancellation scheduled" : "Cancel your subscription?"}
        </h1>
        {!cancelPending && (
          <p className="text-pretty text-[14.5px] leading-[1.55] text-ink-2">
            You&apos;ll keep Progress access until {untilLabel} — the time
            you&apos;ve already paid for — then move to the free plan. Nothing
            is charged again.
          </p>
        )}
      </div>

      <CancelSubscriptionForm cancelPending={cancelPending} untilLabel={untilLabel} />

      <Link
        href="/settings"
        className="flex h-[48px] w-full items-center justify-center text-center text-[14px] text-ink-2 underline underline-offset-4"
      >
        {cancelPending ? "Back to settings" : "Never mind"}
      </Link>
    </main>
  );
}
