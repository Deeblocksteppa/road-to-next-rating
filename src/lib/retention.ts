import type { SupabaseClient, User } from "@supabase/supabase-js";

import { allRows, inBatches } from "@/lib/supabase/paged";

/**
 * The Privacy Policy's 30 days: results never saved to an account, and
 * sign-ups never confirmed.
 *
 * Deleting an assessment cascades through its diagnoses, plans and drill
 * sessions, and partly claimed sets can exist. So nothing is deleted while
 * any row below it is claimed or has a drill session, and each delete goes from
 * the bottom up, repeating `user_id is null`, and leaves a parent alone if a
 * child is still there. A claim landing mid-run keeps its rows.
 *
 * The real-delete switch is `RETENTION_ENABLED` in the route. A dry run makes
 * the same reads and deletes nothing.
 */
export const RETENTION_DAYS = 30;

export interface RetentionSummary {
  dryRun: boolean;
  cutoff: string;
  /** Rows deleted, or that would be on a dry run. */
  assessments: number;
  diagnoses: number;
  plans: number;
  unconfirmedUsers: number;
  /** Sets kept because a row in them is claimed or has a drill session. */
  skippedPartlyClaimed: number;
  /** Old sets kept because a row below the top one is under 30 days old. */
  skippedRecentRows: number;
  /** Unconfirmed users kept: a sign-in, a Stripe customer or a claimed row. */
  skippedUsers: number;
  errors: number;
}

type Table = "assessments" | "diagnoses" | "plans";
type RowSets = Record<Table, Set<string>>;

interface Row {
  id: string;
  user_id: string | null;
  created_at: string;
}
interface DiagnosisRow extends Row {
  assessment_id: string | null;
}
interface PlanRow extends Row {
  diagnosis_id: string | null;
}

async function rowsWhereIn<T>(
  admin: SupabaseClient,
  table: string,
  columns: string,
  column: string,
  values: string[]
): Promise<T[]> {
  const rows: T[] = [];
  for (const batch of inBatches(Array.from(new Set(values)))) {
    rows.push(
      ...(await allRows<T>(() =>
        admin.from(table).select(columns).in(column, batch).order(column).order("id")
      ))
    );
  }
  return rows;
}

const ROW = "id, user_id, created_at";

/**
 * Which of these unclaimed rows, and everything below them, can go. A row
 * below is what decides: claimed, or holding a drill session, blocks the root.
 * With a `cutoff`, so does one newer than it (a return visit can save a missing
 * plan under an old diagnosis). Without one, age doesn't count: a pending set
 * goes with its unconfirmed sign-up.
 */
async function examine(
  admin: SupabaseClient,
  roots: { assessments: string[]; diagnoses: string[]; plans: string[] },
  cutoff: string | null
) {
  const underAssessments = await rowsWhereIn<DiagnosisRow>(
    admin,
    "diagnoses",
    `${ROW}, assessment_id`,
    "assessment_id",
    roots.assessments
  );
  const rootDiagnoses = await rowsWhereIn<DiagnosisRow>(
    admin,
    "diagnoses",
    `${ROW}, assessment_id`,
    "id",
    roots.diagnoses
  );
  const diagnoses = new Map([...underAssessments, ...rootDiagnoses].map((d) => [d.id, d]));

  const underDiagnoses = await rowsWhereIn<PlanRow>(
    admin,
    "plans",
    `${ROW}, diagnosis_id`,
    "diagnosis_id",
    Array.from(diagnoses.keys())
  );
  const rootPlans = await rowsWhereIn<PlanRow>(admin, "plans", `${ROW}, diagnosis_id`, "id", roots.plans);
  const plans = new Map([...underDiagnoses, ...rootPlans].map((p) => [p.id, p]));

  const sessions = await rowsWhereIn<{ id: string; plan_id: string }>(
    admin,
    "drill_sessions",
    "id, plan_id",
    "plan_id",
    Array.from(plans.keys())
  );
  const plansInUse = new Set(sessions.map((s) => s.plan_id));

  const isClaimed = (row: Row) => row.user_id !== null;
  const isRecent = (row: Row) => cutoff !== null && new Date(row.created_at) >= new Date(cutoff);

  const plansUnder = (diagnosisId: string) =>
    Array.from(plans.values()).filter((p) => p.diagnosis_id === diagnosisId);
  const diagnosesUnder = (assessmentId: string) =>
    Array.from(diagnoses.values()).filter((d) => d.assessment_id === assessmentId);

  const toDelete: RowSets = { assessments: new Set(), diagnoses: new Set(), plans: new Set() };
  const blockedClaimed = new Set<string>();
  const blockedRecent = new Set<string>();

  const planClaimed = (p: PlanRow) => isClaimed(p) || plansInUse.has(p.id);
  const diagnosisClaimed = (d: DiagnosisRow) => isClaimed(d) || plansUnder(d.id).some(planClaimed);
  const diagnosisRecent = (d: DiagnosisRow) => isRecent(d) || plansUnder(d.id).some(isRecent);

  const take = (root: string, claimed: boolean, recent: boolean, accept: () => void) => {
    if (claimed) blockedClaimed.add(root);
    else if (recent) blockedRecent.add(root);
    else accept();
  };
  const acceptDiagnosis = (d: DiagnosisRow) => {
    toDelete.diagnoses.add(d.id);
    for (const p of plansUnder(d.id)) toDelete.plans.add(p.id);
  };

  for (const id of roots.assessments) {
    const under = diagnosesUnder(id);
    take(id, under.some(diagnosisClaimed), under.some(diagnosisRecent), () => {
      toDelete.assessments.add(id);
      under.forEach(acceptDiagnosis);
    });
  }
  for (const d of rootDiagnoses) {
    take(d.id, diagnosisClaimed(d), diagnosisRecent(d), () => acceptDiagnosis(d));
  }
  for (const p of rootPlans) {
    take(p.id, planClaimed(p), isRecent(p), () => toDelete.plans.add(p.id));
  }

  return { toDelete, blockedClaimed, blockedRecent };
}

