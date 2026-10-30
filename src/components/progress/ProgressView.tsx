import Link from "next/link";

import { RetestOpen } from "@/components/retest/RetestOpen";
import { LockedCard } from "@/components/ui/locked-card";
import type { HistoryRow, ReadinessPoint, SessionSeries } from "@/lib/progress";
import { retestHref } from "@/lib/retest-view";
import { ReadinessChart } from "./ReadinessChart";

export interface StreakData {
  streakCount: number;
  weeks: boolean[];
}

interface ChartData {
  series: ReadinessPoint[];
  weeksSpan: number;
  totalChange: number;
  startLabel: string;
  endLabel: string;
  /** Practice series under the readiness line; absent when < 2 scored sessions. */
  sessions?: SessionSeries | null;
}

export type ProgressViewData =
  | { kind: "empty" }
  | {
      kind: "day-one";
      retestDateLabel: string;
      daysUntilRetest: number;
      weekNumber: number;
      weeksTarget: number;
      bottleneckPhrase: string;
      sessionsDone: number;
      daysElapsed: number;
    }
  | ({ kind: "full"; history: HistoryRow[]; streak: StreakData } & ChartData)
  | {
      /**
       * Free tier. Carries only what the screen shows unlocked — the paid
       * chart, history and streak are never loaded for a free player, so the
       * locked cards render placeholders shaped by `readingCount`.
       */
      kind: "locked";
      currentReadiness: number;
      totalChange: number;
      /** Diagnoses on the account, baseline included. */
      readingCount: number;
    };

export function ProgressView({
  data,
  retestOpenFor = null,
}: {
  data: ProgressViewData;
  /**
   * The current plan's re-test is open: the in-sentence skill it tests
   * ("your third-shot drop"). Progress then leads with it in every state.
   */
  retestOpenFor?: string | null;
}) {
  const retestOpen = Boolean(retestOpenFor) && data.kind !== "empty";
  return (
    <main className="flex min-h-app-tabbed flex-col gap-8 px-6 py-8">
      <header className="pt-4">
        <h1 className="font-display text-2xl font-bold tracking-[-0.01em]">Progress</h1>
      </header>

      {/* Open re-test: the screen's main element and its one accent, in every
          state. Anything else that would be optic goes quiet under it. */}
      {retestOpen && <RetestOpen variant="block" skillPhrase={retestOpenFor ?? undefined} />}

      {data.kind === "empty" && <EmptyPrompt />}
      {data.kind === "day-one" && <DayOneState data={data} retestOpen={retestOpen} />}
      {data.kind === "full" && <FullState data={data} retestOpen={retestOpen} />}
      {data.kind === "locked" && <LockedState data={data} retestOpen={retestOpen} />}
    </main>
  );
}

/* ── State 1: Day One ─────────────────────────────────────────── */
/**
 * The re-test date is the page: set straight on the page, not in a tinted
 * card. Under it, two readings split by hairlines and the one-point chart
 * line, as a sentence rather than a dashed box.
 */
function DayOneState({
  data,
  retestOpen,
}: {
  data: Extract<ProgressViewData, { kind: "day-one" }>;
  /** The re-test block above already says it is open and how to take it. */
  retestOpen: boolean;
}) {
  const scheduled = data.retestDateLabel !== "Not scheduled";
  return (
    <>
      {!retestOpen && (
        <section className="flex flex-col gap-3">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3">First re-test</p>
          <p
            className={`font-display font-extrabold leading-none tabular-nums ${
              scheduled ? "text-[56px]" : "text-[32px]"
            }`}
          >
            {data.retestDateLabel}
          </p>
          <p className="font-mono text-[11px] uppercase tabular-nums tracking-[0.1em] text-ink-2">
            {/* No date, no countdown: "Open now" would claim a re-test that isn't scheduled. */}
            {scheduled &&
              (data.daysUntilRetest > 0
                ? `In ${data.daysUntilRetest} day${data.daysUntilRetest === 1 ? "" : "s"} · `
                : "Open now · ")}
            Week {data.weekNumber} of {data.weeksTarget}
          </p>
          <p className="text-pretty text-[16px] leading-[1.6] text-ink-2">
            This is the day you find out if {data.bottleneckPhrase} moved.
          </p>
        </section>
      )}

      <dl className="grid grid-cols-2 border-y border-line">
        <Reading label="Sessions done" value={String(data.sessionsDone)} />
        <Reading label="Into the plan" value={`Day ${data.daysElapsed}`} divided />
      </dl>

      {/*
        One reading exists (the baseline), and a line needs a second one. The
        copy says that and only that; the small mark is the chart's first point.
      */}
      <div className="flex items-start gap-4">
        <svg width="40" height="24" viewBox="0 0 40 24" aria-hidden="true" className="shrink-0">
          <line x1="4" y1="12" x2="36" y2="12" stroke="#2E2E33" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="4" cy="12" r="3.5" fill="#80807B" />
        </svg>
        <p className="text-pretty text-[16px] leading-[1.6] text-ink-2">
          One point so far: your baseline.{" "}
          {retestOpen
            ? "Your re-test, open now, adds the second reading."
            : scheduled
              ? `Your first re-test on ${data.retestDateLabel} adds the second reading.`
              : "Your first re-test adds the second reading."}
        </p>
      </div>
    </>
  );
}

