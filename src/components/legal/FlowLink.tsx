import Link from "next/link";

/**
 * A legal link inside a flow (the save form, the paywall). Opens a new tab, so
 * answers typed into the form and the player's place in the flow survive.
 */
export function FlowLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      target="_blank"
      rel="noopener"
      className="underline decoration-line-hover underline-offset-4 transition-colors hover:text-ink hover:decoration-ink-2"
    >
      {children}
    </Link>
  );
}
