"use client";

import { useRouter } from "next/navigation";

import { Reveal } from "@/components/diagnosis/Reveal";
import type { Diagnosis } from "@/lib/types";

/**
 * A re-test that moved the focus to a new skill, explained before the new
 * plan opens: the reveal's verdict, insight and absolution for the new
 * diagnosis. The player has just seen their answers and score on the result
 * screen, so the mirror and readiness beats are left out.
 */
export function RetestReveal({ diagnosis }: { diagnosis: Diagnosis }) {
  const router = useRouter();
  return (
    <Reveal
      diagnosis={diagnosis}
      beats={["verdict", "insight", "absolution"]}
      verdictEyebrow="Your next focus"
      finishLabel="See my new plan"
      onNext={() => router.push("/plan")}
    />
  );
}
