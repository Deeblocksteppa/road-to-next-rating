import { TabBar } from "@/components/nav/TabBar";

/**
 * Authenticated tab shell. Wraps /home, /plan, /progress with the bottom tab
 * bar and a centered mobile column. (/settings lives outside this group — it
 * has no tab bar, reached via the Home header gear.)
 *
 * Route protection is enforced in middleware; each page also re-checks the user
 * as defense in depth.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-md flex-col bg-background text-foreground">
      {/* pb-16 clears the fixed 64px tab bar. Also a flex container (not just
          a flex item) so pages that need to anchor content to the bottom
          (e.g. Home's CTA) can grow into it via flex-1 rather than relying
          on percentage heights, which don't reliably resolve through an
          auto-sized flex item. */}
      <div className="flex flex-1 flex-col pb-16">{children}</div>
      <TabBar />
    </div>
  );
}
