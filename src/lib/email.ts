import { Resend } from "resend";

/**
 * Transactional email via Resend.
 *
 * Sender: hello@roadtonextrating.com. Resend only sends from a domain that is
 * verified in the Resend account, so roadtonextrating.com must be verified
 * there or every send fails.
 *
 * Rendering is separate from sending, so an email can be read without one
 * going out.
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

export interface RenderedEmail {
  subject: string;
  text: string;
  html: string;
}

const FONT = "font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;";
const BODY = `${FONT}font-size:16px;line-height:1.6;color:#1a1a1a;`;
const FOOTER = `${FONT}font-size:15px;line-height:1.6;color:#666666;`;

/** A sentence that may end in a link: "Unsubscribe: https://…". */
type Line = { copy: string; link?: string };

function lineText({ copy, link }: Line): string {
  return link ? `${copy} ${link}` : copy;
}

function lineHtml({ copy, link }: Line, style: string): string {
  const anchor = link ? ` <a href="${link}" style="color:inherit;">${link}</a>` : "";
  return `<p style="${style}">${copy}${anchor}</p>`;
}

function render(subject: string, body: Line, footer: Line): RenderedEmail {
  return {
    subject,
    text: `${lineText(body)}\n\n${lineText(footer)}`,
    html: `${lineHtml(body, BODY)}${lineHtml(footer, FOOTER)}`,
  };
}

/**
 * Nudge that today's drill is still open. Deliberately plain and factual —
 * states what's due and that they can log it when ready. No exclamation, no
 * guilt, matching the app's restrained coach voice.
 */
export function renderDrillReminder(opts: {
  /** Sessions still to do this week, e.g. 2. */
  sessionsLeft: number;
  /** "25 minutes, 2 drills" */
  shape: string;
  /** "Reset Ladder (15 min), Wall Reset (10 min)" */
  drillList: string;
  unsubscribeUrl: string;
}): RenderedEmail {
  const { sessionsLeft, shape, drillList, unsubscribeUrl } = opts;
  return render(
    sessionsLeft === 1 ? "One session left this week" : `${sessionsLeft} sessions left this week`,
    {
      copy: `You have ${sessionsLeft} session${sessionsLeft === 1 ? "" : "s"} left this week. One session is ${shape}: ${drillList}. Log it when you're ready.`,
    },
    {
      copy: "You're getting this because session reminders are on. Unsubscribe:",
      link: unsubscribeUrl,
    }
  );
}

export function renderRetestReminder(opts: {
  /** The in-sentence name, from `SKILL_LABELS`: "your third-shot drop". */
  skill: string;
  retestUrl: string;
  unsubscribeUrl: string;
}): RenderedEmail {
  return render(
    "Your re-test is open",
    {
      copy: `Three weeks ago you started training ${opts.skill}. Your re-test is open now. Take it and see what changed:`,
      link: opts.retestUrl,
    },
    {
      copy: "You're getting this because re-test reminders are on. Unsubscribe:",
      link: opts.unsubscribeUrl,
    }
  );
}

/**
 * Sends a reminder with the one-click unsubscribe headers mail providers ask
 * of bulk senders. `idempotencyKey` makes Resend drop a repeat of the same key
 * for 24 hours.
 */
export async function sendReminder(
  to: string,
  email: RenderedEmail,
  oneClickUrl: string,
  idempotencyKey?: string
) {
  const { data, error } = await resend().emails.send(
    {
      from: FROM,
      to,
      subject: email.subject,
      text: email.text,
      html: email.html,
      headers: {
        "List-Unsubscribe": `<${oneClickUrl}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    },
    idempotencyKey ? { idempotencyKey } : undefined
  );

  if (error) throw error;
  return data;
}
