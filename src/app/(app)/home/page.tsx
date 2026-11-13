import { Settings } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { ClaimOnLoad } from "@/components/auth/ClaimOnLoad";
import { Logo } from "@/components/brand/Logo";
import { EXPIRED_BUTTON, ExpiredResult } from "@/components/plan/ExpiredResult";
import { TodaySession, todayState } from "@/components/home/TodaySession";
import { RetestOpen } from "@/components/retest/RetestOpen";
import { SKILL_LABELS, SKILL_TITLES } from "@/lib/diagnoses";
import { SkillTitle } from "@/components/diagnosis/SkillTitle";
import { diagnose } from "@/lib/engine";
import { getTodayLog, getWeeklyProgress, loggedThisUtcDay } from "@/lib/drill-sessions";
import { loadPlanDrills } from "@/lib/plan-drills";
import { getPlanTimeline } from "@/lib/plan-timeline";
import { createClient } from "@/lib/supabase/server";
import type { AnswerMap, SkillId } from "@/lib/types";
import { homeCaption, weekContext } from "@/lib/week-status";

export default async function HomePage({
  searchParams,
}: {
  searchParams: { saved?: string; expired?: string };
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login?next=/home");
  }

  const { data: diagnosis } = await supabase
    .from("diagnoses")
    .select("id, bottleneck, assessment_id, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: plan } = await supabase
    .from("plans")
    .select("id, drill_ids, diagnosis_id, retest_date, status, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const planDrills = plan ? await loadPlanDrills(supabase, plan) : [];

  const [weekly, todayLog] = plan
    ? await Promise.all([
        getWeeklyProgress(supabase, plan.id, planDrills.length),
        getTodayLog(supabase, plan.id),
      ])
    : [{ completed: 0, total: 0 }, []];
  const completedToday = new Set(todayLog.map((e) => e.drillId));

  const timeline =
    plan && plan.retest_date
      ? getPlanTimeline(plan.created_at, plan.retest_date)
      : null;

  const bottleneck = diagnosis?.bottleneck as SkillId | undefined;
  // "Plan saved" needs the plan itself, built from the diagnosis on show: a
  // diagnosis whose plan was never saved (or failed to claim) has nothing to
  // announce.
  const hasPlan = Boolean(diagnosis && plan && plan.diagnosis_id === diagnosis.id);

  // The insight's one-line summary, kept on Home so the "why" outlives the
  // reveal. Rebuilt from the answers behind the diagnosis (the engine is
  // deterministic), so a re-test's new focus brings its own line.
  let insight: string | null = null;
  if (diagnosis?.assessment_id) {
    const { data: assessment } = await supabase
      .from("assessments")
      .select("answers")
      .eq("id", diagnosis.assessment_id)
      .maybeSingle();
    if (assessment?.answers && typeof assessment.answers === "object") {
      insight = diagnose(assessment.answers as AnswerMap).insightHeadline;
    }
  }

  // Same derivation the card and button use, so the caption under them can
  // never disagree with what they say.
  const weekComplete = weekly.total > 0 && weekly.completed >= weekly.total;
  const { todayDone, allDone } = todayState(planDrills, Array.from(completedToday), weekComplete);
  // Open re-test: the card below is the screen's main element, whatever else
  // happened today, so the caption never has to carry it.
  const retestOpen = timeline !== null && timeline.daysUntilRetest <= 0;

  // Below-button caption: what comes next when it isn't the button. The
  // re-test countdown while there is a session to start; once today or the
  // week is done, the next day, next Monday, or (in the plan's final week,
  // where there is no next week of sessions) the re-test date.
  const caption = homeCaption(
    weekContext((plan?.retest_date as string | null) ?? null),
    weekly,
    { todayDone, allDone },
    timeline?.daysUntilRetest ?? null,
    loggedThisUtcDay(todayLog)
  );

  return (
    <main className="flex flex-1 flex-col gap-6 px-6 py-8">
      <ClaimOnLoad
        saved={searchParams.saved === "1"}
        expired={searchParams.expired === "1"}
        hasPlan={hasPlan}
      />

      <header className="flex items-center justify-between pt-4">
        <Logo />
        <div className="flex items-center gap-3.5">
          {timeline && (
            <span className="font-mono text-[11px] tabular-nums tracking-[0.1em] text-ink-3">
              DAY {timeline.daysElapsed} / {timeline.totalDays}
            </span>
          )}
          <Link
            href="/settings"
            aria-label="Settings"
            className="relative flex h-8 w-8 items-center justify-center rounded-full after:absolute after:-inset-1.5 after:content-[''] border border-line-strong text-ink-2 transition-colors hover:border-line-hover hover:text-ink"
          >
            {/* A gear. The circle-with-rays it replaces read as a sun. */}
            <Settings size={16} strokeWidth={1.8} aria-hidden="true" />
          </Link>
        </div>
      </header>

      {diagnosis && bottleneck ? (
        <>
          {/* The skill, in one quiet header: today's session below is the page. */}
          <section className="flex flex-col gap-2">
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3">Your focus</p>
            <h1 className="font-display text-[28px] font-extrabold leading-[1.1] tracking-[-0.01em]">
              <SkillTitle title={SKILL_TITLES[bottleneck]} />
            </h1>
            {insight && (
              <p className="text-pretty text-[16px] leading-[1.6] text-ink-1">{insight}</p>
            )}
            {timeline && (
              <p className="text-[16px] leading-[1.6] tabular-nums text-ink-2">
                Week {timeline.weekNumber} of {timeline.weeksTarget}
              </p>
            )}
          </section>

          {/* Open re-test: the page's main element and its one accent, whatever
              else happened today. Today's button goes secondary under it. */}
          {retestOpen && <RetestOpen variant="block" skillPhrase={SKILL_LABELS[bottleneck]} />}

          <TodaySession
            drills={planDrills}
            completedToday={Array.from(completedToday)}
            weekComplete={weekComplete}
            weekly={weekly}
            secondary={retestOpen}
          />

          {caption && (
            // Sentence case in the body voice: at four to eight words, spaced
            // mono caps had to be decoded (DESIGN.md, Uppercase-Mono limit).
            // Left-aligned: nothing is centered except the reveal.
            <p className="-mt-2 pb-1 text-[16px] leading-[1.5] tabular-nums text-ink-2">{caption}</p>
          )}
        </>
      ) : searchParams.expired === "1" ? (
        <ExpiredResult>
          <Link href="/start" className={EXPIRED_BUTTON}>
            Take the assessment
          </Link>
        </ExpiredResult>
      ) : (
        <p className="mt-2 border-y border-line py-5 text-[16px] leading-[1.6] text-ink-2">
          No diagnosis yet.{" "}
          <Link href="/start" className="text-ink underline underline-offset-4">
            Take the assessment
          </Link>
          .
        </p>
      )}
    </main>
  );
}
