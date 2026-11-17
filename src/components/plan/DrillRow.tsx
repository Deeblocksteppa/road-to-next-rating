import Link from "next/link";

import { setupRowLabel, type Drill } from "@/lib/drills";

/**
 * One drill as a row: its name, and under it its time and who it needs
 * ("15 MIN · SOLO · WALL"). A drill logged today reads "TODAY · 7/10" in
 * place of its time, so a half-done session shows wherever the row does.
 *
 * Shared by the plan and Home so the two can't lay a drill out differently.
 * With `href` (the plan) the whole row opens the drill's page and carries a
 * chevron. Without it (Home) the row is plain text: nothing to tap, no
 * chevron. Nothing is described inline and nothing starts here.
 */
export function DrillRow({
  drill,
  href,
  loggedToday,
}: {
  drill: Drill;
  /** The drill's page. Omitted where the row is not a link. */
  href?: string;
  loggedToday: { result: number | null } | null;
}) {
  const text = (
    <span className="flex min-w-0 flex-col gap-1.5">
      <span className="font-display text-[18px] font-semibold leading-[1.3] text-ink">{drill.name}</span>
      <span className="font-mono text-[11px] uppercase leading-[1.5] tracking-[0.1em] tabular-nums text-ink-3">
        {loggedToday
          ? `Today · ${loggedToday.result === null ? "logged" : `${loggedToday.result}/10`}`
          : `${drill.duration} · ${setupRowLabel(drill.setup)}`}
      </span>
    </span>
  );

  if (!href) {
    return <li className="flex min-h-[64px] items-center border-t border-line py-4">{text}</li>;
  }

  return (
    <li className="border-t border-line">
      <Link
        href={href}
        className="group flex min-h-[64px] items-center justify-between gap-4 py-4 transition-colors"
      >
        {text}
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
          className="shrink-0 text-ink-3 transition-colors group-hover:text-ink"
        >
          <path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </Link>
    </li>
  );
}
