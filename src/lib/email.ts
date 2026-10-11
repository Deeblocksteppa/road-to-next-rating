import { Resend } from "resend";

/**
 * Transactional email via Resend.
 *
 * Sender: hello@roadtonextrating.com. Resend only sends from a domain that is
 * verified in the Resend account, so roadtonextrating.com must be verified
 * there or every send fails.
 */
const FROM = "Road to Next Rating <hello@roadtonextrating.com>";

let client: Resend | null = null;
function resend(): Resend {
  if (!client) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) throw new Error("RESEND_API_KEY is not set.");
    client = new Resend(apiKey);
  }
  return client;
}

/**
 * Nudge that today's drill is still open. Deliberately plain and factual —
 * states what's due and that they can log it when ready. No exclamation, no
 * guilt, matching the app's restrained coach voice.
 */
export async function sendDrillReminder(
  userEmail: string,
  /** Sessions still to do this week, e.g. 2. */
  sessionsLeft: number,
  /** "25 minutes, 2 drills" */
  shape: string,
  /** "Reset Ladder (15 min), Wall Reset (10 min)" */
  drillList: string
) {
  const subject =
    sessionsLeft === 1 ? "One session left this week" : `${sessionsLeft} sessions left this week`;
  const line = `You have ${sessionsLeft} session${sessionsLeft === 1 ? "" : "s"} left this week. One session is ${shape}: ${drillList}. Log it when you're ready.`;

  const { data, error } = await resend().emails.send({
    from: FROM,
    to: userEmail,
    subject,
    text: line,
    html: `<p style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#1a1a1a;">${line}</p>`,
  });

  if (error) throw error;
  return data;
}
