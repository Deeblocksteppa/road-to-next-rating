"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Assessment } from "@/components/assessment/Assessment";
import { Computing } from "@/components/assessment/Computing";
import { Reveal } from "@/components/diagnosis/Reveal";
import { RoadmapScreen } from "@/components/diagnosis/Roadmap";
import { CommittedScreen } from "@/components/diagnosis/Committed";
import { SaveGate } from "@/components/auth/SaveGate";
import { diagnose } from "@/lib/engine";
import { generateRoadmap, Roadmap } from "@/lib/roadmap";
import { AnswerMap, Diagnosis } from "@/lib/types";
import {
  saveAssessment,
  saveDiagnosis,
  savePlan,
  getPendingIds,
  clearPendingIds,
} from "@/lib/persistence";

/**
 * The anonymous funnel. The landing phase that used to open this flow now
 * lives at `/` as the marketing site, so this route starts on question one.
 */
type Phase = "assessment" | "computing" | "reveal" | "roadmap" | "savegate" | "committed";

export default function Start() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("assessment");
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
    router.push("/");
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

  return <Assessment onComplete={handleAssessmentComplete} />;
}