/** One cell of a strip of readings, split from its neighbour by a hairline. */
function Reading({ label, value, divided = false }: { label: string; value: string; divided?: boolean }) {
  return (
    <div className={`flex flex-col gap-3 py-5 ${divided ? "border-l border-line pl-5" : "pr-5"}`}>
      <dt className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3">{label}</dt>
      <dd className="font-display text-[32px] font-extrabold leading-none tabular-nums">{value}</dd>
    </div>
  );
}

/* ── State 2: Full (paid) ─────────────────────────────────────── */
function FullState({
  data,
  retestOpen,
}: {
  data: Extract<ProgressViewData, { kind: "full" }>;
  retestOpen: boolean;
}) {
  const now = data.series.at(-1)?.readiness ?? 0;
  return (
    <>
      <section className="flex flex-col">
        <ReadinessNow now={now} totalChange={data.totalChange} />
        <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3">
          Readiness · {data.weeksSpan} week{data.weeksSpan === 1 ? "" : "s"}
        </p>
        <div className="mt-4">
          {/* The rising line is the screen's accent, unless the re-test holds it. */}
          <ReadinessChart points={data.series} muted={retestOpen} />
        </div>
        <div className="mt-3 flex justify-between font-mono text-[11px] uppercase tabular-nums tracking-[0.1em] text-ink-3">
          <span>{data.startLabel}</span>
          <span>{data.endLabel}</span>
        </div>
      </section>

      <div className="flex flex-col">
        {data.sessions && <SessionSeriesBlock sessions={data.sessions} />}
        <HistoryContent rows={data.history} />
        <StreakContent streak={data.streak} />
      </div>
    </>
  );
}

/* ── State 3: Locked (free) ───────────────────────────────────── */
function LockedState({
  data,
  retestOpen,
}: {
  data: Extract<ProgressViewData, { kind: "locked" }>;
  /** The re-test button above is the screen's one primary; Unlock goes secondary. */
  retestOpen: boolean;
}) {
  return (
    <>
      <ReadinessNow now={data.currentReadiness} totalChange={data.totalChange} />

      <div className="flex flex-col gap-3.5">
        <LockedCard teaser="Your readiness line across every re-test, whichever way it went.">
          <ChartPlaceholder readings={data.readingCount} />
        </LockedCard>

        <LockedCard teaser="Re-test history, with how every skill moved each time.">
          <HistoryPlaceholder readings={data.readingCount} />
        </LockedCard>
      </div>

      <div className="flex-1" />

      {/* No price on an entry point. The paywall this opens shows both plans
          with their full terms; a single price here picked one for the
          player and hid the other. The same rule holds for the Delta screen
          and Settings upgrade buttons. Only the paywall's own Continue
          button names a price, because it confirms the plan just chosen. */}
      <Link
        href="/paywall?from=/progress"
        className={
          retestOpen
            ? "flex h-[52px] w-full items-center justify-center rounded-lg border border-line-strong bg-surface-2 text-[15px] font-semibold text-ink transition-colors hover:border-line-hover active:scale-[0.98]"
            : "flex h-[52px] w-full items-center justify-center rounded-lg bg-optic text-[15px] font-semibold text-optic-ink transition-colors hover:bg-optic-hover active:scale-[0.98]"
        }
      >
        Unlock Progress
      </Link>
    </>
  );
}

/**
 * The current readiness, set on the page: free and paid see the same number,
 * the same change since the first reading, and the same caveat.
 */
function ReadinessNow({ now, totalChange }: { now: number; totalChange: number }) {
  return (
    <section className="flex flex-col gap-3">
      <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3">Readiness now</p>
      <p className="font-display text-[72px] font-extrabold leading-none tabular-nums">
        {now}
        <span className="font-mono text-[15px] font-normal tracking-[0.1em] text-ink-3"> /100</span>
      </p>
      <SinceStart start={now - totalChange} now={now} />
      <p className="text-pretty text-[16px] leading-[1.6] text-ink-2">
        A score from your answers, not a DUPR estimate.
      </p>
    </section>
  );
}

