import type { Metadata } from "next";
import Link from "next/link";

import { Logo } from "@/components/brand/Logo";
import { REMINDER_NAME, verifyUnsubscribeToken } from "@/lib/unsubscribe";

// The token is the only key to this page: keep it out of search and out of
// the Referer header.
export const metadata: Metadata = {
  title: "Unsubscribe",
  robots: { index: false },
  referrer: "no-referrer",
};

function Message({ title, body }: { title: string; body: string }) {
  return (
    <>
      <h1 className="text-balance font-display text-[1.875rem] font-extrabold leading-[1.1] tracking-[-0.02em]">
        {title}
      </h1>
      <p className="text-[16px] leading-[1.5] text-ink-2">
        {body}{" "}
        <Link href="/settings" className="underline underline-offset-2 hover:text-ink">
          Settings
        </Link>
        .
      </p>
    </>
  );
}

/**
 * Opened from an email, signed in or not. Opening it changes nothing: mail
 * scanners follow links, so only the button (a POST to /api/unsubscribe) turns
 * the reminder off.
 */
export default function UnsubscribePage({
  searchParams,
}: {
  searchParams: { token?: string; done?: string };
}) {
  const verified = verifyUnsubscribeToken(searchParams.token);

  return (
    <main className="mx-auto flex min-h-app w-full max-w-md flex-col bg-background px-6 py-8 text-ink">
      <header className="pt-4">
        <Logo />
      </header>

      <div className="flex flex-1 flex-col justify-center gap-5 py-10">
        {searchParams.done === "1" ? (
          <Message title="You're unsubscribed." body="You can turn these back on in" />
        ) : verified ? (
          <form method="post" action="/api/unsubscribe" className="flex flex-col gap-5">
            <input type="hidden" name="token" value={searchParams.token} />
            <h1 className="text-balance font-display text-[1.875rem] font-extrabold leading-[1.1] tracking-[-0.02em]">
              Turn off {REMINDER_NAME[verified.type]}?
            </h1>
            <button
              type="submit"
              className="flex h-[52px] w-full items-center justify-center rounded-lg bg-optic text-[15px] font-semibold text-optic-ink transition-colors hover:bg-optic-hover active:scale-[0.98]"
            >
              Turn off
            </button>
          </form>
        ) : (
          <Message title="This link no longer works." body="You can turn off reminders in" />
        )}
      </div>
    </main>
  );
}
