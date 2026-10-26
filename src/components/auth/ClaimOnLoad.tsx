"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { claimPendingRecords } from "@/lib/persistence";
import { clearSignupPending } from "@/lib/signup-pending";

/**
 * Runs on /home. If the player arrived with anonymous rows still pending in
 * this browser (after an email-confirmation or OAuth round trip, where the
 * Save Gate couldn't claim inline), claim them now and refresh so the
 * freshly claimed diagnosis and plan render.
 *
 * It also says so, once: a brief "Plan saved" when the plan has just been
 * attached to the account, whether that happened here or (`saved`) on the
 * way in, at the Save Gate or on the confirmation link. Being on /home means
 * being signed in, so the device's "sign-up pending" note is cleared too.
 */
export function ClaimOnLoad({
  saved = false,
  hasPlan = false,
}: {
  saved?: boolean;
  /**
   * The account has a diagnosis to show. "Plan saved" used to appear on every
   * confirmed sign-up, including one with nothing to save (a sign-up from
   * /signup, or a claim that failed), right above "No diagnosis yet".
   */
  hasPlan?: boolean;
}) {
  const router = useRouter();
  const [justSaved, setJustSaved] = useState(saved);

  useEffect(() => {
    clearSignupPending();
    // The flag has done its job; drop it so a refresh doesn't repeat it.
    if (saved) window.history.replaceState(null, "", window.location.pathname);

    let cancelled = false;
    (async () => {
      try {
        const claimed = await claimPendingRecords();
        if (claimed && !cancelled) {
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
  }, [router, saved]);

  // A claim made here refreshes the page, so `hasPlan` turns true with it.
  if (!justSaved || !hasPlan) return null;

  return (
    <p
      role="status"
      className="rounded-xl border border-line bg-surface px-4 py-3 text-[14px] leading-[1.5] text-ink-2"
    >
      <span className="font-semibold text-ink">Plan saved.</span> It&apos;s on your account
      now, on any device you sign in to.
    </p>
  );
}
