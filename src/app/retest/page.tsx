"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { submitRetest } from "@/app/retest/actions";
import { Assessment } from "@/components/assessment/Assessment";
import { Computing } from "@/components/assessment/Computing";
import { retestHref } from "@/lib/retest-view";
import type { AnswerMap } from "@/lib/types";

type Phase = "assessment" | "computing" | "error";

/**
 * Takes the re-test, then hands off to the result screen at `/retest/[id]`.
 * `replace`, not `push`: Back from the result should not reopen a blank
 * assessment for a re-test that has already been saved.
 */
export default function RetestPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("assessment");
  const [error, setError] = useState<string | null>(null);

  async function handleComplete(answers: AnswerMap) {
    setPhase("computing");
    try {
      const { diagnosisId } = await submitRetest(answers);
      router.replace(retestHref(diagnosisId));
    } catch (err) {
      console.error("Re-test failed:", err);
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setPhase("error");
    }
  }

  if (phase === "assessment") {
    return <Assessment onComplete={handleComplete} />;
  }

  if (phase === "computing") {
    // Loading visual while submitRetest runs and the result route loads.
    return <Computing onDone={() => {}} />;
  }

  return (
    <main className="flex min-h-app w-full items-center justify-center bg-background px-6 py-12 text-foreground">
      <div className="w-full max-w-sm space-y-4 text-center">
        <p className="text-sm text-destructive">{error ?? "Something went wrong."}</p>
        <button
          onClick={() => {
            setError(null);
            setPhase("assessment");
          }}
          className="text-sm text-foreground underline underline-offset-4"
        >
          Try again
        </button>
      </div>
    </main>
  );
}
