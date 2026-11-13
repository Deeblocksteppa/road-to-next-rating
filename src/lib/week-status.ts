import { monthDay } from "@/lib/date-format";
import { startOfTodayUTC, startOfWeekUTC } from "@/lib/drill-sessions";

/**
 * Where today sits in the week and in the plan: what the lines about "what
 * comes next" need, worked out once so the plan, Home and the session recap
 * can't disagree.
 *
 * A week is Monday to Sunday UTC (`startOfWeekUTC`), and a drill can be logged
 * once per UTC day, so on the week's last day a player who has just finished
 * a session has no other day left in it. And in a plan's final week there is
 * no "next week's sessions": what comes next is the re-test.
 *
 * Plain data, so the server can work it out and hand it to a client component.
 */
export interface WeekContext {
  /** Today is the week's last day: no other day is left for a session this week. */
  lastDay: boolean;
  /** No plan week is left after this one: the re-test date is on or before next Monday. */
  finalWeek: boolean;
  /** The re-test date has arrived. The re-test's own block says so; these lines don't. */
  retestOpen: boolean;
  /** "Dec 2". Null when the plan has no re-test date. */
  retestLabel: string | null;
  /** "Monday, Nov 16": when next week's sessions open. */
  nextWeekLabel: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function weekContext(retestDate: string | null, now: Date = new Date()): WeekContext {
  const today = startOfTodayUTC(now).getTime();
  const nextWeekStart = startOfWeekUTC(now).getTime() + 7 * DAY_MS;
  // retest_date is a date-only column, which parses as UTC midnight.
  const retest = retestDate ? new Date(retestDate) : null;
  return {
    lastDay: today + DAY_MS >= nextWeekStart,
    finalWeek: retest !== null && retest.getTime() <= nextWeekStart,
    retestOpen: retest !== null && retest.getTime() <= today,
    retestLabel: retest ? monthDay(retest) : null,
    nextWeekLabel: `Monday, ${monthDay(new Date(nextWeekStart))}`,
  };
}

interface WeekCount {
  completed: number;
  total: number;
}

function weekDone(weekly: WeekCount): boolean {
  return weekly.total > 0 && weekly.completed >= weekly.total;
}

/** The re-test is what comes next, and it isn't open yet: name its date. */
function retestNext(ctx: WeekContext): string | null {
  return ctx.finalWeek && !ctx.retestOpen && ctx.retestLabel ? ctx.retestLabel : null;
}

/**
 * The plan's status line, shown in place of "Start session" when there is no
 * session to start: today's is done, or the week's two are.
 *
 * `loggedToday` (`loggedThisUtcDay`): something was logged on the current UTC
 * day. "Done today" follows the sitting, which reaches back six hours past
 * midnight UTC; a session logged late on Saturday UTC still reads as done for
 * a while on Sunday, but Sunday itself is open, so the "week ends today"
 * wording would be false then.
 */
export function planStatusLine(
  ctx: WeekContext,
  weekly: WeekCount,
  todayDone: boolean,
  loggedToday: boolean
): string {
  const retest = retestNext(ctx);
  if (todayDone) {
    if (weekDone(weekly)) return "Today's session complete. Both sessions done this week.";
    if (ctx.lastDay && loggedToday) {
      if (retest) return `Today's session complete. Your re-test opens ${retest}.`;
      return ctx.retestOpen
        ? "Today's session complete."
        : "Today's session complete. Next week's sessions open Monday.";
    }
    return `Today's session complete. ${weekly.total - weekly.completed} to go this week.`;
  }
  if (retest) return `Both sessions done this week. Your re-test opens ${retest}.`;
  return ctx.retestOpen
    ? "Both sessions done this week."
    : "Both sessions done this week. Next week's open Monday.";
}

/**
 * Under the session recap's "1 of 2 sessions this week.": what comes next.
 * Not used while the re-test is open; its block is what comes next then.
 */
export function recapSupportLine(ctx: WeekContext, weekly: WeekCount, loggedToday: boolean): string {
  const retest = retestNext(ctx);
  if (weekDone(weekly)) {
    return retest
      ? `That's the week. Your re-test opens ${retest}.`
      : `That's the week. Next sessions open ${ctx.nextWeekLabel}.`;
  }
  if (ctx.lastDay && loggedToday) {
    return retest
      ? `This week ends today. Your re-test opens ${retest}.`
      : `This week ends today. Next week's sessions open ${ctx.nextWeekLabel}.`;
  }
  return "Next session: any other day this week.";
}

/**
 * Home's line under the session button: what comes next, when it isn't the
 * button itself. Null when nothing needs saying: a session to start with no
 * re-test date has the button, and an open re-test has its own block. The
 * one line that still shows beside an open re-test is "1 more session this
 * week…" on a day with today's done: it is about sessions, not the re-test.
 */
export function homeCaption(
  ctx: WeekContext,
  weekly: WeekCount,
  today: { todayDone: boolean; allDone: boolean },
  daysUntilRetest: number | null,
  loggedToday: boolean
): string | null {
  const retest = retestNext(ctx);
  if (today.todayDone && !weekDone(weekly)) {
    if (ctx.lastDay && loggedToday) {
      if (ctx.retestOpen) return null;
      return retest
        ? `This week ends today. Your re-test opens ${retest}.`
        : `This week ends today. Next week's sessions open ${ctx.nextWeekLabel}.`;
    }
    const left = Math.max(0, weekly.total - weekly.completed);
    return `${left} more session${left === 1 ? "" : "s"} this week. Pick any other day.`;
  }
  if (ctx.retestOpen) return null;
  if (today.allDone) {
    return retest ? `Your re-test opens ${retest}.` : `Next sessions unlock ${ctx.nextWeekLabel}`;
  }
  return daysUntilRetest !== null && daysUntilRetest > 0
    ? `Re-test opens in ${daysUntilRetest} day${daysUntilRetest === 1 ? "" : "s"}`
    : null;
}
