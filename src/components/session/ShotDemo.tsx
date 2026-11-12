"use client";

import { useEffect, useState } from "react";

import { shotTypeForDrill, wallLabelsForDrill, type ShotType, type WallLabels } from "@/lib/drill-shot";

/**
 * A small side-view diagram of the drill's shot, shown on the Brief screen so a
 * player can see the shape of the shot before starting. Hybrid side view: the
 * ball's trajectory is the focus, but a net and kitchen (non-volley zone) line
 * anchor every diagram as unmistakably pickleball.
 *
 * All four shots share one visual language — near-black background, muted court
 * lines, an optic ball tracing a dotted optic path, mono labels under the court
 * — while each trajectory shape and its timing is true to the real shot:
 *
 *   drop        — a high, floaty parabola that settles at the apex, then drops
 *                 soft into the kitchen.
 *   reset       — a hard, flat ball absorbed at mid-court (a brief settle as the
 *                 pace comes off), then floated softly over the net.
 *   dink        — small, low, continuous arcs back and forth at the net.
 *   net_defense — a fast, flat speed-up at body height, punched back quick with
 *                 almost no pause. Deliberately quicker than the others.
 *
 * Motion is SMIL-driven (reliable for path following in mobile Safari/Chrome);
 * prefers-reduced-motion swaps the moving ball for the static dotted arc plus a
 * ball resting at the shot's end point.
 *
 * A drill prescribed at a wall isn't played over a net, so it gets the wall
 * template instead: one drawing shared by every wall version (a wall, where
 * the player stands, the ball out and back), with labels per drill saying how
 * far to stand and what the return should do. The picture is the same for all
 * of them; the labels carry what differs.
 */

const COURT = "#4A4A50"; // line-hover — muted but legible court lines
const OPTIC = "#D8E34C";
// ink-2, not ink-3: at 6.5px the labels were the least legible thing on the
// screen. Raised a step and a size along with it.
const LABEL = "#B0B0AB";
const GROUND = 120;
const NET_X = 178;
const NET_TOP = 88;

export function ShotDemo({
  drillId,
  setup,
  forceStatic = false,
}: {
  drillId: string;
  /** The prescribed version's setup. A wall drill isn't played over a net: it gets the wall template. */
  setup?: string;
  /** Render the reduced-motion state regardless of the OS setting (previews, fixtures). */
  forceStatic?: boolean;
}) {
  const reduced = usePrefersReducedMotion() || forceStatic;

  if (setup === "Wall") {
    const labels = wallLabelsForDrill(drillId);
    return labels ? <WallDemo labels={labels} reduced={reduced} /> : null;
  }

  const type = shotTypeForDrill(drillId);
  if (!type) return null;
  const demo = DEMOS[type];

  return (
    <div role="img" aria-label={demo.aria} className="w-full">
      <svg
        viewBox={`0 ${demo.top} 320 ${140 - demo.top}`}
        className="h-auto w-full"
        aria-hidden="true"
      >
        {/* Ground + net — shared by every shot so the family reads as one set.
            The net is labelled: without it the post read as a stray tick. */}
        <line x1="12" y1={GROUND} x2="308" y2={GROUND} stroke={COURT} strokeWidth="1" />
        <line x1={NET_X} y1={GROUND} x2={NET_X} y2={NET_TOP} stroke={COURT} strokeWidth="1.5" strokeLinecap="round" />
        <line x1={NET_X - 5} y1={NET_TOP} x2={NET_X + 5} y2={NET_TOP} stroke={COURT} strokeWidth="1.5" strokeLinecap="round" />
        {/* Beside the post at mid-height, not above it: every arc crosses the
            space above the net, and the label was sitting in the flight path. */}
        <text x={NET_X - 6} y={NET_TOP + 14} fill={LABEL} fontSize="7" letterSpacing="0.1em" textAnchor="end" fontFamily="var(--font-mono), monospace">
          NET
        </text>

        {/* Per-shot court marks (kitchen band, position ticks) sit on the court. */}
        {demo.marks}

        {/* Trajectory — dotted arc in optic. Under reduced motion it is the
            whole story, so it is drawn a step stronger there. */}
        <path
          d={demo.motion.path}
          fill="none"
          stroke={OPTIC}
          strokeOpacity={reduced ? "0.8" : "0.5"}
          strokeWidth="1.5"
          strokeDasharray="0.5 5"
          strokeLinecap="round"
        />

        {demo.labels}
        <Ball reduced={reduced} motion={demo.motion} />
      </svg>
      {/* Under reduced motion the ball is parked at the landing point and the
          arc carries the shape, so the picture is complete without playing. */}
      {reduced && <StaticCaption ball="where it lands" />}
    </div>
  );
}

