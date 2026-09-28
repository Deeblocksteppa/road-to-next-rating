"use client";

import type { AnswerMap } from "@/lib/types";

/**
 * The anonymous player's result, kept on this device.
 *
 * Only the answers are stored. The engine is deterministic, so `diagnose` and
 * `generateRoadmap` rebuild the identical diagnosis and plan from them on any
 * later visit. The Supabase rows the funnel writes can't serve this: they are
 * unclaimed (user_id NULL) and RLS gives anonymous visitors no SELECT on them,
 * by design, so nobody can list other people's results.
 *
 * Cleared when the rows are claimed into an account (the plan then lives in
 * the account) and when the player starts over.
 */

const KEY = "rtnr:result";

export interface LocalResult {
  answers: AnswerMap;
  /** ISO timestamp of when the assessment was completed. */
  savedAt: string;
}

export function saveLocalResult(answers: AnswerMap): void {
  try {
    const value: LocalResult = { answers, savedAt: new Date().toISOString() };
    localStorage.setItem(KEY, JSON.stringify(value));
  } catch {
    // Private mode or storage disabled: the result still shows for this
    // visit, it just won't be here next time.
  }
}

export function loadLocalResult(): LocalResult | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<LocalResult>;
    if (!parsed || typeof parsed.answers !== "object" || parsed.answers === null) return null;
    return { answers: parsed.answers as AnswerMap, savedAt: String(parsed.savedAt ?? "") };
  } catch {
    return null;
  }
}

export function clearLocalResult(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
