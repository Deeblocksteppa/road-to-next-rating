import Link from "next/link";
import { redirect } from "next/navigation";

import { DeleteAccountForm } from "@/components/settings/DeleteAccountForm";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Delete account — the confirmation step. Says exactly what goes, and what
 * happens to a live subscription, before anything is armed.
 */
export default async function DeleteAccountPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login?next=/settings/delete");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_status")
    .eq("id", user.id)
    .maybeSingle();
  const isPaid = profile?.subscription_status === "active";

  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col gap-6 bg-background px-6 py-8 text-ink">
      <header className="flex items-center gap-4 pt-4">
        <Link
          href="/settings"
          aria-label="Back to settings"
          className="flex h-9 w-9 items-center justify-center rounded-md border border-line-strong text-[16px] text-ink-2 transition-colors hover:border-line-hover hover:text-ink"
        >
          ‹
        </Link>
        <h1 className="font-display text-[22px] font-bold tracking-[-0.01em]">Delete account</h1>
      </header>

      <div className="flex flex-col gap-2.5">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-3">
          {user.email}
        </p>
        <p className="text-pretty text-[15px] leading-[1.6] text-ink-2">
          This permanently deletes your account and everything saved to it. It cannot be
          undone, and we cannot restore it afterwards.
        </p>
      </div>

      <section className="flex flex-col rounded-2xl border border-line bg-surface px-[18px]">
        {[
          "Your assessments and every diagnosis",
          "Your plans, in-game rules and re-test dates",
          "Every session and score you logged",
          "Your readiness history and streaks",
        ].map((line, i) => (
          <p
            key={line}
            className={`py-3.5 text-[14.5px] leading-[1.45] text-ink ${
              i === 0 ? "" : "border-t border-line"
            }`}
          >
            {line}
          </p>
        ))}
      </section>

      {isPaid && (
        <p className="rounded-xl border border-line-strong bg-surface-2 px-[18px] py-3.5 text-[14px] leading-[1.5] text-ink-2">
          Your subscription is cancelled immediately as part of this, so you are not
          billed again. The time left on the current period is not refunded.
        </p>
      )}

      <div className="flex-1" />

      <DeleteAccountForm />
    </main>
  );
}