/** What the still picture shows, since nothing moves: the path, and where the ball is parked. */
function StaticCaption({ ball }: { ball: string }) {
  return (
    <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-3">
      Dotted line: the ball&apos;s path · ball: {ball}
    </p>
  );
}

/* ── The wall template ──────────────────────────────────────────── */

const WALL_X = 272;
/** Net height on the wall, on the court diagrams' scale (ground 120, net top 88). */
const WALL_LINE_Y = NET_TOP;
const STAND_X = 78;

/** Out to the wall, back to the player: one path for every wall drill. */
const WALL_MOTION: Motion = {
  // The outgoing leg stops with the ball's edge on the wall's face (radius 4.5).
  path: `M${STAND_X + 8} 96 Q 180 70 ${WALL_X - 6} 82 Q 186 88 ${STAND_X + 22} 106`,
  dur: "2.8s",
  // out → the briefest contact with the wall → back → rest. The wall is at
  // 0.52 of the path's length (the two legs are not equal), so that is
  // where the ball holds.
  keyTimes: "0;0.42;0.46;0.88;1",
  keyPoints: "0;0.52;0.52;1;1",
  keySplines: "0.3 0 0.7 1;0 0 1 1;0.3 0 0.6 1;0 0 1 1",
  opacity: { keyTimes: "0;0.05;0.86;0.94;1", values: "0;1;1;0;0" },
  rest: [STAND_X + 22, 106],
};

function WallDemo({ labels, reduced }: { labels: WallLabels; reduced: boolean }) {
  return (
    <div role="img" aria-label={labels.aria} className="w-full">
      <svg viewBox="0 52 320 88" className="h-auto w-full" aria-hidden="true">
        <line x1="12" y1={GROUND} x2={WALL_X} y2={GROUND} stroke={COURT} strokeWidth="1" />
        {/* The wall: heavier than a court line, so it reads as a surface. */}
        <line x1={WALL_X} y1={GROUND} x2={WALL_X} y2="58" stroke={COURT} strokeWidth="3" strokeLinecap="round" />
        {/* Where the player stands. Unlabelled when the drill names no distance. */}
        <Tick x={STAND_X} top={108} />

        {/* A height on the wall, for the drills that name one (net height, the tape). */}
        {labels.line !== undefined && (
          <>
            <line
              x1={WALL_X - 34}
              y1={WALL_LINE_Y}
              x2={WALL_X - 3}
              y2={WALL_LINE_Y}
              stroke={COURT}
              strokeWidth="1.5"
              strokeDasharray="3 3"
              strokeLinecap="round"
            />
            {labels.line && (
              // Under the line, by the wall: the ball's path runs above it.
              <text x={WALL_X - 6} y={WALL_LINE_Y + 12} fill={LABEL} fontSize="7" letterSpacing="0.1em" textAnchor="end" fontFamily="var(--font-mono), monospace">
                {labels.line}
              </text>
            )}
          </>
        )}

        <path
          d={WALL_MOTION.path}
          fill="none"
          stroke={OPTIC}
          strokeOpacity={reduced ? "0.8" : "0.5"}
          strokeWidth="1.5"
          strokeDasharray="0.5 5"
          strokeLinecap="round"
        />

        {labels.stand && <CourtLabel x={STAND_X}>{labels.stand}</CourtLabel>}
        <CourtLabel x={178}>{labels.back}</CourtLabel>
        <CourtLabel x={WALL_X - 10}>WALL</CourtLabel>
        <Ball reduced={reduced} motion={WALL_MOTION} />
      </svg>
      {/* Parked on its way back to the player, not at a landing point. */}
      {reduced && <StaticCaption ball="back to you" />}
    </div>
  );
}

