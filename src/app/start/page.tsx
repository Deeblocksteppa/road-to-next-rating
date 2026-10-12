"use client";

import { useEffect, useMemo, useState } from "react";
import { Assessment } from "@/components/assessment/Assessment";
import { Computing } from "@/components/assessment/Computing";
import { Reveal } from "@/components/diagnosis/Reveal";
import { RoadmapScreen } from "@/components/diagnosis/Roadmap";
import { SavedResult } from "@/components/diagnosis/SavedResult";
import { SaveGate } from "@/components/auth/SaveGate";
import { SKILL_TITLES } from "@/lib/diagnoses";
import { diagnose } from "@/lib/engine";
import { clearLocalResult, loadLocalResult, saveLocalResult } from "@/lib/local-result";
import { clearSignupPending, loadSignupPending } from "@/lib/signup-pending";
import { createClient } from "@/lib/supabase/client";
import { generateRoadmap } from "@/lib/roadmap";
import { AnswerMap } from "@/lib/types";
import {
  saveAssessment,
  saveDiagnosis,
  savePlan,
  getPendingIds,
  clearPendingIds,
  attachLocalResult,
} from "@/lib/persistence";

/**
 * The anonymous funnel.
 *
 * First pass: assessment → computing → reveal → roadmap → save gate. From the
 * gate, "Not now" lands on the saved result, and from then on the saved
 * result is where an anonymous player lives. It is also what /start opens
 * on for anyone with a result on this device, so a returning player sees
 * their diagnosis and plan instead of question one.
 *
 * Nothing on the saved result leads back into the gate by itself: the gate
 * is reachable only by tapping "Create a free account", and every way out of
 * it ("Not now", "Back to my result") returns to the saved result. Replaying
 * the diagnosis also returns there. That is what removes the old loop
 * (gate → committed → roadmap → gate).
 */
type Phase = "loading" | "assessment" | "computing" | "reveal" | "roadmap" | "savegate" | "saved";

export default function Start() {
  const [phase, setPhase] = useState<Phase>("loading");
  const [answers, setAnswers] = useState<AnswerMap | null>(null);
  // True once the player has a stable home on the saved result: set by
  // leaving the gate, by replaying, or by arriving with a stored result.
  const [settled, setSettled] = useState(false);
  // The address a sign-up on this device is waiting on (`signup-pending.ts`).
  // Drives the Save Gate's check-your-inbox screen and the result page's
  // status banner, so neither pitches an account to someone who just made one.
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);

  // localStorage is only readable after mount, so the first render is a blank
  // "loading" frame rather than question one flashing before the saved result.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const stored = loadLocalResult();

      // A signed-in player with a result still on this device doesn't belong
      // on the anonymous result page: attach the result to their account and
      // send them Home. (`getSession` reads the cookie, no network.) They
      // stay on the blank frame meanwhile, never on a "create account" page.
      if (stored) {
        const { data } = await createClient().auth.getSession();
        if (cancelled) return;
        if (data.session) {
          let attached = false;
          try {
            const diag = diagnose(stored.answers);
            await attachLocalResult(stored.answers, diag, generateRoadmap(diag, stored.answers));
            attached = true;
          } catch (err) {
            // Home's own claim is the retry.
            console.error("Failed to attach the result on this device:", err);
          }
          clearSignupPending();
          window.location.replace(attached ? "/home?saved=1" : "/home");
          return;
        }
      }

      if (cancelled) return;
      setPendingEmail(loadSignupPending()?.email ?? null);
      if (stored) {
        setAnswers(stored.answers);
        setSettled(true);
        setPhase("saved");
      } else {
        setPhase("assessment");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Derived, never stored: the engine is deterministic, so these are the same
  // objects the first pass produced.
  const diagnosis = useMemo(() => (answers ? diagnose(answers) : null), [answers]);
  const roadmap = useMemo(
    () => (answers && diagnosis ? generateRoadmap(diagnosis, answers) : null),
    [answers, diagnosis]
  );

  function handleAssessmentComplete(ans: AnswerMap) {
    const diag = diagnose(ans);
    saveLocalResult(ans);
    setAnswers(ans);
    setSettled(false);
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
    if (settled) {
      setPhase("saved");
      return;
    }
    // Persist the plan once, linked to the diagnosis saved earlier.
    const pending = getPendingIds();
    if (roadmap && pending.diagnosis && !pending.plan) {
      savePlan(pending.diagnosis, roadmap).catch((err) =>
        console.error("Failed to save plan:", err)
      );
    }
    setPhase("roadmap");
  }

  function handleLeaveGate() {
    setSettled(true);
    setPhase("saved");
  }

  function handleStartOver() {
    clearLocalResult();
    clearPendingIds();
    clearSignupPending();
    setPendingEmail(null);
    setAnswers(null);
    setSettled(false);
    setPhase("assessment");
    window.scrollTo(0, 0);
  }

  if (phase === "loading") {
    return <main className="min-h-app w-full bg-background" />;
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

  if (phase === "savegate" && roadmap && diagnosis) {
    return (
      <SaveGate
        bottleneckTitle={SKILL_TITLES[diagnosis.bottleneck]}
        weeksTarget={roadmap.weeksTarget}
        onSkip={handleLeaveGate}
        pendingEmail={pendingEmail}
        onPendingChange={setPendingEmail}
      />
    );
  }

  if (phase === "saved" && diagnosis && roadmap && answers) {
    return (
      <SavedResult
        diagnosis={diagnosis}
        roadmap={roadmap}
        answers={answers}
        pendingEmail={pendingEmail}
        onCreateAccount={() => {
          setPhase("savegate");
          window.scrollTo(0, 0);
        }}
        onChangeEmail={() => {
          clearSignupPending();
          setPendingEmail(null);
          setPhase("savegate");
          window.scrollTo(0, 0);
        }}
        onReplay={() => setPhase("reveal")}
        onStartOver={handleStartOver}
      />
    );
  }

  return <Assessment onComplete={handleAssessmentComplete} />;
}
