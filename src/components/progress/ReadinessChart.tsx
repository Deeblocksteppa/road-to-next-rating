import type { ReadinessPoint } from "@/lib/progress";

const TOP = 12;
const BOTTOM = 108;
const LEFT = 6;
const RIGHT = 294;

/**
 * The vertical window: the readings themselves with some room around them,
 * inside 0–100. A fixed 0–100 frame would flatten a real few-point change
 * into a level line; this keeps the movement visible without inventing a
 * target to measure against (the dashed "80" line is gone: nothing in the
 * product defines 80 as ready).
 */
function domainFor(points: ReadinessPoint[]): [number, number] {
  const values = points.map((p) => p.readiness);
  const lo = Math.max(0, Math.min(...values) - 15);
  const hi = Math.min(100, Math.max(...values) + 15);
  return hi - lo < 30 ? [Math.max(0, lo - 10), Math.min(100, hi + 10)] : [lo, hi];
}

function yFor(readiness: number, [min, max]: [number, number]): number {
  const clamped = Math.max(min, Math.min(max, readiness));
  return BOTTOM - ((clamped - min) / (max - min || 1)) * (BOTTOM - TOP);
}

function xFor(i: number, n: number): number {
  return n <= 1 ? (LEFT + RIGHT) / 2 : LEFT + (i / (n - 1)) * (RIGHT - LEFT);
}

/**
 * Single accent line over the user's real readiness scores, with an
 * endpoint dot — the logo shape happening slowly. `muted` draws it in ink
 * when something else on the screen holds the accent (an open re-test).
 */
export function ReadinessChart({ points, muted = false }: { points: ReadinessPoint[]; muted?: boolean }) {
  const n = points.length;
  if (n === 0) return null;
  const domain = domainFor(points);

  const poly = points
    .map((p, i) => `${xFor(i, n).toFixed(1)},${yFor(p.readiness, domain).toFixed(1)}`)
    .join(" ");
  const lastX = xFor(n - 1, n);
  const lastY = yFor(points[n - 1].readiness, domain);
  const stroke = muted ? "#B0B0AB" : "#D8E34C";

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
      <polyline
        points={poly}
        fill="none"
        stroke={stroke}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={lastX} cy={lastY} r="4" fill={stroke} />
    </svg>
  );
}
