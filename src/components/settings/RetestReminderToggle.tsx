"use client";

import { useState, useTransition } from "react";

import { setRetestReminder } from "@/app/settings/actions";

/** 44×26px pill toggle. On = optic fill + optic-ink knob; off = muted track. */
export function RetestReminderToggle({ initialEnabled }: { initialEnabled: boolean }) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [, startTransition] = useTransition();

  function handleToggle() {
    const next = !enabled;
    setEnabled(next);
    startTransition(() => {
      setRetestReminder(next).catch(() => setEnabled(!next));
    });
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-label="Email me when my re-test opens"
      onClick={handleToggle}
      className={[
        "relative h-[26px] w-11 shrink-0 rounded-full transition-colors",
        enabled ? "bg-optic" : "border border-line-strong bg-surface-2",
      ].join(" ")}
    >
      <span
        className={[
          "absolute top-[3px] h-5 w-5 rounded-full transition-[right,left]",
          enabled ? "right-[3px] bg-optic-ink" : "left-[3px] bg-ink-3",
        ].join(" ")}
      />
    </button>
  );
}
