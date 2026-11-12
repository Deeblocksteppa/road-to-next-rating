/**
 * Label and value rows between hairlines: the plan's shape (PLAN, SESSION,
 * THIS WEEK, RE-TEST) and a drill's facts (TIME, WHO, COUNTS, LOG, TARGET).
 *
 * The label is a mono reading. The value is in the body voice at 16px,
 * because most values run past the three words a mono label can carry
 * ("3 weeks · 2 sessions a week", a whole "counts if" sentence).
 */
export function ReadingRows({
  rows,
  className = "",
}: {
  rows: { label: string; value: React.ReactNode }[];
  className?: string;
}) {
  return (
    <dl className={`border-b border-line ${className}`}>
      {rows.map((row) => (
        <div key={row.label} className="grid grid-cols-[84px_minmax(0,1fr)] items-baseline gap-x-4 border-t border-line py-2.5">
          <dt className="font-mono text-[11px] uppercase leading-[1.6] tracking-[0.14em] text-ink-3">
            {row.label}
          </dt>
          <dd className="text-pretty text-[16px] leading-[1.5] tabular-nums text-ink">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}
