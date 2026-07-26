import Link from "next/link";

import { LockedCard } from "@/components/ui/locked-card";
import type { HistoryRow, ReadinessPoint, SessionSeries } from "@/lib/progress";
import { ReadinessChart } from "./ReadinessChart";

export interface StreakData {
  streakCount: number;
  weeks: boolean[];
}

interface ChartData {
  series: ReadinessPoint[];
  target: number;
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
  | ({
      kind: "locked";
      currentReadiness: number;
      history: HistoryRow[];
      streak: StreakData;
    } & ChartData);

export function ProgressView({ data }: { data: ProgressViewData }) {
  return (
    <main className="flex min-h-[calc(100dvh-4rem)] flex-col gap-3.5 px-6 py-8">
      <header className="pt-4">
        <h1 className="font-display text-2xl font-bold tracking-[-0.01em]">Progress</h1>
      </header>

      {data.kind === "empty" && <EmptyPrompt />}
      {data.kind === "day-one" && <DayOneState data={data} />}
      {data.kind === "full" && <FullState data={data} />}
      {data.kind === "locked" && <LockedState data={data} />}
    </main>
  );
}

/* ── State 1: Day One ─────────────────────────────────────────── */
function DayOneState({
  data,
}: {
  data: Extract<ProgressViewData, { kind: "day-one" }>;
}) {
  return (
    <>
      <section className="flex flex-col gap-3 rounded-2xl border border-optic bg-optic/[0.05] p-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-optic">
          Your first re-test
        </p>
        <p className="font-display text-[40px] font-extrabold leading-none tracking-[-0.01em]">
          {data.retestDateLabel}
        </p>
        <p className="font-mono text-[11px] tracking-[0.1em] text-ink-2">
          {data.daysUntilRetest > 0
            ? `IN ${data.daysUntilRetest} DAY${data.daysUntilRetest === 1 ? "" : "S"}`
            : "OPEN NOW"}{" "}
          · WEEK {data.weekNumber} OF {data.weeksTarget}
        </p>
        <p className="mt-0.5 text-pretty text-[14px] leading-[1.55] text-ink-2">
          This is the day you find out if {data.bottleneckPhrase} moved.
          Everything until then is building toward it.
        </p>
      </section>

      <div className="flex gap-4">
        <StatCard line1="Sessions" line2="done" value={String(data.sessionsDone)} />
        <StatCard line1="Into the" line2="plan" value={`Day ${data.daysElapsed}`} />
      </div>

      <section className="flex flex-1 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-line-strong px-6 py-10 text-center">
        <svg width="120" height="40" viewBox="0 0 120 40" aria-hidden="true">
          <line
            x1="4"
            y1="30"
            x2="116"
            y2="30"
            stroke="#232327"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <circle cx="4" cy="30" r="3.5" fill="#63635E" />
        </svg>
        <p className="max-w-[230px] text-[13.5px] leading-[1.5] text-ink-3">
          Your readiness line starts on {data.retestDateLabel}. One point today —
          the climb comes after your first re-test.
        </p>
      </section>
    </>
  );
}

function StatCard({
  line1,
  line2,
  value,
}: {
  line1: string;
  line2: string;
  value: string;
}) {
  return (
    <section className="flex flex-1 flex-col gap-2 rounded-2xl border border-line bg-surface p-5">
      <p className="font-mono text-[10px] uppercase leading-tight tracking-[0.14em] text-ink-3">
        {line1}
        <br />
        {line2}
      </p>
      <p className="font-display text-[32px] font-extrabold leading-none">{value}</p>
    </section>
  );
}

/* ── State 2: Full (paid) ─────────────────────────────────────── */
function FullState({ data }: { data: Extract<ProgressViewData, { kind: "full" }> }) {
  return (
    <>
      <Card>
        <ChartContent data={data} />
      </Card>
      <Card>
        <HistoryContent rows={data.history} />
      </Card>
      <Card>
        <StreakContent streak={data.streak} />
      </Card>
    </>
  );
}

/* ── State 3: Locked (free) ───────────────────────────────────── */
function LockedState({
  data,
}: {
  data: Extract<ProgressViewData, { kind: "locked" }>;
}) {
  const up = data.totalChange >= 0;
  return (
    <>
      <section className="flex items-baseline justify-between rounded-2xl border border-line bg-surface p-5">
        <div className="flex flex-col gap-1.5">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
            Readiness now
          </p>
          <p className="font-display text-[40px] font-extrabold leading-none tabular-nums">
            {data.currentReadiness}
          </p>
        </div>
        <p className={`font-mono text-[12px] ${up ? "text-optic" : "text-danger"}`}>
          {up ? "+" : ""}
          {data.totalChange} SINCE START
        </p>
      </section>

      <LockedCard teaser="Your readiness line, over time — unlock Progress to watch the whole climb.">
        <ChartContent data={data} />
      </LockedCard>

      <LockedCard teaser="Re-test history & streaks">
        <HistoryContent rows={data.history} />
      </LockedCard>

      <div className="flex-1" />

      <Link
        href="/paywall?from=/progress"
        className="flex h-14 w-full items-center justify-center rounded-lg bg-optic text-[15px] font-semibold text-optic-ink transition-colors hover:bg-optic-hover active:scale-[0.98]"
      >
        Unlock Progress — $79/year ($6.58/mo)
      </Link>
    </>
  );
}

/* ── Shared card content ──────────────────────────────────────── */
function Card({ children }: { children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-surface p-5">{children}</section>
  );
}

function ChartContent({ data }: { data: ChartData }) {
  const up = data.totalChange >= 0;
  return (
    <>
      <p className="text-pretty text-[12.5px] leading-[1.45] text-ink-3">
        Your readiness score tracks how close you are to 4.0. Each re-test
        shows how much it moved.
      </p>
      <div className="mt-2.5 flex items-baseline justify-between">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-3">
          Readiness — {data.weeksSpan} week{data.weeksSpan === 1 ? "" : "s"}
        </p>
        <p className={`font-mono text-[11px] ${up ? "text-optic" : "text-danger"}`}>
          {up ? "+" : ""}
          {data.totalChange} SINCE START
        </p>
      </div>
      <div className="mt-3.5">
        <ReadinessChart points={data.series} target={data.target} />
      </div>
      <div className="mt-3.5 flex justify-between">
        <span className="font-mono text-[10px] text-ink-3">{data.startLabel}</span>
        <span className="font-mono text-[10px] text-ink-3">
          RE-TEST LINE ···· {data.target}
        </span>
        <span className="font-mono text-[10px] text-ink-3">{data.endLabel}</span>
      </div>

      {data.sessions && <SessionSeriesBlock sessions={data.sessions} />}
    </>
  );
}

/**
 * The subordinate practice series under the readiness line — the real logged
 * scores that drove the climb. Smaller and more muted than the readiness line,
 * but the same optic accent so it reads as one story.
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
    <div className="mt-4 border-t border-line pt-3.5">
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
        Your logged sessions — <span className="text-ink-2">{drillName}</span>
      </p>
      <div className="mt-2.5">
        <SessionSparkline values={values} max={max} />
      </div>
      <div className="mt-2 flex items-baseline justify-between">
        <span className="font-mono text-[12px] tabular-nums text-ink-2">
          {progression}
        </span>
        <span className="font-mono text-[10px] text-ink-3">OF {max}</span>
      </div>
    </div>
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
        stroke="#D8E34C"
        strokeOpacity="0.5"
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
            fill="#D8E34C"
            fillOpacity={last ? 1 : 0.65}
          />
        );
      })}
    </svg>
  );
}

function HistoryContent({ rows }: { rows: HistoryRow[] }) {
  return (
    <>
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-3">
        Re-test history
      </p>
      <div className="mt-2 flex flex-col">
        {rows.map((row, i) => (
          <div key={`${row.label}-${i}`}>
            {i > 0 && <div className="h-px bg-line" />}
            <div className="flex items-center justify-between py-3.5">
              <div className="flex flex-col gap-0.5">
                <span className="text-[14px] font-semibold">{row.label}</span>
                <span className="font-mono text-[10px] text-ink-3">{row.dateLabel}</span>
              </div>
              <span className="font-display text-[17px] font-bold tabular-nums">
                {row.score}
                {row.delta !== null && row.delta !== 0 && (
                  <span
                    className={`ml-1.5 font-mono text-[11px] font-medium ${
                      row.delta > 0 ? "text-optic" : "text-danger"
                    }`}
                  >
                    {row.delta > 0 ? "+" : ""}
                    {row.delta}
                  </span>
                )}
              </span>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function StreakContent({ streak }: { streak: StreakData }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex flex-col gap-1">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-3">
          Streak
        </p>
        <p className="text-[14px] text-ink-2">
          <span className="font-display text-[17px] font-bold text-ink">
            {streak.streakCount} week{streak.streakCount === 1 ? "" : "s"}
          </span>{" "}
          hitting target
        </p>
      </div>
      <div className="flex shrink-0 gap-1.5">
        {streak.weeks.map((hit, i) => (
          <span
            key={i}
            className={
              hit
                ? "h-3 w-3 rounded-[4px] bg-optic"
                : "box-border h-3 w-3 rounded-[4px] border border-line-strong"
            }
          />
        ))}
      </div>
    </div>
  );
}

function EmptyPrompt() {
  return (
    <p className="mt-2 rounded-2xl border border-dashed border-line p-4 text-sm text-ink-2">
      No diagnosis yet.{" "}
      <Link href="/" className="underline underline-offset-4">
        Take the assessment
      </Link>
      .
    </p>
  );
}
