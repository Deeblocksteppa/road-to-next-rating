import type { ReadinessPoint } from "@/lib/progress";

// Readiness domain. The engine emits 40–85 (40 + ratio*45), so a 30–90 window
// keeps real scores comfortably inside the frame with the 80 target near the top.
const Y_MIN = 30;
const Y_MAX = 90;
const TOP = 12;
const BOTTOM = 108;
const LEFT = 6;
const RIGHT = 294;

function yFor(readiness: number): number {
  const clamped = Math.max(Y_MIN, Math.min(Y_MAX, readiness));
  return BOTTOM - ((clamped - Y_MIN) / (Y_MAX - Y_MIN)) * (BOTTOM - TOP);
}

function xFor(i: number, n: number): number {
  return n <= 1 ? (LEFT + RIGHT) / 2 : LEFT + (i / (n - 1)) * (RIGHT - LEFT);
}

/**
 * Single accent line over the user's real readiness scores, with a dashed
 * target line and an endpoint dot — the logo shape happening slowly.
 */
export function ReadinessChart({
  points,
  target,
}: {
  points: ReadinessPoint[];
  target: number;
}) {
  const n = points.length;
  if (n === 0) return null;

  const poly = points
    .map((p, i) => `${xFor(i, n).toFixed(1)},${yFor(p.readiness).toFixed(1)}`)
    .join(" ");
  const targetY = yFor(target);
  const lastX = xFor(n - 1, n);
  const lastY = yFor(points[n - 1].readiness);

  return (
    <svg
      width="100%"
      height="120"
      viewBox="0 0 300 120"
      preserveAspectRatio="none"
      style={{ display: "block" }}
      aria-hidden="true"
    >
      <line x1="0" y1="36" x2="300" y2="36" stroke="#1A1A1D" strokeWidth="1" />
      <line x1="0" y1="72" x2="300" y2="72" stroke="#1A1A1D" strokeWidth="1" />
      <line
        x1="0"
        y1={targetY}
        x2="300"
        y2={targetY}
        stroke="#2E2E33"
        strokeWidth="1"
        strokeDasharray="3 4"
      />
      <polyline
        points={poly}
        fill="none"
        stroke="#D8E34C"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={lastX} cy={lastY} r="4" fill="#D8E34C" />
    </svg>
  );
}
