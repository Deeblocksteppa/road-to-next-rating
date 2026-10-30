"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { SUPPORT_EMAIL, SUPPORT_MAILTO } from "@/lib/contact";

const LINKS = [
  { href: "/terms", label: "Terms" },
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/refunds", label: "Refund Policy" },
];

// Assessment answers and a running session timer aren't persisted, so a
// same-tab tap on these routes would lose them.
const NEW_TAB_PREFIXES = ["/start", "/session", "/retest", "/paywall"];

// The tab bar is fixed over the bottom 64px of these.
const TABBED_PREFIXES = ["/home", "/plan", "/progress"];

const matches = (pathname: string, prefixes: string[]) =>
  prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));

/** Every page's legal links. Lines up with the column of the page above it. */
export function SiteFooter() {
  const pathname = usePathname();
  const newTab = matches(pathname, NEW_TAB_PREFIXES);

  // Widths include this column's own padding, as the pages' columns do. The
  // landing's footer pads outside a 1120px column, hence the larger step there.
  const column =
    pathname === "/"
      ? "max-w-[1200px] md:px-10"
      : LINKS.some((link) => link.href === pathname)
        ? "max-w-[680px]"
        : "max-w-md";

  const linkClass =
    "-mx-2 -my-3 px-2 py-3 text-[15px] text-ink-2 transition-colors hover:text-ink";

  return (
    <footer
      className={`border-t border-line pt-8 ${
        matches(pathname, TABBED_PREFIXES) ? "pb-24" : "pb-8"
      }`}
    >
      <nav
        className={`mx-auto flex w-full flex-wrap items-center gap-x-6 gap-y-5 px-6 ${column}`}
      >
        {LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={linkClass}
            {...(newTab ? { target: "_blank", rel: "noopener" } : {})}
          >
            {link.label}
          </Link>
        ))}
        <a href={SUPPORT_MAILTO} className={linkClass}>
          {SUPPORT_EMAIL}
        </a>
      </nav>
    </footer>
  );
}
