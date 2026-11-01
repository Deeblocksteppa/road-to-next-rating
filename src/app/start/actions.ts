"use server";

import { resultRowsStatus, type ResultStatus } from "@/lib/result-exists";

/** See `resultRowsStatus`. Called with the ids stored on the visitor's device. */
export async function resultStatus(ids: {
  assessment: string | null;
  diagnosis: string | null;
  plan: string | null;
}): Promise<ResultStatus> {
  return resultRowsStatus(ids);
}
