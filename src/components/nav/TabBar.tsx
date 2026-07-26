"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

/**
 * Bottom tab bar (DESIGN_SYSTEM.md §5). Text-only, three tabs. Settings is NOT
 * a tab — it's reached from the Home header gear. Fixed to the bottom, centered
 * to the mobile column, 64px tall. The active tab gets a 16×2px accent tick
 * above its label.
 */
const TABS = [
  { label: "HOME", href: "/home" },
  { label: "PLAN", href: "/plan" },
  { label: "PROGRESS", href: "/progress" },
] as const;

export function TabBar() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 mx-auto flex h-16 w-full max-w-md border-t border-line bg-background">
      {TABS.map((tab) => {
        const active =
          pathname === tab.href || pathname.startsWith(`${tab.href}/`);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            onClick={(e) => {
              // A Link to the current pathname is a client-side no-op by
              // default — re-fetch the route's server data instead of
              // leaving the tap feeling dead.
              if (active) {
                e.preventDefault();
                router.refresh();
              }
            }}
            className="flex flex-1 flex-col items-center justify-center gap-1.5 transition-colors hover:bg-surface"
          >
            {/* 16×2px accent tick above the active label */}
            <span
              className={`h-0.5 w-4 rounded-full ${active ? "bg-optic" : "bg-transparent"}`}
            />
            <span
              className={`font-mono text-[11px] uppercase tracking-[0.12em] ${
                active ? "text-ink" : "text-ink-3"
              }`}
            >
              {tab.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