/* ── Shared court marks ─────────────────────────────────────────── */

/** A vertical position tick rising from the ground (baseline, kitchen line). */
function Tick({ x, top }: { x: number; top: number }) {
  return <line x1={x} y1={GROUND} x2={x} y2={top} stroke={COURT} strokeWidth="1.5" strokeLinecap="round" />;
}

/**
 * The optic band on the ground marking the kitchen — the target zone. A
 * hairline in optic on top of the band so the zone has an edge, not just a
 * tint; the earlier 12% fill was hard to find on a phone outdoors.
 */
function KitchenBand({ x1, x2 }: { x1: number; x2: number }) {
  return (
    <>
      <rect x={x1} y={GROUND - 5} width={x2 - x1} height="5" fill="rgba(216,227,76,0.2)" />
      <line x1={x1} y1={GROUND - 5} x2={x2} y2={GROUND - 5} stroke={OPTIC} strokeOpacity="0.6" strokeWidth="1" />
    </>
  );
}

/** A ring on the ground where the shot should land — the target, not the ball. */
function Target({ x }: { x: number }) {
  return (
    <>
      <circle cx={x} cy={GROUND} r="6" fill="none" stroke={OPTIC} strokeOpacity="0.7" strokeWidth="1" strokeDasharray="2 2" />
      <circle cx={x} cy={GROUND} r="1.5" fill={OPTIC} fillOpacity="0.7" />
    </>
  );
}

/** A mono court label centered under the court, matching the drop's language. */
function CourtLabel({ x, children }: { x: number; children: string }) {
  return (
    <text x={x} y="134" fill={LABEL} fontSize="7" letterSpacing="0.1em" textAnchor="middle" fontFamily="var(--font-mono), monospace">
      {children}
    </text>
  );
}

/* ── The ball ───────────────────────────────────────────────────── */

interface Motion {
  path: string;
  dur: string;
  keyTimes: string;
  keyPoints: string;
  keySplines: string;
  /** Omitted for the dink, whose loop returns to its start so needs no fade. */
  opacity?: { keyTimes: string; values: string };
  /** Where the static (reduced-motion) ball rests — the shot's end point. */
  rest: [number, number];
}

function Ball({ reduced, motion }: { reduced: boolean; motion: Motion }) {
  if (reduced) {
    return <circle cx={motion.rest[0]} cy={motion.rest[1]} r="4.5" fill={OPTIC} />;
  }
  return (
    <circle r="4.5" fill={OPTIC} opacity={motion.opacity ? 0 : 1}>
      <animateMotion
        dur={motion.dur}
        repeatCount="indefinite"
        calcMode="spline"
        keyTimes={motion.keyTimes}
        keyPoints={motion.keyPoints}
        keySplines={motion.keySplines}
        path={motion.path}
      />
      {motion.opacity && (
        <animate
          attributeName="opacity"
          dur={motion.dur}
          repeatCount="indefinite"
          keyTimes={motion.opacity.keyTimes}
          values={motion.opacity.values}
        />
      )}
    </circle>
  );
}

/* ── The four shots ─────────────────────────────────────────────── */

interface Demo {
  aria: string;
  /**
   * The highest y the shot reaches, less a margin for the ball. The diagram
   * is cropped to start here: every shot used the drop's full height, so the
   * flatter ones (reset, dink, speed-up) sat under 60–70 units of empty sky.
   */
  top: number;
  marks: React.ReactNode;
  labels: React.ReactNode;
  motion: Motion;
}

