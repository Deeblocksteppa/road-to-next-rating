import { findDrillById } from "@/lib/drill-lookup";
import { startOfTodayUTC, startOfWeekUTC } from "@/lib/drill-sessions";
import { sendDrillReminder } from "@/lib/email";
import {
  SESSIONS_PER_WEEK,
  countSessions,
  sessionShape,
  type LoggedDrill,
} from "@/lib/session-plan";
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
 *   • has NOT logged anything today, and
 *   • has completed fewer than `SESSIONS_PER_WEEK` sessions this week.
 *
 * A session is every drill on the plan logged on one day (`session-plan.ts`),
 * so the email describes the whole session — its length and each drill —
 * rather than naming a single drill as "due".
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

  const loggedThisWeekByPlan = new Map<string, LoggedDrill[]>();
  const loggedTodayPlans = new Set<string>();
  for (const s of sessions ?? []) {
    const planId = s.plan_id as string;
    const list = loggedThisWeekByPlan.get(planId) ?? [];
    list.push({
      planId,
      drillId: s.drill_id as string,
      completedAt: s.completed_at as string,
    });
    loggedThisWeekByPlan.set(planId, list);
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

    // Sessions still owed this week; none left means no nudge.
    const done = countSessions(
      loggedThisWeekByPlan.get(plan.id) ?? [],
      planDrills.length
    );
    const sessionsLeft = SESSIONS_PER_WEEK - done;
    if (sessionsLeft <= 0) {
      summary.skipped++;
      continue;
    }

    try {
      await sendDrillReminder(
        user.email as string,
        sessionsLeft,
        sessionShape(planDrills),
        planDrills.map((d) => `${d.name} (${d.duration})`).join(", ")
      );
      summary.sent++;
    } catch (err) {
      console.error(`drill reminder failed for ${user.id}`, err);
      summary.errors++;
    }
  }

  return summary;
}
