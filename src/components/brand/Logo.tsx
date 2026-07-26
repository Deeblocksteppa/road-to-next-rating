/**
 * The mark: two strokes on a 32px grid, round caps — a flat plateau (ink-3)
 * broken by an accent line (optic). Never rendered in a single color.
 * See DESIGN_SYSTEM.md §0 / §2.
 */
export function LogoMark({
  size = 20,
  strokeWidth = 3.6,
}: {
  size?: number;
  strokeWidth?: number;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <path
        d="M4 22.5 H15.5"
        stroke="#63635E"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M15.5 22.5 L28 9.5"
        stroke="#D8E34C"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

/** In-app header lockup: mark + "ROAD TO NEXT" wordmark. */
export function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <LogoMark />
      <span
        className="font-display text-xs font-extrabold tracking-[0.08em]"
        style={{ fontStretch: "125%" }}
      >
        ROAD TO NEXT
      </span>
    </div>
  );
}

/**
 * Full lockup: mark + "ROAD TO NEXT" + the "RATING" mono subtitle — the
 * standalone logo construction from DESIGN_SYSTEM.md's LOGO section, not the
 * compact in-app header. Landing only.
 */
export function LogoFull() {
  return (
    <div className="flex items-center gap-[18px]">
      <LogoMark size={56} strokeWidth={3.2} />
      <div className="flex flex-col">
        <span
          className="font-display text-2xl font-extrabold leading-none tracking-[0.05em]"
          style={{ fontStretch: "125%" }}
        >
          ROAD TO NEXT
        </span>
        <span className="mt-1.5 font-mono text-[13px] tracking-[0.42em] text-ink-2">
          RATING
        </span>
      </div>
    </div>
  );
}
