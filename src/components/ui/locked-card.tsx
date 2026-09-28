/**
 * The locked/blur treatment used wherever free-tier content is teased:
 * real structure blurred behind a dim scrim, a lock icon, and a one-line
 * teaser naming what's underneath. Never a hard empty box.
 * See DESIGN_SYSTEM.md §5 "Locked / blur treatment".
 *
 * What goes underneath is a placeholder of the right shape, never the paid
 * data itself: CSS blur hides nothing from view-source, devtools or a screen
 * reader. The blurred layer is also `aria-hidden` and `inert`, so assistive
 * tech announces the teaser, not the decoy rows behind it.
 */
export function LockedCard({
  label,
  teaser,
  children,
}: {
  /** Optional small-caps line with an inline lock icon, shown above the teaser. */
  label?: string;
  teaser: string;
  children: React.ReactNode;
}) {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-line bg-surface p-5">
      {/* React 18.3 drops a boolean `inert` (it isn't a known attribute until
          React 19) but renders a string one; @types/react types it boolean. */}
      <div
        aria-hidden="true"
        {...({ inert: "" } as object)}
        className="pointer-events-none select-none opacity-[0.45] blur-[7px]"
      >
        {children}
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-b from-[rgba(19,19,21,0.4)] to-[rgba(19,19,21,0.7)] px-6 text-center">
        {label ? (
          <div className="flex items-center gap-1.5">
            <LockIcon size={13} />
            <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-2">
              {label}
            </span>
          </div>
        ) : (
          <LockIcon />
        )}
        <p className="max-w-[240px] text-pretty text-[13px] leading-[1.4] text-ink-2">
          {teaser}
        </p>
      </div>
    </section>
  );
}

export function LockIcon({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="text-ink-2"
    >
      <rect x="4" y="10" width="16" height="10" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}
