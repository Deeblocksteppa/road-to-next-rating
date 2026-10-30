import Link from "next/link";

import { SUPPORT_EMAIL, SUPPORT_MAILTO } from "@/lib/contact";
import { LEGAL_LINKS } from "@/lib/legal";

/**
 * Legal links and the support email, on the pages with no unsaved work: sign
 * in, sign up, the legal pages and Settings. Never in a flow, where answers or
 * a timer could be lost and a full-height screen would start to scroll. The
 * landing's own footer carries the same links.
 *
 * `column` matches the max width of the page above, padding included.
 */
export function SiteFooter({ column = "max-w-md" }: { column?: string }) {
  const linkClass =
    "-mx-2 -my-3 px-2 py-3 text-[15px] text-ink-2 transition-colors hover:text-ink";

  return (
    <footer className="border-t border-line py-8">
      <nav
        className={`mx-auto flex w-full flex-wrap items-center gap-x-6 gap-y-5 px-6 ${column}`}
      >
        {LEGAL_LINKS.map((link) => (
          <Link key={link.href} href={link.href} className={linkClass}>
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
