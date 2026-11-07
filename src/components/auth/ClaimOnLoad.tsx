"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { claimDeviceResult } from "@/lib/persistence";
import { clearSignupPending } from "@/lib/signup-pending";

/**
 * Runs on /home. If the player arrived with an anonymous result still on this
 * browser (after an email-confirmation or OAuth round trip, where the Save
 * Gate couldn't claim inline, or after a claim there failed), save any rows
 * it is missing, claim all three now and refresh so the freshly claimed
 * diagnosis and plan render. The device keeps the result until that claim
 * succeeds.
 *
 * It also says so, once: a brief "Plan saved" when the plan has just been
 * attached to the account, whether that happened here or (`saved`) on the
 * way in, at the Save Gate or on the confirmation link. Being on /home means
 * being signed in, so the device's "sign-up pending" note is cleared too.
 *
 * A device result whose rows have been deleted (30 days unclaimed) is cleared,
 * never saved again, and Home is reloaded with `?expired=1`, which shows the
 * expired copy if the account has no plan.
 */
export function ClaimOnLoad({
  saved = false,
  expired = false,
  hasPlan = false,
}: {
  saved?: boolean;
  /** Arrived with `?expired=1`: only here to drop the flag from the URL. */
  expired?: boolean;
  /**
   * The account has a plan for the diagnosis on show. "Plan saved" used to
   * appear on every confirmed sign-up, including one with nothing to save (a
   * sign-up from /signup, or a claim that failed), right above "No diagnosis
   * yet", and then on any diagnosis whether or not its plan was saved.
   */
  hasPlan?: boolean;
}) {
  const router = useRouter();
  const [justSaved, setJustSaved] = useState(saved);

  useEffect(() => {
    clearSignupPending();
    // The flag has done its job; drop it so a refresh doesn't repeat it.
    if (saved || expired) window.history.replaceState(null, "", window.location.pathname);

    let cancelled = false;
    (async () => {
      try {
        const claim = await claimDeviceResult();
        if (cancelled) return;
        if (claim === "expired") {
          router.replace("/home?expired=1");
        } else if (claim === "claimed") {
          setJustSaved(true);
          router.refresh();
        }
      } catch (err) {
        console.error("Failed to claim records on load:", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router, saved, expired]);

  // A claim made here refreshes the page, so `hasPlan` turns true with it.
  if (!justSaved || !hasPlan) return null;

  return (
    <p
      role="status"
      className="rounded-xl border border-line bg-surface px-4 py-3 text-[16px] leading-[1.5] text-ink-2"
    >
      <span className="font-semibold text-ink">Plan saved.</span> It&apos;s on your account
      now, on any device where you log in.
    </p>
  );
}