/**
 * Both readings and what changed between them. An equal pair says NO CHANGE
 * in a neutral tone: "+0" in the accent read as a gain.
 */
function SinceStart({ start, now }: { start: number; now: number }) {
  const change = now - start;
  return (
    <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1 font-mono text-[13px] uppercase tabular-nums tracking-[0.1em]">
      <span className="text-ink-3">Since start</span>
      <span>
        <span className="text-ink-3">{start}</span>
        <span aria-hidden="true" className="px-1.5 text-ink-3">
          →
        </span>
        <span className="sr-only"> to </span>
        <span className="text-ink">{now}</span>
      </span>
      <ChangeText change={change} />
    </p>
  );
}

/** "+6", "−4" or NO CHANGE. Gains in ink: the accent belongs to the line or the button. */
function ChangeText({ change }: { change: number }) {
  if (change === 0) return <span className="text-ink-3">No change</span>;
  return (
    <span className={change > 0 ? "text-ink" : "text-danger"}>
      {change > 0 ? `+${change}` : `−${Math.abs(change)}`}
    </span>
  );
}

/* ── Full-state sections ──────────────────────────────────────── */
/** A section under the readiness block: a hairline, a mono label, its content. */
function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col border-t border-line py-6">
      <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3">{label}</p>
      {children}
    </section>
  );
}

/**
 * The subordinate practice series under the readiness line: the scores the
 * player logged in drill sessions over the same span. Context beside the
 * climb, not an input to it — readiness is computed from assessment answers
 * alone, and nothing logged here feeds the engine or the re-test delta.
 * Neutral, so the readiness line keeps the screen's one accent.
 */
function SessionSeriesBlock({ sessions }: { sessions: SessionSeries }) {
  const { drillName, values, max } = sessions;

  // Keep the readable progression short: the full chain when it's brief, else
  // just the endpoints so it never wraps into a wall of numbers.
  const progression =
    values.length <= 7
      ? values.join(" → ")
      : `${values[0]} → … → ${values[values.length - 1]}`;

  return (
    <Section label="Logged sessions">
      <p className="mt-2 text-[16px] font-semibold leading-[1.4] text-ink">{drillName}</p>
      <div className="mt-4">
        <SessionSparkline values={values} max={max} />
      </div>
      <div className="mt-3 flex items-baseline justify-between gap-4">
        <span className="font-mono text-[13px] tabular-nums text-ink-2">{progression}</span>
        <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-ink-3">Of {max}</span>
      </div>
    </Section>
  );
}

/** Session-by-session dots on a thin line — subordinate to the readiness line. */
function SessionSparkline({ values, max }: { values: number[]; max: number }) {
  const n = values.length;
  const LEFT = 6;
  const RIGHT = 294;
  const TOP = 7;
  const BOTTOM = 33;

  const xFor = (i: number) =>
    n <= 1 ? (LEFT + RIGHT) / 2 : LEFT + (i / (n - 1)) * (RIGHT - LEFT);
  const yFor = (v: number) =>
    BOTTOM - (Math.max(0, Math.min(max, v)) / max) * (BOTTOM - TOP);

  const poly = values
    .map((v, i) => `${xFor(i).toFixed(1)},${yFor(v).toFixed(1)}`)
    .join(" ");

  return (
    <svg
      width="100%"
      height="40"
      viewBox="0 0 300 40"
      preserveAspectRatio="none"
      style={{ display: "block" }}
      aria-hidden="true"
    >
      <polyline
        points={poly}
        fill="none"
        stroke="#80807B"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {values.map((v, i) => {
        const last = i === n - 1;
        return (
          <circle
            key={i}
            cx={xFor(i)}
            cy={yFor(v)}
            r={last ? 3 : 2.2}
            fill={last ? "#F4F4F2" : "#B0B0AB"}
          />
        );
      })}
    </svg>
  );
}

/**
 * Every re-test row opens that re-test's full result, per-skill breakdown
 * included, at `/retest/[id]`. The baseline has nothing before it to compare
 * against, so it stays a plain row.
 */
