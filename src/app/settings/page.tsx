import Link from "next/link";
import { redirect } from "next/navigation";

import { signOut } from "@/app/auth/actions";
import { DrillReminderToggle } from "@/components/settings/DrillReminderToggle";
import { RetestReminderToggle } from "@/components/settings/RetestReminderToggle";
import { monthYear } from "@/lib/date-format";
import { createClient } from "@/lib/supabase/server";

export default async function SettingsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login?next=/settings");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("email, display_name, subscription_status, retest_reminder_enabled")
    .eq("id", user.id)
    .single();

  // Best-effort: these ship in their own migrations. Treated as absent rather
  // than breaking the page if one hasn't been applied yet.
  const { data: planFields, error: planFieldsError } = await supabase
    .from("profiles")
    .select("plan_type, renews_at, cancel_at_period_end")
    .eq("id", user.id)
    .maybeSingle();
  const plan = planFieldsError ? null : planFields;

  // Best-effort too — drill_reminder_enabled ships in its own migration.
  const { data: drillPref, error: drillPrefError } = await supabase
    .from("profiles")
    .select("drill_reminder_enabled")
    .eq("id", user.id)
    .maybeSingle();
  const drillReminderEnabled = drillPrefError
    ? true
    : drillPref?.drill_reminder_enabled ?? true;

  const isPaid = profile?.subscription_status === "active";
  const planLabel = plan?.plan_type === "monthly" ? "Monthly" : "Annual";

  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col gap-7 bg-background px-6 py-8 text-ink">
      <header className="flex items-center gap-4 pt-4">
        <Link
          href="/home"
          aria-label="Back"
          className="flex h-9 w-9 items-center justify-center rounded-md border border-line-strong text-[16px] text-ink-2 transition-colors hover:border-line-hover hover:text-ink"
        >
          ‹
        </Link>
        <h1 className="font-display text-[22px] font-bold tracking-[-0.01em]">Settings</h1>
      </header>

      {/* ACCOUNT */}
      <section className="flex flex-col gap-2.5">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-3">Account</p>
        <div className="flex flex-col rounded-2xl border border-line bg-surface">
          {/* user.email is the live session value; profile.email is a
              signup-time snapshot that can go stale — prefer the live one. */}
          <Row label="Email" value={user.email ?? profile?.email ?? ""} />
          <div className="h-px bg-line" />
          <Row
            label="Display name"
            value={profile?.display_name ?? "Add your name"}
            muted={!profile?.display_name}
            chevron
          />
        </div>
      </section>

      {/* SUBSCRIPTION */}
      <section className="flex flex-col gap-2.5">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-3">
          Subscription
        </p>
        <div className="flex flex-col rounded-2xl border border-line bg-surface">
          {isPaid ? (
            <>
              <Row
                label="Plan"
                value={
                  plan?.renews_at
                    ? `${planLabel} · ${plan.cancel_at_period_end ? "cancels" : "renews"} ${monthYear(plan.renews_at)}`
                    : planLabel
                }
              />
              <div className="h-px bg-line" />
              <Link
                href="/settings/manage"
                className="flex items-center justify-between px-[18px] py-[15px] transition-colors hover:bg-[#17171A]"
              >
                <span className="text-[15px] text-optic">Manage subscription</span>
                <span className="text-optic">›</span>
              </Link>
            </>
          ) : (
            <Link
              href="/paywall?from=/settings"
              className="flex items-center justify-between px-[18px] py-[15px] transition-colors hover:bg-[#17171A]"
            >
              <span className="text-[15px] text-ink-2">Plan</span>
              <span className="text-[15px] text-optic">Upgrade to unlock Progress</span>
            </Link>
          )}
        </div>
        {isPaid && (
          <p className="pl-0.5 font-mono text-[10px] uppercase tracking-[0.06em] text-ink-3">
            {plan?.cancel_at_period_end
              ? "Scheduled to cancel · you can resume anytime"
              : "Cancel, change plan, or update billing"}
          </p>
        )}
      </section>

      {/* NOTIFICATIONS */}
      <section className="flex flex-col gap-2.5">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-3">
          Notifications
        </p>
        <div className="flex flex-col rounded-2xl border border-line bg-surface">
          <div className="flex items-center justify-between gap-4 px-[18px] py-[15px]">
            <span className="text-[15px] leading-[1.4] text-ink">
              Email me when my re-test opens
            </span>
            <RetestReminderToggle
              initialEnabled={profile?.retest_reminder_enabled ?? true}
            />
          </div>
          <div className="h-px bg-line" />
          <div className="flex items-center justify-between gap-4 px-[18px] py-[15px]">
            <span className="text-[15px] leading-[1.4] text-ink">
              Email me while a session is still due
            </span>
            <DrillReminderToggle initialEnabled={drillReminderEnabled} />
          </div>
        </div>
      </section>

      <div className="flex-1" />

      {/* FOOTER */}
      <div className="flex flex-col gap-3">
        <form action={signOut}>
          <button
            type="submit"
            className="flex h-[52px] w-full items-center justify-center rounded-lg border border-line-strong bg-surface-2 text-[15px] font-semibold text-ink transition-colors hover:border-line-hover"
          >
            Sign out
          </button>
        </form>
        <button
          type="button"
          className="flex items-center justify-center py-1.5 text-[14px] text-danger transition-colors hover:text-danger-hover"
        >
          Delete account
        </button>
      </div>
    </main>
  );
}

function Row({
  label,
  value,
  muted,
  chevron,
}: {
  label: string;
  value: string;
  muted?: boolean;
  chevron?: boolean;
}) {
  return (
    <div className="flex items-center justify-between px-[18px] py-[15px]">
      <span className="text-[15px] text-ink-2">{label}</span>
      <span className="flex items-center gap-2 text-[15px]">
        <span className={muted ? "text-ink-3" : "text-ink"}>{value}</span>
        {chevron && <span className="text-ink-3">›</span>}
      </span>
    </div>
  );
}
