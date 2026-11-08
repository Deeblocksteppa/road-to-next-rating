"use client";

import { useEffect, useState } from "react";

import { authErrorCode, RESEND_COOLDOWN_SECONDS } from "@/lib/auth-errors";
import { saveSignupPendingUnlessOther, signupSentAt } from "@/lib/signup-pending";
import { createClient } from "@/lib/supabase/client";

type State = "idle" | "sending" | "sent" | "limited" | "failed";

/**
 * "Resend code" as a quiet text action, for the code screen and the plan's
 * pending status.
 *
 * It holds for the dashboard's minimum interval after each email ("Resend
 * code in 42s"), counted from when that email went out (`signup-pending.ts`),
 * so a refresh or a trip back to the plan doesn't reset it. Supabase's own
 * rate limit is the real guard; when it trips, the control says to wait
 * rather than failing silently. A resend mints a new code, so the previous
 * email's code and link stop working.
 */
export function ResendCode({
  email,
  onSent,
  disabled = false,
  keepOther = false,
  className = "",
}: {
  email: string;
  /**
   * Leave another address's pending note alone (/login's code screen): the
   * note guards the device's result for that sign-up, and a resend here
   * must not hand it to this address.
   */
  keepOther?: boolean;
  /** A new code is on its way. */
  onSent?: () => void;
  /** A code is being checked: a resend now would spend it. */
  disabled?: boolean;
  className?: string;
}) {
  const [state, setState] = useState<State>("idle");
  // When the control opens again, in ms. Read from storage after mount; with
  // nothing stored, the email this screen is about went out just now.
  const [until, setUntil] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    setUntil((signupSentAt(email) ?? Date.now()) + RESEND_COOLDOWN_SECONDS * 1000);
    setNow(Date.now());
  }, [email]);

  const remaining = Math.max(0, Math.ceil((until - now) / 1000));

  useEffect(() => {
    if (remaining <= 0) return;
    const timer = setTimeout(() => setNow(Date.now()), 1000);
    return () => clearTimeout(timer);
  }, [remaining, now]);

  async function resend() {
    setState("sending");
    const supabase = createClient();
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/home`,
      },
    });

    if (error) {
      const limited = authErrorCode(error) === "rate_limited";
      setState(limited ? "limited" : "failed");
      if (limited) {
        setUntil(Date.now() + RESEND_COOLDOWN_SECONDS * 1000);
        setNow(Date.now());
      }
      return;
    }
    saveSignupPendingUnlessOther(email, keepOther);
    setUntil(Date.now() + RESEND_COOLDOWN_SECONDS * 1000);
    setNow(Date.now());
    setState("sent");
    onSent?.();
  }

  const waiting = disabled || state === "sending" || remaining > 0;
  const label =
    state === "sending"
      ? "Sending…"
      : remaining > 0
        ? state === "sent"
          ? `Code sent · resend in ${remaining}s`
          : state === "limited"
            ? `Too many tries · wait ${remaining}s`
            : `Resend code in ${remaining}s`
        : state === "failed"
          ? "Couldn't send · try again"
          : "Resend code";

  // Announced on a change of state only, not on every tick of the countdown.
  const announcement =
    state === "sent"
      ? "New code sent."
      : state === "limited"
        ? "Too many tries. Wait a minute."
        : state === "failed"
          ? "Couldn't send the code. Try again."
          : "";

  return (
    <>
      <button
        type="button"
        onClick={resend}
        disabled={waiting}
        className={[
          "-my-2 py-2 text-left text-[15px] tabular-nums underline decoration-line-hover underline-offset-4 transition-colors",
          waiting ? "text-ink-3 no-underline" : "text-ink-2 hover:text-ink",
          className,
        ].join(" ")}
      >
        {label}
      </button>
      <span aria-live="polite" className="sr-only">
        {announcement}
      </span>
    </>
  );
}
