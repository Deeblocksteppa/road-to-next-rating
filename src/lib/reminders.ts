import { findDrillById } from "@/lib/drill-lookup";
import { startOfTodayUTC, startOfWeekUTC } from "@/lib/drill-sessions";
import { sendDrillReminder } from "@/lib/email";
import { createAdminClient } from "@/lib/supabase/admin";

export interface ReminderRunSummary {
  /** Profiles with the drill-reminder toggle on and an email address. */
  candidates: number;
  sent: number;
  /** Eligible profiles that didn't need a nudge (no plan, done today, or all
   *  sessions done this week). */
  skipped: number;
  /** Sends that threw (bad address, Resend error) — logged, never fatal. */
  errors: number;
}

/**
 * Daily drill-reminder pass. Emails every user who:
 *   • has drill_reminder_enabled on,
 *   • has an active (not completed/abandoned) plan with drills,
 *   • has NOT logged any session today, and
 *   • still has at least one prescribed drill unlogged this week.
 *
 * The drill named in the email is the next one due — the first plan drill not
 * yet logged this week, matching what the guided-session flow opens.
 *
 * Runs with the service-role client (no auth context), so it reads across all
 * users. Batched into three queries (profiles → plans → this-week sessions)
 * rather than a query per user.
 */
export async function runDrillReminders(): Promise<ReminderRunSummary> {
  const admin = createAdminClient();
  const summary: ReminderRunSummary = {
    candidates: 0,
    sent: 0,
    skipped: 0,
    errors: 0,
  };

  // 1. Opted-in users with an address to send to.
  const { data: profiles, error: profilesError } = await admin
    .from("profiles")
    .select("id, email")
    .eq("drill_reminder_enabled", true)
    .not("email", "is", null);
  if (profilesError) throw profilesError;

  const users = profiles ?? [];
  summary.candidates = users.length;
  if (users.length === 0) return summary;

  // 2. Their plans, newest first → keep the most recent per user.
  const { data: plans, error: plansError } = await admin
    .from("plans")
    .select("id, user_id, drill_ids, status, created_at")
    .in(
      "user_id",
      users.map((u) => u.id)
    )
    .order("created_at", { ascending: false });
  if (plansError) throw plansError;

  const planByUser = new Map<
    string,
    { id: string; drillIds: string[]; status: string | null }
  >();
  for (const p of plans ?? []) {
    const userId = p.user_id as string;
    if (planByUser.has(userId)) continue; // first = most recent
    planByUser.set(userId, {
      id: p.id as string,
      drillIds: (p.drill_ids as string[] | null) ?? [],
      status: (p.status as string | null) ?? null,
    });
  }

  const planIds = Array.from(planByUser.values(), (p) => p.id);
  if (planIds.length === 0) return summary;

  // 3. This week's sessions for those plans, in one query.
  const weekStart = startOfWeekUTC().toISOString();
  const todayStart = startOfTodayUTC().toISOString();
  const { data: sessions, error: sessionsError } = await admin
    .from("drill_sessions")
    .select("plan_id, drill_id, completed_at")
    .in("plan_id", planIds)
    .gte("completed_at", weekStart);
  if (sessionsError) throw sessionsError;

  const doneThisWeekByPlan = new Map<string, Set<string>>();
  const loggedTodayPlans = new Set<string>();
  for (const s of sessions ?? []) {
    const planId = s.plan_id as string;
    const set = doneThisWeekByPlan.get(planId) ?? new Set<string>();
    set.add(s.drill_id as string);
    doneThisWeekByPlan.set(planId, set);
    if ((s.completed_at as string) >= todayStart) loggedTodayPlans.add(planId);
  }

  // 4. Decide + send per user.
  for (const user of users) {
    const plan = planByUser.get(user.id);
    if (!plan || plan.status === "completed" || plan.status === "abandoned") {
      summary.skipped++;
      continue;
    }

    const planDrills = plan.drillIds
      .map((id) => findDrillById(id))
      .filter((d): d is NonNullable<typeof d> => Boolean(d));
    if (planDrills.length === 0) {
      summary.skipped++;
      continue;
    }

    // Already practiced today — no nudge needed.
    if (loggedTodayPlans.has(plan.id)) {
      summary.skipped++;
      continue;
    }

    // The next drill due this week; undefined means everything's already logged.
    const doneThisWeek = doneThisWeekByPlan.get(plan.id) ?? new Set<string>();
    const nextDrill = planDrills.find((d) => !doneThisWeek.has(d.id));
    if (!nextDrill) {
      summary.skipped++;
      continue;
    }

    try {
      await sendDrillReminder(
        user.email as string,
        nextDrill.name,
        nextDrill.duration
      );
      summary.sent++;
    } catch (err) {
      console.error(`drill reminder failed for ${user.id}`, err);
      summary.errors++;
    }
  }

  return summary;
}
