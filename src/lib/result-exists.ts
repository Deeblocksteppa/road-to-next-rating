import { createAdminClient } from "@/lib/supabase/admin";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Whether the rows of a saved result are still there, or were deleted after 30
 * days unclaimed. Service role, because anonymous visitors and new accounts
 * have no SELECT on unclaimed rows, by design. Answers one boolean about ids
 * the caller already holds, and those ids are unguessable.
 *
 * False only when the database answered and a named row is gone. A failed
 * request reads as still there: a device must never be wiped because of one.
 */
export async function resultRowsExist(ids: {
  assessment: string | null;
  diagnosis: string | null;
  plan: string | null;
}): Promise<boolean> {
  const named = [
    ["assessments", ids.assessment],
    ["diagnoses", ids.diagnosis],
    ["plans", ids.plan],
  ] as const;

  try {
    const admin = createAdminClient();
    for (const [table, id] of named) {
      if (!id) continue;
      if (typeof id !== "string" || !UUID.test(id)) return false;
      const { data, error } = await admin.from(table).select("id").eq("id", id).maybeSingle();
      if (error) {
        console.error("resultRowsExist: read failed", error.code);
        return true;
      }
      if (!data) return false;
    }
    return true;
  } catch (err) {
    console.error("resultRowsExist: unexpected failure", err);
    return true;
  }
}
