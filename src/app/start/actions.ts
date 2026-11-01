"use server";

import { resultRowsExist } from "@/lib/result-exists";

/** See `resultRowsExist`. Called with the ids stored on the visitor's device. */
export async function resultStillExists(ids: {
  assessment: string | null;
  diagnosis: string | null;
  plan: string | null;
}): Promise<boolean> {
  return resultRowsExist(ids);
}
