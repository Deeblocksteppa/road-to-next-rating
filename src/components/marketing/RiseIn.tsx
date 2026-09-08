"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Scroll-into-view entrance for the marketing site: a fade-and-rise, ~0.7s
 * exponential ease-out, no bounce, no scale.
 *
 * `prefers-reduced-motion` is honored by the stylesheet in globals.css rather
 * than by branching here, so the reduced case never depends on JS timing.
 */

/**
 * Set by the first IntersectionObserver callback of any kind — including the
 * initial non-intersecting one every observer emits right after `observe()`.
 * Its only job is to distinguish "the API exists" from "the API actually runs":
 * headless renderers and screenshot bots can expose IntersectionObserver and
 * never invoke the callback, which would strand the page at opacity 0.
 */
let observerProvenAlive = false;

export function RiseIn({
  children,
  delay = 0,
  as: Tag = "div",
  className = "",
}: {
  children: React.ReactNode;
  /** Stagger within a group, in ms. Keep under ~240 — this is rhythm, not choreography. */
  delay?: number;
  as?: "div" | "section" | "li" | "header" | "footer";
  className?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const [shown, setShown] = useState(false);
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === "undefined") return;

    // Arm only once we know the observer exists: until then the element keeps
    // its no-JS visible state, so nothing can get stranded at opacity 0.
    setArmed(true);

    const observer = new IntersectionObserver(
      (entries) => {
        observerProvenAlive = true;
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setShown(true);
            observer.disconnect();
          }
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.05 }
    );

    observer.observe(node);

    // Failsafe for the never-delivers case only. If any callback has run by the
    // deadline the observer is working, so leave this element alone and let
    // scrolling reveal it — a blanket timed reveal would show every section at
    // once and there would be no entrance left to see.
    const failsafe = window.setTimeout(() => {
      if (!observerProvenAlive) setShown(true);
    }, 1200);

    return () => {
      observer.disconnect();
      window.clearTimeout(failsafe);
    };
  }, []);

  return (
    <Tag
      ref={ref as never}
      data-rise={armed ? (shown ? "in" : "out") : undefined}
      style={delay ? ({ "--rise-delay": `${delay}ms` } as React.CSSProperties) : undefined}
      className={className}
    >
      {children}
    </Tag>
  );
}
