/**
 * The real app screenshots the marketing site is built around.
 *
 * TO ADD A SCREENSHOT: drop the PNG at the listed `src` path under /public,
 * record its true pixel dimensions in `w`/`h`, and flip `ready` to true. The
 * dimensions must be the file's real ones — they are what reserves layout space
 * before the image decodes, so a wrong pair shows up as a jump on load.
 *
 * Captures came off-device at mixed widths (1179px at 3×, 786px at 2×) and are
 * cropped to different heights, so every frame carries its own ratio rather
 * than assuming a uniform 375×812 screen.
 */
export interface Shot {
  src: string;
  ready: boolean;
  /** True intrinsic pixel width of the file. */
  w: number;
  /** True intrinsic pixel height of the file. */
  h: number;
  /** Mono caption naming the screen — shown while the capture is pending. */
  label: string;
  /** Real alt text describing what the screen shows. */
  alt: string;
}

export const SHOTS = {
  verdict: {
    src: "/marketing/reveal-verdict.png",
    ready: true,
    w: 1179,
    h: 2079,
    label: "Reveal — your bottleneck",
    alt: "The app's reveal screen naming the player's bottleneck skill in large display type, with a one-line explanation beneath it.",
  },
  insight: {
    src: "/marketing/reveal-insight.png",
    ready: true,
    w: 1179,
    h: 2175,
    label: "Reveal — why it hasn't improved",
    alt: "The app's reveal screen explaining why the diagnosed skill has not improved despite regular play.",
  },
  readiness: {
    src: "/marketing/reveal-readiness.png",
    ready: true,
    w: 1179,
    h: 2132,
    label: "Reveal — readiness for 4.0",
    alt: "The app's reveal screen showing a readiness-for-4.0 score with a progress bar running from 3.0 to 4.0.",
  },
  plan: {
    src: "/marketing/plan.png",
    ready: false,
    w: 1179,
    h: 2100,
    label: "My plan — this week",
    alt: "The app's plan screen showing this week's sessions, a completed and a due task, and the in-game rule for the week.",
  },
  session: {
    src: "/marketing/session.png",
    ready: true,
    w: 1179,
    h: 2070,
    label: "Guided session — named drill",
    alt: "The app's guided session screen showing the named drill for today, a diagram of the shot, and the button that starts it.",
  },
  // NOT the Home dashboard: this file is a capture of the app's old landing
  // screen, which the marketing page replaced. Unusable here — showing it would
  // put this page's own headline inside this page. Recapture /home to enable.
  home: {
    src: "/marketing/home.png",
    ready: false,
    w: 1179,
    h: 2127,
    label: "Home — recapture needed",
    alt: "The app's home screen showing the current bottleneck, the readiness score, sessions completed this week, and the button that starts today's session.", // eslint-disable-line -- accurate for the intended capture, not the current file
  },
} satisfies Record<string, Shot>;

export type ShotKey = keyof typeof SHOTS;