/** Removes ids that still have a row under them, read just before the delete. */
async function withoutChildren(
  admin: SupabaseClient,
  ids: string[],
  childTable: string,
  childColumn: string
): Promise<string[]> {
  const children = await rowsWhereIn<Record<string, string>>(
    admin,
    childTable,
    `id, ${childColumn}`,
    childColumn,
    ids
  );
  const held = new Set(children.map((c) => c[childColumn]));
  return ids.filter((id) => !held.has(id));
}

async function deleteUnclaimed(admin: SupabaseClient, table: Table, ids: string[]): Promise<number> {
  let deleted = 0;
  for (const batch of inBatches(ids)) {
    const { data, error } = await admin
      .from(table)
      .delete()
      .in("id", batch)
      .is("user_id", null)
      .select("id");
    if (error) throw error;
    deleted += (data ?? []).length;
  }
  return deleted;
}

/** Bottom up, so a row claimed since `examine` read it stops its parents going too. */
async function deleteRows(admin: SupabaseClient, rows: RowSets) {
  const plans = await deleteUnclaimed(admin, "plans", Array.from(rows.plans));
  const diagnoses = await deleteUnclaimed(
    admin,
    "diagnoses",
    await withoutChildren(admin, Array.from(rows.diagnoses), "plans", "diagnosis_id")
  );
  const assessments = await deleteUnclaimed(
    admin,
    "assessments",
    await withoutChildren(admin, Array.from(rows.assessments), "diagnoses", "assessment_id")
  );
  return { assessments, diagnoses, plans };
}

async function listUnconfirmedUsers(admin: SupabaseClient, cutoff: string): Promise<User[]> {
  const users: User[] = [];
  const perPage = 1000;
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    users.push(
      ...data.users.filter(
        (u) =>
          !u.email_confirmed_at && !u.confirmed_at && new Date(u.created_at) < new Date(cutoff)
      )
    );
    if (data.users.length < perPage) return users;
  }
}

/** Unconfirmed users that are safe to delete, and how many aren't. */
async function examineUsers(admin: SupabaseClient, users: User[]) {
  const ids = users.map((u) => u.id);
  const keep = new Set(users.filter((u) => u.last_sign_in_at).map((u) => u.id));

  const profiles = await rowsWhereIn<{ id: string; stripe_customer_id: string | null }>(
    admin,
    "profiles",
    "id, stripe_customer_id",
    "id",
    ids
  );
  for (const p of profiles) if (p.stripe_customer_id) keep.add(p.id);

  for (const table of ["assessments", "diagnoses", "plans", "drill_sessions"]) {
    const owned = await rowsWhereIn<{ id: string; user_id: string }>(
      admin,
      table,
      "id, user_id",
      "user_id",
      ids
    );
    for (const row of owned) keep.add(row.user_id);
  }

  return { deletable: users.filter((u) => !keep.has(u.id)), skipped: keep.size };
}

function pendingIds(users: User[]) {
  const named = (key: string) =>
    users.flatMap((u) => {
      const value = u.user_metadata?.[key];
      return typeof value === "string" && value ? [value] : [];
    });
  return {
    assessments: named("pending_assessment_id"),
    diagnoses: named("pending_diagnosis_id"),
    plans: named("pending_plan_id"),
  };
}

