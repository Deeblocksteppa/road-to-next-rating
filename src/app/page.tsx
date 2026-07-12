"use client";

import { useState } from "react";
import { Assessment } from "@/components/assessment/Assessment";
import { Computing } from "@/components/assessment/Computing";
import { Reveal } from "@/components/diagnosis/Reveal";
import { RoadmapScreen } from "@/components/diagnosis/Roadmap";
import { CommittedScreen } from "@/components/diagnosis/Committed";
import { diagnose } from "@/lib/engine";
import { generateRoadmap, Roadmap } from "@/lib/roadmap";
import { QUESTIONS } from "@/lib/questions";
import { AnswerMap, Diagnosis } from "@/lib/types";

type Phase = "landing" | "assessment" | "computing" | "reveal" | "roadmap" | "committed";

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
  }

  function handleRevealNext() {
    if (diagnosis && answers) {
      setRoadmap(generateRoadmap(diagnosis, answers));
      setPhase("roadmap");
    }
  }

  function handleReset() {
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
    return <RoadmapScreen roadmap={roadmap} onCommit={() => setPhase("committed")} />;
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
    <main
      className="relative flex min-h-[100dvh] w-full flex-col items-center justify-center px-6 text-center bg-[#080b12] text-slate-100"
      style={{
        backgroundImage:
          "radial-gradient(120% 80% at 50% -10%, #0e1726 0%, #080b12 55%, #06080d 100%)",
      }}
    >
      <LandingStyles />
      <div className="landing-in mx-auto w-full max-w-[520px] space-y-8">
        <div className="space-y-4">
          <h1 className="text-4xl font-semibold leading-[1.1] tracking-tight text-slate-50 md:text-5xl">
            Road to{" "}
            <span className="bg-gradient-to-r from-sky-400 to-emerald-400 bg-clip-text text-transparent">
              Next Rating
            </span>
          </h1>
          <div className="space-y-1">
            <p className="text-[17px] leading-relaxed text-slate-200">
              Find what&apos;s holding back your game.
            </p>
            <p className="text-sm leading-relaxed text-slate-400">
              3 minutes. No generic advice. Just the one thing that actually matters.
            </p>
          </div>
        </div>

        <button
          onClick={() => setPhase("assessment")}
          className={[
            "mx-auto block rounded-xl bg-gradient-to-r from-sky-500 to-emerald-500",
            "px-10 py-4 text-[16px] font-medium text-white",
            "hover:opacity-90 active:scale-[0.99] transition-all duration-150",
          ].join(" ")}
        >
          Start →
        </button>

        <p className="text-[12px] text-slate-600">{QUESTIONS.length} questions · ~3 minutes</p>
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