function HistoryContent({ rows }: { rows: HistoryRow[] }) {
  return (
    <Section label="Re-test history">
      <ul className="mt-2 flex flex-col">
        {rows.map((row, i) => {
          const body = (
            <>
              <div className="flex flex-col gap-1">
                <span className="text-[16px] font-semibold leading-[1.3]">{row.label}</span>
                <span className="font-mono text-[11px] uppercase tabular-nums tracking-[0.1em] text-ink-3">
                  {row.dateLabel}
                </span>
              </div>
              <span className="flex items-baseline gap-3">
                {row.delta !== null && (
                  <span className="font-mono text-[13px] uppercase tabular-nums tracking-[0.1em]">
                    <ChangeText change={row.delta} />
                  </span>
                )}
                <span className="font-display text-[20px] font-bold tabular-nums">{row.score}</span>
                {/* The baseline opens nothing; a hidden chevron keeps its score in the column. */}
                <span aria-hidden="true" className={row.id && i > 0 ? "text-ink-3" : "invisible"}>
                  ›
                </span>
              </span>
            </>
          );
          return (
            <li key={row.id ?? `${row.label}-${i}`} className={i > 0 ? "border-t border-line" : ""}>
              {row.id && i > 0 ? (
                <Link
                  href={retestHref(row.id)}
                  aria-label={`${row.label}, ${row.dateLabel}: readiness ${row.score}. See the breakdown`}
                  className="-mx-2 flex items-center justify-between gap-4 rounded-lg px-2 py-4 transition-colors hover:bg-[#17171A]"
                >
                  {body}
                </Link>
              ) : (
                <div className="flex items-center justify-between gap-4 py-4">{body}</div>
              )}
            </li>
          );
        })}
      </ul>
    </Section>
  );
}

/**
 * A run of consecutive weeks in which both sessions were logged (see
 * `getWeeklyStreak`): a week counts when it holds `SESSIONS_PER_WEEK`
 * complete sessions, and an unfinished current week doesn't break the run.
 */
function StreakContent({ streak }: { streak: StreakData }) {
  return (
    <section className="flex items-end justify-between gap-4 border-y border-line py-6">
      <div className="flex flex-col gap-2">
        <p className="text-[16px] font-semibold leading-[1.3] text-ink">Weeks with both sessions</p>
        <p className="flex items-baseline gap-2.5">
          <span className="font-display text-[32px] font-extrabold leading-none tabular-nums">
            {streak.streakCount}
          </span>
          <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3">In a row</span>
        </p>
      </div>
      <span className="flex shrink-0 gap-1.5 pb-1.5" aria-hidden="true">
        {streak.weeks.map((hit, i) => (
          <span
            key={i}
            className={
              hit
                ? "h-2.5 w-2.5 rounded-full bg-ink-2"
                : "box-border h-2.5 w-2.5 rounded-full border border-line-strong"
            }
          />
        ))}
      </span>
    </section>
  );
}

/* ── Locked placeholders ──────────────────────────────────────── */
/**
 * Decoys for the locked cards: the right shape, no values. A flat run of
 * readings rather than a rising line — the placeholder shouldn't promise a
 * climb the player's own chart may not show.
 */
function ChartPlaceholder({ readings }: { readings: number }) {
  const n = Math.max(2, Math.min(readings, 8));
  const xs = Array.from({ length: n }, (_, i) => 12 + (i / (n - 1)) * 276);
  return (
    <>
      <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3">Readiness</p>
      <svg width="100%" height="120" viewBox="0 0 300 120" preserveAspectRatio="none" className="mt-3.5 block">
        <line x1="12" y1="24" x2="288" y2="24" stroke="#2E2E33" strokeDasharray="3 4" />
        <polyline points={xs.map((x) => `${x},70`).join(" ")} fill="none" stroke="#80807B" strokeWidth="2" />
        {xs.map((x) => (
          <circle key={x} cx={x} cy={70} r="3.5" fill="#80807B" />
        ))}
      </svg>
    </>
  );
}

function HistoryPlaceholder({ readings }: { readings: number }) {
  const rows = Math.max(2, Math.min(readings, 4));
  return (
    <>
      <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3">Re-test history</p>
      <div className="mt-2 flex flex-col">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className={`flex items-center justify-between py-4 ${i > 0 ? "border-t border-line" : ""}`}>
            <span className="text-[16px] font-semibold">{i === 0 ? "Baseline" : "Re-test"}</span>
            <span className="font-display text-[20px] font-bold text-ink-3">––</span>
          </div>
        ))}
      </div>
    </>
  );
}

function EmptyPrompt() {
  return (
    <p className="border-y border-line py-5 text-[16px] leading-[1.6] text-ink-2">
      No diagnosis yet.{" "}
      <Link href="/start" className="text-ink underline underline-offset-4">
        Take the assessment
      </Link>
      .
    </p>
  );
}
