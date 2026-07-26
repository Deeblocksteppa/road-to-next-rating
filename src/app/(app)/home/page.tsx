import Link from "next/link";
import { redirect } from "next/navigation";

import { ClaimOnLoad } from "@/components/auth/ClaimOnLoad";
import { Logo } from "@/components/brand/Logo";
import { monthDay } from "@/lib/date-format";
import { SKILL_TITLES } from "@/lib/diagnoses";
import { findDrillById } from "@/lib/drill-lookup";
import { getWeeklyProgress, startOfWeekUTC } from "@/lib/drill-sessions";
import { getPlanTimeline } from "@/lib/plan-timeline";
import { WEEK_FOCUS_LABELS } from "@/lib/roadmap";
import { createClient } from "@/lib/supabase/server";
import type { SkillId } from "@/lib/types";

export default async function HomePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login?next=/home");
  }

  const { data: diagnosis } = await supabase
    .from("diagnoses")
    .select("bottleneck, root_cause, readiness, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: plan } = await supabase
    .from("plans")
    .select("id, drill_ids, retest_date, status, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const planDrills = plan
    ? ((plan.drill_ids as string[] | null) ?? [])
        .map((id) => findDrillById(id))
        .filter((d): d is NonNullable<typeof d> => Boolean(d))
    : [];

  const weekly = plan
    ? await getWeeklyProgress(supabase, plan.id, planDrills.length)
    : { completed: 0, total: 0 };

  const timeline =
    plan && plan.retest_date
      ? getPlanTimeline(plan.created_at, plan.retest_date)
      : null;

  const bottleneck = diagnosis?.bottleneck as SkillId | undefined;

  // Combined duration of today's session — sum of the plan's drill durations
  // ("15 min" + "15 min" → "30 MIN").
  const sessionMinutes = planDrills.reduce(
    (sum, d) => sum + (parseInt(d.duration, 10) || 0),
    0
  );

  // "/session" always resolves to the first undone drill for the week and
  // dead-ends politely once none are left — but the CTA itself still read as
  // launchable in that state. Reflect done-ness here instead of only
  // downstream.
  const allDone = weekly.total > 0 && weekly.completed >= weekly.total;
  const nextWeekStart = new Date(startOfWeekUTC().getTime() + 7 * 24 * 60 * 60 * 1000);
  // "Close" means within the week the re-test window opens — past that,
  // "next sessions unlock Monday" is the more useful thing to tell them.
  const retestIsClose = timeline !== null && timeline.daysUntilRetest <= 7;

  const retestReadyLink = (
    <Link href="/retest" className="text-optic underline underline-offset-4">
      RE-TEST READY — TAKE IT NOW
    </Link>
  );
  const retestOpensText = (days: number) => (
    <>
      RE-TEST OPENS IN {days} DAY{days === 1 ? "" : "S"}
    </>
  );
  const nextUnlockText = `NEXT SESSIONS UNLOCK MONDAY, ${monthDay(nextWeekStart).toUpperCase()}`;

  // Below-button caption. Unchanged from prior behavior when sessions remain
  // (retest countdown, or nothing if there's no retest date yet); once the
  // week is done, the button itself goes quiet so this line always has
  // something forward-looking to say instead.
  const caption = allDone
    ? timeline === null
      ? nextUnlockText
      : timeline.daysUntilRetest <= 0
        ? retestReadyLink
        : retestIsClose
          ? retestOpensText(timeline.daysUntilRetest)
          : nextUnlockText
    : timeline
      ? timeline.daysUntilRetest > 0
        ? retestOpensText(timeline.daysUntilRetest)
        : retestReadyLink
      : null;

  return (
    <main className="flex flex-1 flex-col gap-4 px-6 py-8">
      <ClaimOnLoad />

      <header className="flex items-center justify-between pt-4">
        <Logo />
        <div className="flex items-center gap-3.5">
          {timeline && (
            <span className="font-mono text-[11px] tracking-[0.1em] text-ink-3">
              DAY {timeline.daysElapsed} / {timeline.totalDays}
            </span>
          )}
          <Link
            href="/settings"
            aria-label="Settings"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-line-strong text-ink-2 transition-colors hover:border-line-hover hover:text-ink"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
              <path
                d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.2 5.2l2.1 2.1M16.7 16.7l2.1 2.1M18.8 5.2l-2.1 2.1M7.3 16.7l-2.1 2.1"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </Link>
        </div>
      </header>

      {diagnosis && bottleneck ? (
        <>
          {/* Bottleneck card */}
          <section className="mt-2 flex flex-col gap-2 rounded-2xl border border-line bg-surface p-[22px]">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-3">
              Current bottleneck
            </p>
            <p className="font-display text-[27px] font-extrabold tracking-[-0.01em]">
              {SKILL_TITLES[bottleneck]}
            </p>
            {timeline && (
              <p className="text-[13px] text-ink-2">
                Week {timeline.weekNumber} of {timeline.weeksTarget} —{" "}
                {WEEK_FOCUS_LABELS[bottleneck]}
              </p>
            )}
          </section>

          {/* Readiness + sessions this week */}
          <div className="flex gap-4">
            <section className="flex flex-[1.2] flex-col gap-2.5 rounded-2xl border border-line bg-surface px-[22px] py-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
                Readiness
              </p>
              <p className="font-display text-[44px] font-extrabold leading-none tabular-nums">
                {diagnosis.readiness}
              </p>
              <div className="h-1 overflow-hidden rounded-full bg-line">
                <div
                  className="h-full rounded-full bg-optic"
                  style={{ width: `${diagnosis.readiness}%` }}
                />
              </div>
            </section>
            <section className="flex flex-1 flex-col justify-between gap-2.5 rounded-2xl border border-line bg-surface px-[22px] py-5">
              <p className="font-mono text-[10px] uppercase leading-tight tracking-[0.14em] text-ink-3">
                Sessions
                <br />
                this week
              </p>
              <p className="font-display text-[26px] font-extrabold leading-none">
                {weekly.completed}
                <span className="text-[18px] font-semibold text-ink-3">
                  /{weekly.total}
                </span>
              </p>
              <div className="flex gap-1.5">
                {Array.from({ length: weekly.total }).map((_, i) => (
                  <span
                    key={i}
                    className={
                      i < weekly.completed
                        ? "h-2.5 w-2.5 rounded-full bg-optic"
                        : "h-2.5 w-2.5 rounded-full border border-line-strong box-border"
                    }
                  />
                ))}
              </div>
            </section>
          </div>

          <div className="flex-1" />

          {allDone ? (
            <button
              type="button"
              disabled
              className="flex h-14 w-full items-center justify-center gap-2 rounded-lg border border-line bg-surface text-[15px] font-semibold text-ink-3"
            >
              All sessions done this week
              <span aria-hidden="true">✓</span>
            </button>
          ) : (
            <Link
              href="/session"
              className="flex h-14 w-full items-center justify-center gap-2.5 rounded-lg bg-optic text-[15px] font-semibold text-optic-ink transition-colors hover:bg-optic-hover active:scale-[0.98]"
            >
              Start today&apos;s session
              {sessionMinutes > 0 && (
                <span className="font-mono text-[11px] opacity-75">
                  {sessionMinutes} MIN
                </span>
              )}
            </Link>
          )}

          {caption && (
            <p className="pb-1 text-center font-mono text-[11px] tracking-[0.14em] text-ink-3">
              {caption}
            </p>
          )}
        </>
      ) : (
        <p className="mt-2 rounded-2xl border border-dashed border-line p-4 text-sm text-ink-2">
          No diagnosis yet.{" "}
          <Link href="/" className="underline underline-offset-4">
            Take the assessment
          </Link>
          .
        </p>
      )}
    </main>
  );
}
