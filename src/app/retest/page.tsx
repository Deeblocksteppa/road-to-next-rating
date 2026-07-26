"use client";

import { useState } from "react";

import { submitRetest, type RetestResult } from "@/app/retest/actions";
import { Assessment } from "@/components/assessment/Assessment";
import { Computing } from "@/components/assessment/Computing";
import { DeltaScreen } from "@/components/retest/DeltaScreen";
import type { AnswerMap } from "@/lib/types";

type Phase = "assessment" | "computing" | "delta" | "error";

export default function RetestPage() {
  const [phase, setPhase] = useState<Phase>("assessment");
  const [result, setResult] = useState<RetestResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleComplete(answers: AnswerMap) {
    setPhase("computing");
    try {
      const res = await submitRetest(answers);
      setResult(res);
      setPhase("delta");
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
    // Loading visual while submitRetest runs; the phase advances on resolve.
    return <Computing onDone={() => {}} />;
  }

  if (phase === "delta" && result) {
    return <DeltaScreen result={result} />;
  }

  return (
    <main className="flex min-h-[100dvh] w-full items-center justify-center bg-background px-6 py-12 text-foreground">
      <div className="w-full max-w-sm space-y-4 text-center">
        <p className="text-sm text-destructive">{error ?? "Something went wrong."}</p>
        <button
          onClick={() => {
            setError(null);
            setResult(null);
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
