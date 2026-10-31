import { createHmac, timingSafeEqual } from "node:crypto";

import { emailOrigin } from "@/lib/site-url";

/**
 * Unsubscribe links that work without signing in. A token names one user and
 * one reminder type, signed with EMAIL_UNSUBSCRIBE_SECRET. It has no expiry, so
 * an old email keeps working; rotating the secret kills every old link, and
 * those show the invalid page, which points to Settings.
 */
export type ReminderType = "drill" | "retest";

export const REMINDER_COLUMN = {
  drill: "drill_reminder_enabled",
  retest: "retest_reminder_enabled",
} as const satisfies Record<ReminderType, string>;

/** The in-sentence name, on the confirm page. */
export const REMINDER_NAME: Record<ReminderType, string> = {
  drill: "session reminders",
  retest: "re-test reminders",
};

const TOKEN = /^([0-9a-f-]{36})\.(drill|retest)\.([A-Za-z0-9_-]+)$/i;

function signature(secret: string, userId: string, type: ReminderType): Buffer {
  return createHmac("sha256", secret).update(`unsubscribe:${userId}:${type}`).digest();
}

/** Throws with no secret: a reminder must not go out without a working link. */
export function createUnsubscribeToken(userId: string, type: ReminderType): string {
  const secret = process.env.EMAIL_UNSUBSCRIBE_SECRET;
  if (!secret) throw new Error("EMAIL_UNSUBSCRIBE_SECRET is not set.");
  return `${userId}.${type}.${signature(secret, userId, type).toString("base64url")}`;
}

/** Null for anything not signed by the current secret. */
export function verifyUnsubscribeToken(
  token: string | null | undefined
): { userId: string; type: ReminderType } | null {
  const secret = process.env.EMAIL_UNSUBSCRIBE_SECRET;
  if (!secret || !token) return null;

  const match = TOKEN.exec(token);
  if (!match) return null;
  const [, userId, type, sent] = match;

  const expected = signature(secret, userId, type as ReminderType);
  const given = Buffer.from(sent, "base64url");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;

  return { userId, type: type as ReminderType };
}

/** `page` goes in the email body; `oneClick` goes in the List-Unsubscribe header. */
export function unsubscribeLinks(userId: string, type: ReminderType) {
  const token = encodeURIComponent(createUnsubscribeToken(userId, type));
  const origin = emailOrigin();
  return {
    page: `${origin}/unsubscribe?token=${token}`,
    oneClick: `${origin}/api/unsubscribe?token=${token}`,
  };
}
