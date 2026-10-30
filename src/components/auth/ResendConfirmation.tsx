"use client";

import { useEffect, useState } from "react";

import { authErrorCode } from "@/lib/auth-errors";
import { createClient } from "@/lib/supabase/client";

/** Seconds before the confirmation email can be sent again. */
const COOLDOWN_SECONDS = 30;

type State = "idle" | "sending" | "sent" | "limited" | "failed";

/**
 * "Resend email" as a quiet text action, for the check-your-inbox screen and
 * the result page's pending banner.
 *
 * After a send it confirms "Sent" and holds for a short cooldown, so a
 * double tap can't fire two emails and the player sees that something
 * happened. Supabase's own rate limit is the real guard; when it trips, the
 * control says to wait rather than failing silently.
 */
export function ResendConfirmation({ email, className = "" }: { email: string; className?: string }) {
  const [state, setState] = useState<State>("idle");
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (remaining <= 0) return;
    const timer = setTimeout(() => setRemaining((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [remaining]);

  // The cooldown ending returns the control to its resting label.
  useEffect(() => {
    if (remaining === 0 && (state === "sent" || state === "limited")) setState("idle");
  }, [remaining, state]);

  async function resend() {
    setState("sending");
    const supabase = createClient();
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/home` },
    });

    if (error) {
      const limited = authErrorCode(error) === "rate_limited";
      setState(limited ? "limited" : "failed");
      if (limited) setRemaining(COOLDOWN_SECONDS * 2);
      return;
    }
    setState("sent");
    setRemaining(COOLDOWN_SECONDS);
  }

  const waiting = state === "sending" || remaining > 0;
  const label =
    state === "sending"
      ? "Sending…"
      : state === "sent"
        ? `Sent · resend in ${remaining}s`
        : state === "limited"
          ? `Too many tries · wait ${remaining}s`
          : state === "failed"
            ? "Couldn't send · try again"
            : "Resend email";

  return (
    <button
      type="button"
      onClick={resend}
      disabled={waiting}
      aria-live="polite"
      className={[
        "-my-2 py-2 text-[15px] tabular-nums underline decoration-line-hover underline-offset-4 transition-colors",
        waiting ? "text-ink-3 no-underline" : "text-ink-2 hover:text-ink",
        className,
      ].join(" ")}
    >
      {label}
    </button>
  );
}
