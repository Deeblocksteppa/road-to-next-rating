import { Resend } from "resend";

/**
 * Transactional email via Resend.
 *
 * Sender: Resend's shared test domain (onboarding@resend.dev) until a custom
 * domain is verified. That domain only reliably delivers to the Resend account
 * owner's own address — good enough to test the reminder flow; swap FROM for a
 * verified address (e.g. reminders@yourdomain) once the domain is set up.
 */
const FROM = "Road to Next Rating <onboarding@resend.dev>";

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
  drillName: string,
  duration: string
) {
  const subject = "Today's session is still open";
  const line = `${drillName} is still due today — ${duration}. Come back and log it when you're ready.`;

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
