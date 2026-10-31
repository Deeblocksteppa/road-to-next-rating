import type { SupabaseClient } from "@supabase/supabase-js";

import { SKILL_LABELS } from "@/lib/diagnoses";
import { startOfTodayUTC } from "@/lib/drill-sessions";
import { renderRetestReminder, sendReminder } from "@/lib/email";
import { emailOrigin } from "@/lib/site-url";
import { allRows, inBatches } from "@/lib/supabase/paged";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SkillId } from "@/lib/types";
import { unsubscribeLinks } from "@/lib/unsubscribe";

/**
 * A missed cron run catches up for this many days after the date. It also
 * means the first deploy can't mass-email every old plan.
 */
const CATCH_UP_DAYS = 2;

export interface RetestReminderSummary {
  candidates: number;
  sent: number;
  /** Dry runs only: how many would have gone. */
  wouldSend: number;
  /** Lost the claim to another run, so this run didn't send. */
  alreadyClaimed: number;
  errors: number;
  /**
   * `plans.retest_reminder_sent_at` isn't on the database yet. A real run then
   * sends nothing, because sending without a record is how doubles happen.
   */
  columnMissing: boolean;
}

export interface RetestReminderTarget {
  planId: string;
  userId: string;
  email: string;
  skill: string;
}

function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function isMissingColumn(err: unknown): boolean {
  return (err as { code?: string } | null)?.code === "42703";
}

/**
 * Who gets the email: re-test reminders on, the player's newest plan by
 * created_at (the plan `openRetestPlan` checks, so the email never says open
 * when the gate says closed), status active, date inside the window, not yet
 * sent. A finished re-test makes a newer plan with a future date, so a player
 * who already took it drops out on the newest-plan check.
 *
 * `retest_date` is a date column and the gate counts UTC days, so comparing
 * date strings gives the same answer as `getPlanTimeline`.
 */
export async function findRetestReminders(
  admin: SupabaseClient,
  { unsentOnly = true }: { unsentOnly?: boolean } = {}
): Promise<RetestReminderTarget[]> {
  const today = startOfTodayUTC();
  const earliest = new Date(today.getTime() - CATCH_UP_DAYS * 24 * 60 * 60 * 1000);

  const inWindow = await allRows<{ id: string; user_id: string; diagnosis_id: string | null }>(() => {
    const query = admin
      .from("plans")
      .select("id, user_id, diagnosis_id")
      .eq("status", "active")
      .not("user_id", "is", null)
      .gte("retest_date", isoDay(earliest))
      .lte("retest_date", isoDay(today));
    return (unsentOnly ? query.is("retest_reminder_sent_at", null) : query).order("id");
  });
  if (inWindow.length === 0) return [];

  const userIds = Array.from(new Set(inWindow.map((p) => p.user_id)));
  const newestByUser = new Map<string, string>();
  const profileEmail = new Map<string, string>();

  for (const batch of inBatches(userIds)) {
    const plans = await allRows<{ id: string; user_id: string }>(() =>
      admin
        .from("plans")
        .select("id, user_id")
        .in("user_id", batch)
        .order("created_at", { ascending: false })
        .order("id")
    );
    for (const p of plans) {
      if (!newestByUser.has(p.user_id)) newestByUser.set(p.user_id, p.id);
    }

    const profiles = await allRows<{ id: string; email: string }>(() =>
      admin
        .from("profiles")
        .select("id, email")
        .in("id", batch)
        .eq("retest_reminder_enabled", true)
        .not("email", "is", null)
        .order("id")
    );
    for (const p of profiles) profileEmail.set(p.id, p.email);
  }

  const due = inWindow.filter(
    (p) => newestByUser.get(p.user_id) === p.id && profileEmail.has(p.user_id) && p.diagnosis_id
  );

  const skillByDiagnosis = new Map<string, string>();
  for (const batch of inBatches(due.map((p) => p.diagnosis_id as string))) {
    const diagnoses = await allRows<{ id: string; bottleneck: SkillId | null }>(() =>
      admin.from("diagnoses").select("id, bottleneck").in("id", batch).order("id")
    );
    for (const d of diagnoses) {
      const skill = d.bottleneck ? SKILL_LABELS[d.bottleneck] : undefined;
      if (skill) skillByDiagnosis.set(d.id, skill);
    }
  }

  return due.flatMap((p) => {
    const skill = skillByDiagnosis.get(p.diagnosis_id as string);
    return skill
      ? [{ planId: p.id, userId: p.user_id, email: profileEmail.get(p.user_id) as string, skill }]
      : [];
  });
}

/** True only for the run that set it, so a rerun or a second delivery finds nothing to claim. */
async function claim(admin: SupabaseClient, planId: string): Promise<boolean> {
  const { data, error } = await admin
    .from("plans")
    .update({ retest_reminder_sent_at: new Date().toISOString() })
    .eq("id", planId)
    .is("retest_reminder_sent_at", null)
    .select("id");
  if (error) throw error;
  return (data ?? []).length > 0;
}

/**
 * Daily re-test reminder pass, one email per plan. Claims first, then sends: a
 * failed send releases the claim so the window retries it, and Resend's
 * idempotency key covers a crash between the send and the release. A crash
 * between the claim and the send loses that email, which beats sending twice.
 */
export async function runRetestReminders(
  { dryRun = false }: { dryRun?: boolean } = {},
  admin: SupabaseClient = createAdminClient()
): Promise<RetestReminderSummary> {
  const summary: RetestReminderSummary = {
    candidates: 0,
    sent: 0,
    wouldSend: 0,
    alreadyClaimed: 0,
    errors: 0,
    columnMissing: false,
  };

  let targets: RetestReminderTarget[];
  try {
    targets = await findRetestReminders(admin);
  } catch (err) {
    if (!isMissingColumn(err)) throw err;
    summary.columnMissing = true;
    console.error("retest reminders: plans.retest_reminder_sent_at is missing, sending nothing");
    if (!dryRun) return summary;
    targets = await findRetestReminders(admin, { unsentOnly: false });
  }
  summary.candidates = targets.length;

  if (dryRun) {
    summary.wouldSend = targets.length;
    return summary;
  }

  for (const target of targets) {
    let claimed = false;
    try {
      const links = unsubscribeLinks(target.userId, "retest");
      const email = renderRetestReminder({
        skill: target.skill,
        retestUrl: `${emailOrigin()}/retest`,
        unsubscribeUrl: links.page,
      });

      claimed = await claim(admin, target.planId);
      if (!claimed) {
        summary.alreadyClaimed++;
        continue;
      }

      await sendReminder(target.email, email, links.oneClick, `retest-reminder/${target.planId}`);
      summary.sent++;
    } catch (err) {
      console.error(`retest reminder failed for ${target.userId}`, err);
      summary.errors++;
      if (claimed) {
        const { error } = await admin
          .from("plans")
          .update({ retest_reminder_sent_at: null })
          .eq("id", target.planId);
        if (error) console.error(`retest reminder release failed for ${target.planId}`, error);
      }
    }
  }

  return summary;
}
