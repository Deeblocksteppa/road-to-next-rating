"use client";

import { useEffect, useState } from "react";

import { shotTypeForDrill, type ShotType } from "@/lib/drill-shot";

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
 */

const COURT = "#4A4A50"; // line-hover — muted but legible court lines
const OPTIC = "#D8E34C";
const LABEL = "#80807B"; // ink-3
const GROUND = 120;
const NET_X = 178;
const NET_TOP = 88;

export function ShotDemo({ drillId }: { drillId: string }) {
  const reduced = usePrefersReducedMotion();

  const type = shotTypeForDrill(drillId);
  if (!type) return null;
  const demo = DEMOS[type];

  return (
    <div role="img" aria-label={demo.aria} className="w-full">
      <svg viewBox="0 0 320 140" className="h-auto w-full" aria-hidden="true">
        {/* Ground + net — shared by every shot so the family reads as one set. */}
        <line x1="12" y1={GROUND} x2="308" y2={GROUND} stroke={COURT} strokeWidth="1" />
        <line x1={NET_X} y1={GROUND} x2={NET_X} y2={NET_TOP} stroke={COURT} strokeWidth="1.5" strokeLinecap="round" />
        <line x1={NET_X - 5} y1={NET_TOP} x2={NET_X + 5} y2={NET_TOP} stroke={COURT} strokeWidth="1.5" strokeLinecap="round" />

        {/* Per-shot court marks (kitchen band, position ticks) sit on the court. */}
        {demo.marks}

        {/* Trajectory — dotted arc in optic. */}
        <path
          d={demo.motion.path}
          fill="none"
          stroke={OPTIC}
          strokeOpacity="0.5"
          strokeWidth="1.5"
          strokeDasharray="0.5 5"
          strokeLinecap="round"
        />

        {demo.labels}
        <Ball reduced={reduced} motion={demo.motion} />
      </svg>
    </div>
  );
}

/* ── Shared court marks ─────────────────────────────────────────── */

/** A vertical position tick rising from the ground (baseline, kitchen line). */
function Tick({ x, top }: { x: number; top: number }) {
  return <line x1={x} y1={GROUND} x2={x} y2={top} stroke={COURT} strokeWidth="1.5" strokeLinecap="round" />;
}

/** The dim-optic band on the ground marking the kitchen — the target zone. */
function KitchenBand({ x1, x2 }: { x1: number; x2: number }) {
  return <rect x={x1} y={GROUND - 4} width={x2 - x1} height="4" fill="rgba(216,227,76,0.12)" />;
}

/** A mono court label centered under the court, matching the drop's language. */
function CourtLabel({ x, children }: { x: number; children: string }) {
  return (
    <text x={x} y="134" fill={LABEL} fontSize="6.5" letterSpacing="0.1em" textAnchor="middle" fontFamily="var(--font-mono), monospace">
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
  marks: React.ReactNode;
  labels: React.ReactNode;
  motion: Motion;
}

const DEMOS: Record<ShotType, Demo> = {
  /* Drop — a high, floaty parabola from the baseline that settles at the apex
     and drops soft into the kitchen just past the net. */
  drop: {
    aria:
      "Side view of a third-shot drop: the ball floats up from the baseline in a soft high arc and drops gently into the kitchen just past the net.",
    marks: (
      <>
        <KitchenBand x1={178} x2={214} />
        <Tick x={44} top={108} />
        <Tick x={214} top={110} />
      </>
    ),
    labels: (
      <>
        <CourtLabel x={44}>BASELINE</CourtLabel>
        <CourtLabel x={196}>KITCHEN</CourtLabel>
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
    aria:
      "Side view of a reset: a hard, flat ball skids in to mid-court, is absorbed as the pace comes off, then comes out low and soft, barely clearing the net before settling down into the kitchen.",
    marks: (
      <>
        <KitchenBand x1={178} x2={214} />
        <Tick x={115} top={108} />
        <Tick x={214} top={110} />
      </>
    ),
    labels: (
      <>
        <CourtLabel x={115}>MID-COURT</CourtLabel>
        <CourtLabel x={196}>KITCHEN</CourtLabel>
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
