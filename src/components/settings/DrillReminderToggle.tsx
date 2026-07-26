"use client";

import { useState, useTransition } from "react";

import { setDrillReminder } from "@/app/settings/actions";

/**
 * Daily "session still due" reminder toggle. Same 44×26px pill as
 * RetestReminderToggle — a separate control because drill and re-test reminders
 * are opted into independently.
 */
export function DrillReminderToggle({ initialEnabled }: { initialEnabled: boolean }) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [, startTransition] = useTransition();

  function handleToggle() {
    const next = !enabled;
    setEnabled(next);
    startTransition(() => {
      setDrillReminder(next).catch(() => setEnabled(!next));
    });
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-label="Email me while a session is still due"
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