/** Only rows still unclaimed count as roots: a claimed one isn't this sweep's to touch. */
async function onlyUnclaimed(admin: SupabaseClient, table: Table, ids: string[]): Promise<string[]> {
  const rows = await rowsWhereIn<Row>(admin, table, ROW, "id", ids);
  return rows.filter((r) => r.user_id === null).map((r) => r.id);
}

export async function runRetention(
  admin: SupabaseClient,
  { dryRun, now = new Date() }: { dryRun: boolean; now?: Date }
): Promise<RetentionSummary> {
  const cutoff = new Date(now.getTime() - RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const oldUnclaimed = <T>(table: Table, columns: string) =>
    allRows<T>(() =>
      admin.from(table).select(columns).is("user_id", null).lt("created_at", cutoff).order("id")
    );
  const assessments = await oldUnclaimed<{ id: string }>("assessments", "id");
  const diagnoses = await oldUnclaimed<{ id: string; assessment_id: string | null }>(
    "diagnoses",
    "id, assessment_id"
  );
  const plans = await oldUnclaimed<{ id: string; diagnosis_id: string | null }>(
    "plans",
    "id, diagnosis_id"
  );

  // 1. Unclaimed results, and rows RLS let someone insert with no parent.
  const sweep = await examine(
    admin,
    {
      assessments: assessments.map((a) => a.id),
      diagnoses: diagnoses.filter((d) => !d.assessment_id).map((d) => d.id),
      plans: plans.filter((p) => !p.diagnosis_id).map((p) => p.id),
    },
    cutoff
  );

  // Old and unclaimed under a parent that isn't: a parent the sweep never saw.
  // Named by the set's top row, so one set counts once however many rows it has.
  const oldAssessments = new Set(assessments.map((a) => a.id));
  const oldDiagnoses = new Set(diagnoses.map((d) => d.id));
  const claimedParents = await rowsWhereIn<{ id: string; assessment_id: string | null }>(
    admin,
    "diagnoses",
    "id, assessment_id",
    "id",
    plans.flatMap((p) => (p.diagnosis_id && !oldDiagnoses.has(p.diagnosis_id) ? [p.diagnosis_id] : []))
  );
  const underClaimed = [
    ...diagnoses.flatMap((d) =>
      d.assessment_id && !oldAssessments.has(d.assessment_id) ? [d.assessment_id] : []
    ),
    ...claimedParents.map((d) => d.assessment_id ?? d.id),
  ];

  // 2. Sign-ups never confirmed, with the rows their metadata names.
  const unconfirmed = await listUnconfirmedUsers(admin, cutoff);
  const { deletable, skipped } = await examineUsers(admin, unconfirmed);
  const pending = pendingIds(deletable);
  const named = await examine(
    admin,
    {
      assessments: await onlyUnclaimed(admin, "assessments", pending.assessments),
      diagnoses: await onlyUnclaimed(admin, "diagnoses", pending.diagnoses),
      plans: await onlyUnclaimed(admin, "plans", pending.plans),
    },
    null
  );

  const both = (table: Table) =>
    new Set(Array.from(sweep.toDelete[table]).concat(Array.from(named.toDelete[table])));
  const rows: RowSets = {
    assessments: both("assessments"),
    diagnoses: both("diagnoses"),
    plans: both("plans"),
  };

  const summary: RetentionSummary = {
    dryRun,
    cutoff,
    assessments: rows.assessments.size,
    diagnoses: rows.diagnoses.size,
    plans: rows.plans.size,
    unconfirmedUsers: deletable.length,
    skippedPartlyClaimed: new Set(
      Array.from(sweep.blockedClaimed).concat(Array.from(named.blockedClaimed), underClaimed)
    ).size,
    skippedRecentRows: sweep.blockedRecent.size,
    skippedUsers: skipped,
    errors: 0,
  };
  if (dryRun) return summary;

  const deleted = await deleteRows(admin, rows);
  summary.assessments = deleted.assessments;
  summary.diagnoses = deleted.diagnoses;
  summary.plans = deleted.plans;

  summary.unconfirmedUsers = 0;
  for (const user of deletable) {
    try {
      // Read fresh: someone can confirm on day 31 while this runs.
      const { data, error } = await admin.auth.admin.getUserById(user.id);
      if (error) throw error;
      if (data.user.email_confirmed_at || data.user.confirmed_at || data.user.last_sign_in_at) {
        summary.skippedUsers++;
        continue;
      }
      const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
      if (deleteError) throw deleteError;
      summary.unconfirmedUsers++;
    } catch (err) {
      console.error(`retention: couldn't delete unconfirmed user ${user.id}`, err);
      summary.errors++;
    }
  }

  return summary;
}