const DEMOS: Record<ShotType, Demo> = {
  /* Drop — a high, floaty parabola from the baseline that settles at the apex
     and drops soft into the kitchen just past the net. */
  drop: {
    top: 18,
    aria:
      "Side view of a third-shot drop: the ball floats up from the baseline in a soft high arc and drops gently into the kitchen just past the net.",
    marks: (
      <>
        <KitchenBand x1={178} x2={214} />
        <Tick x={44} top={108} />
        <Tick x={214} top={110} />
        <Target x={196} />
      </>
    ),
    labels: (
      <>
        <CourtLabel x={44}>BASELINE</CourtLabel>
        <CourtLabel x={196}>KITCHEN · TARGET</CourtLabel>
      </>
    ),
    motion: {
      path: "M44 110 C 80 6 148 6 196 116",
      dur: "3.4s",
      keyTimes: "0;0.38;0.76;1",
      keyPoints: "0;0.5;1;1",
      keySplines: "0 0 0.58 1;0.42 0 1 1;0 0 1 1",
      opacity: { keyTimes: "0;0.05;0.85;0.95;1", values: "0;1;1;0;0" },
      rest: [196, 116],
    },
  },

  /* Reset — a hard, flat ball skids in to mid-court, is absorbed (a brief settle
     as the pace comes off), then comes out low and dead: a shallow arc that only
     just clears the net (apex ~y78 vs the drop's ~y34) and settles steeply into
     the kitchen. The whole point is killing pace, so this output must read as
     obviously lower and flatter than the drop's tall floaty arc. */
  reset: {
    top: 62,
    aria:
      "Side view of a reset: a hard, flat ball skids in to mid-court, is absorbed as the pace comes off, then comes out low and soft, barely clearing the net before settling down into the kitchen.",
    marks: (
      <>
        <KitchenBand x1={178} x2={214} />
        <Tick x={115} top={108} />
        <Tick x={214} top={110} />
        <Target x={205} />
      </>
    ),
    labels: (
      <>
        <CourtLabel x={115}>MID-COURT</CourtLabel>
        <CourtLabel x={205}>KITCHEN · TARGET</CourtLabel>
      </>
    ),
    motion: {
      path: "M18 96 L115 110 C 155 66 186 66 205 116",
      dur: "3.6s",
      // fast skid in → hold (absorb) → soft low release over the net → quick
      // settle into the kitchen → rest
      keyTimes: "0;0.17;0.33;0.58;0.82;1",
      keyPoints: "0;0.45;0.45;0.74;1;1",
      keySplines: "0.4 0 0.9 1;0 0 1 1;0.3 0 0.6 1;0.3 0 0.4 1;0 0 1 1",
      opacity: { keyTimes: "0;0.04;0.84;0.92;1", values: "0;1;1;0;0" },
      rest: [205, 116],
    },
  },

  /* Dink — small, low, controlled arcs back and forth over the net between two
     players at the kitchen line. Steady and continuous; no dramatic pause. */
  dink: {
    top: 66,
    aria:
      "Side view of a dink rally: the ball travels in small, low arcs back and forth over the net between two players at the kitchen line, staying low and controlled.",
    marks: (
      <>
        <KitchenBand x1={142} x2={214} />
        <Tick x={142} top={112} />
        <Tick x={214} top={112} />
      </>
    ),
    labels: <CourtLabel x={178}>KITCHEN</CourtLabel>,
    motion: {
      path: "M120 104 Q 178 56 236 104 Q 178 56 120 104",
      dur: "2.6s",
      // one gentle ease-in-out per direction — a soft settle at each contact
      keyTimes: "0;0.5;1",
      keyPoints: "0;0.5;1",
      keySplines: "0.4 0 0.6 1;0.4 0 0.6 1",
      rest: [236, 104],
    },
  },

  /* Net defense — a fast, flat speed-up at body height crosses the net, is
     blocked back quick with almost no pause. The quickest of the four. */
  net_defense: {
    top: 58,
    aria:
      "Side view of a speed-up block: a fast, flat ball comes in at body height, is blocked back quickly over the net with almost no pause.",
    marks: (
      <>
        <KitchenBand x1={178} x2={214} />
        <Tick x={142} top={112} />
        <Tick x={214} top={112} />
      </>
    ),
    labels: <CourtLabel x={130}>KITCHEN</CourtLabel>,
    motion: {
      path: "M244 74 L126 82 C 148 64 184 80 208 102",
      dur: "2.2s",
      // fast in → tiny reflexive contact → fast block back → rest
      keyTimes: "0;0.30;0.36;0.66;1",
      keyPoints: "0;0.56;0.56;1;1",
      keySplines: "0.5 0 0.9 1;0 0 1 1;0.3 0 0.7 1;0 0 1 1",
      opacity: { keyTimes: "0;0.04;0.70;0.80;1", values: "0;1;1;0;0" },
      rest: [208, 102],
    },
  },
};

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}
