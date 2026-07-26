"use client";

import Link from "next/link";
import { useState } from "react";
import { Assessment } from "@/components/assessment/Assessment";
import { Computing } from "@/components/assessment/Computing";
import { Reveal } from "@/components/diagnosis/Reveal";
import { RoadmapScreen } from "@/components/diagnosis/Roadmap";
import { CommittedScreen } from "@/components/diagnosis/Committed";
import { SaveGate } from "@/components/auth/SaveGate";
import { LogoFull } from "@/components/brand/Logo";
import { diagnose } from "@/lib/engine";
import { generateRoadmap, Roadmap } from "@/lib/roadmap";
import { QUESTIONS } from "@/lib/questions";
import { AnswerMap, Diagnosis } from "@/lib/types";
import {
  saveAssessment,
  saveDiagnosis,
  savePlan,
  getPendingIds,
  clearPendingIds,
} from "@/lib/persistence";

type Phase =
  | "landing"
  | "assessment"
  | "computing"
  | "reveal"
  | "roadmap"
  | "savegate"
  | "committed";

export default function Home() {
  const [phase, setPhase] = useState<Phase>("landing");
  const [diagnosis, setDiagnosis] = useState<Diagnosis | null>(null);
  const [answers, setAnswers] = useState<AnswerMap | null>(null);
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);

  function handleAssessmentComplete(ans: AnswerMap) {
    const diag = diagnose(ans);
    setDiagnosis(diag);
    setAnswers(ans);
    setPhase("computing");

    // Persist the assessment + diagnosis as unclaimed rows (best-effort — the
    // UX continues regardless; the ids are stashed in localStorage for claim).
    (async () => {
      try {
        const assessmentId = await saveAssessment(ans);
        await saveDiagnosis(assessmentId, diag, ans);
      } catch (err) {
        console.error("Failed to save assessment/diagnosis:", err);
      }
    })();
  }

  function handleRevealNext() {
    if (diagnosis && answers) {
      const generated = generateRoadmap(diagnosis, answers);
      setRoadmap(generated);
      setPhase("roadmap");

      // Persist the plan, linked to the diagnosis saved earlier.
      const diagnosisId = getPendingIds().diagnosis;
      if (diagnosisId) {
        savePlan(diagnosisId, generated).catch((err) =>
          console.error("Failed to save plan:", err)
        );
      }
    }
  }

  function handleReset() {
    clearPendingIds();
    setPhase("landing");
    setDiagnosis(null);
    setAnswers(null);
    setRoadmap(null);
  }

  if (phase === "assessment") {
    return <Assessment onComplete={handleAssessmentComplete} />;
  }

  if (phase === "computing") {
    return <Computing onDone={() => setPhase("reveal")} />;
  }

  if (phase === "reveal" && diagnosis) {
    return <Reveal diagnosis={diagnosis} onNext={handleRevealNext} />;
  }

  if (phase === "roadmap" && roadmap) {
    return <RoadmapScreen roadmap={roadmap} onCommit={() => setPhase("savegate")} />;
  }

  if (phase === "savegate" && roadmap) {
    return (
      <SaveGate
        bottleneckLabel={roadmap.bottleneckLabel}
        weeksTarget={roadmap.weeksTarget}
        onSkip={() => setPhase("committed")}
      />
    );
  }

  if (phase === "committed" && roadmap) {
    return (
      <CommittedScreen
        roadmap={roadmap}
        onBackToPlan={() => setPhase("roadmap")}
        onStartOver={handleReset}
      />
    );
  }

  // Landing
  return (
    <main className="relative flex min-h-[100dvh] w-full flex-col bg-background px-6 text-ink">
      <LandingStyles />

      <header className="landing-in flex items-center pt-5">
        <LogoFull />
      </header>

      <div className="landing-in flex flex-1 flex-col justify-center gap-5 py-10">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-3">
          For players stuck at 3.0–4.0
        </p>
        <h1
          className="text-balance font-display text-[38px] font-extrabold leading-[1.08] tracking-[-0.02em] md:text-[56px] md:leading-[1.05]"
        >
          You don&apos;t have ten weaknesses. You have one.
        </h1>
        <p className="text-pretty text-[15px] leading-[1.6] text-ink-2 md:text-base">
          Twelve questions. One diagnosis: the skill holding your rating down,
          why it hasn&apos;t moved — and the three weeks that fix it.
        </p>
      </div>

      <div className="landing-in flex flex-col gap-3.5 pb-6">
        <button
          onClick={() => setPhase("assessment")}
          className="flex h-[52px] w-full items-center justify-center rounded-lg bg-optic text-[15px] font-semibold text-optic-ink transition-colors hover:bg-optic-hover active:scale-[0.98]"
        >
          Start the assessment
        </button>
        <p className="text-center font-mono text-[11px] uppercase tracking-[0.12em] text-ink-3">
          {QUESTIONS.length} questions · 4 minutes · free
        </p>
        <p className="text-center text-[13px] text-ink-2">
          Already have an account?{" "}
          <Link href="/login" className="underline underline-offset-4">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}

function LandingStyles() {
  return (
    <style>{`
      @keyframes landingIn {
        from { opacity: 0; transform: translateY(14px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      .landing-in {
        animation: landingIn 0.7s cubic-bezier(0.22, 1, 0.36, 1) both;
      }
      @media (prefers-reduced-motion: reduce) {
        .landing-in { animation: none; }
      }
    `}</style>
  );
}
