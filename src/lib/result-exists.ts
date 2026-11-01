import { createAdminClient } from "@/lib/supabase/admin";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * `expired`: the database answered and a named row is gone (30 days unclaimed).
 * `unknown`: it didn't answer. Nothing is cleared or claimed on this; the next
 * visit asks again, so a device is never wiped because of a failed request.
 */
export type ResultStatus = "exists" | "expired" | "unknown";

/**
 * Whether the rows of a saved result are still there. Service role, because
 * anonymous visitors and new accounts have no SELECT on unclaimed rows, by
 * design. Answers one word about ids the caller already holds, and those ids
 * are unguessable.
 */
export async function resultRowsStatus(ids: {
  assessment: string | null;
  diagnosis: string | null;
  plan: string | null;
}): Promise<ResultStatus> {
  const named = [
    ["assessments", ids.assessment],
    ["diagnoses", ids.diagnosis],
    ["plans", ids.plan],
  ] as const;

  try {
    const admin = createAdminClient();
    for (const [table, id] of named) {
      if (!id) continue;
      if (typeof id !== "string" || !UUID.test(id)) return "expired";
      const { data, error } = await admin.from(table).select("id").eq("id", id).maybeSingle();
      if (error) {
        console.error("resultRowsStatus: read failed", error.code);
        return "unknown";
      }
      if (!data) return "expired";
    }
    return "exists";
  } catch (err) {
    console.error("resultRowsStatus: unexpected failure", err);
    return "unknown";
  }
}
