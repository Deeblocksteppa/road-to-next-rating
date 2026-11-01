import type { ReactNode } from "react";

/**
 * Shown when a result saved on this device has been deleted (unclaimed for 30
 * days). `children` is the button: in place on /start, a link to it on Home.
 */
export function ExpiredResult({ children }: { children: ReactNode }) {
  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-col gap-2.5">
        <h1 className="text-balance font-display text-[1.875rem] font-extrabold leading-[1.1] tracking-[-0.02em]">
          Your saved result expired.
        </h1>
        <p className="text-[16px] leading-[1.5] text-ink-2">
          Take the assessment again; it&apos;s 12 questions.
        </p>
      </div>
      {children}
    </section>
  );
}

export const EXPIRED_BUTTON =
  "flex h-[52px] w-full items-center justify-center rounded-lg bg-optic text-[15px] font-semibold text-optic-ink transition-colors hover:bg-optic-hover active:scale-[0.98]";
