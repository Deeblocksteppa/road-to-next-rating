"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { claimPendingRecords } from "@/lib/persistence";

/**
 * Runs on /home. If the user arrived here with anonymous rows still
 * pending in localStorage (e.g. after Google OAuth or an email-confirmation
 * round trip, where the Save Gate couldn't claim inline), claim them now and
 * refresh so the freshly-claimed diagnosis/plan render.
 */
export function ClaimOnLoad() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const claimed = await claimPendingRecords();
        if (claimed && !cancelled) router.refresh();
      } catch (err) {
        console.error("Failed to claim records on load:", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return null;
}
