/**
 * The logo's motif at page scale: a flat muted line — the plateau — that breaks
 * upward in the optic accent and continues at a higher level. Same two strokes
 * as the mark in `brand/Logo`, stretched across a section boundary.
 *
 * Built from two hairline divs and one SVG rather than a single stretched SVG,
 * so the break keeps its angle at any width instead of shearing.
 */
export function BreakRule({
  /** Where the break sits across the width. */
  align = "left",
  className = "",
}: {
  align?: "left" | "center";
  className?: string;
}) {
  const cols =
    align === "center"
      ? "grid-cols-[1fr_34px_1fr]"
      : "grid-cols-[minmax(0,18%)_34px_1fr]";

  return (
    <div aria-hidden="true" className={`grid h-4 w-full ${cols} ${className}`}>
      <span className="self-end bg-line" style={{ height: 1 }} />
      <svg
        viewBox="0 0 34 16"
        className="h-4 w-[34px] overflow-visible"
        fill="none"
      >
        <path
          d="M0 15.5 L34 1"
          stroke="#D8E34C"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
      <span className="self-start bg-line" style={{ height: 1 }} />
    </div>
  );
}

/**
 * The same motif compressed to a mark, for use beside a label rather than as a
 * full-width rule.
 */
export function BreakMark({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 28 12"
      className={`h-3 w-7 ${className}`}
      fill="none"
    >
      <path
        d="M1 10.5 H13"
        stroke="#2E2E33"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M13 10.5 L27 1.5"
        stroke="#D8E34C"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
