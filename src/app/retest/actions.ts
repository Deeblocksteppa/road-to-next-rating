"use server";

import { revalidatePath } from "next/cache";

import { saveRetest } from "@/lib/retest-save";
import { createClient } from "@/lib/supabase/server";
import type { AnswerMap } from "@/lib/types";

/**
 * Re-test flow for a logged-in user. Runs the new answers through the same
 * engine, saves a new assessment + diagnosis owned by the user, creates a
 * fresh plan for the new bottleneck and retires the old active plan, and
 * returns the new diagnosis's id. A second submit against the same plan
 * returns the first one's id (`saveRetest`).
 *
 * It returns nothing else on purpose. The result screen lives at
 * `/retest/[id]` and is built on the server from the stored rows
 * (`loadRetestView`), which is where the free/paid decision is made. This
 * action used to return the full per-skill delta to every tier and leave the
 * client to blur it, so a free player's browser held the paid breakdown, and
 * the result existed only in that tab: nothing could show it again, including
 * after the player paid to see it.
 */
export async function submitRetest(answers: AnswerMap): Promise<{ diagnosisId: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // The gate, the saves and the one-re-test-per-plan guard (`retest-save.ts`).
  const result = await saveRetest(supabase, user.id, answers);

  revalidatePath("/home");
  revalidatePath("/plan");
  revalidatePath("/progress");

  return result;
}
