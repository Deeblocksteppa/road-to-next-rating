"use client";

import { useEffect, useMemo, useState } from "react";
import { Assessment } from "@/components/assessment/Assessment";
import { Computing } from "@/components/assessment/Computing";
import { Reveal } from "@/components/diagnosis/Reveal";
import { SaveGate } from "@/components/auth/SaveGate";
import { EXPIRED_BUTTON, ExpiredResult } from "@/components/plan/ExpiredResult";
import { PlanView } from "@/components/plan/PlanView";
import { diagnose } from "@/lib/engine";
import { clearLocalResult, loadLocalResult, saveLocalResult } from "@/lib/local-result";
import { clearSignupPending, loadSignupPending } from "@/lib/signup-pending";
import { createClient } from "@/lib/supabase/client";
import { generateRoadmap } from "@/lib/roadmap";
import { focusReason, retestStart } from "@/lib/result-copy";
import { AnswerMap } from "@/lib/types";
import {
  attachLocalResult,
  ClaimIncompleteError,
  clearDeviceResult,
  clearOwnSignupPending,
  clearPendingIds,
  deviceResultStatus,
  PendingOtherAccountError,
  saveAnonymousResult,
  signedInStatus,
} from "@/lib/persistence";

/**
 * The anonymous funnel.
 *
 * First pass: assessment → computing → reveal → the plan (`PlanView`). The
 * plan is where an anonymous player lives from then on. It is also what
 * /start opens on for anyone with a result on this device, so a returning
 * player sees their diagnosis and plan instead of question one.
 *
 * Nothing opens the save form by itself: only "Start session" and "Save my
 * plan" do, and every way out of it ("Not now", "Back to my plan") returns
 * to the plan. Replaying the diagnosis also returns there.
 *
 * A signed-in player retaking the assessment never sees the form: the same two
 * buttons save and claim the new result, then go to the session or /plan.
 *
 * The result (assessment, diagnosis, plan) is saved once, starting when the
 * assessment ends, through `saveAnonymousResult`. Both buttons wait for that
 * save to finish before opening the form, so a sign-up always carries the
 * complete set of ids. If it still fails after its retries, the form does
 * not open and the plan says so; the next tap tries again.
 */
type Phase = "loading" | "expired" | "assessment" | "computing" | "reveal" | "savegate" | "saved";

export default function Start() {
  const [phase, setPhase] = useState<Phase>("loading");
  const [answers, setAnswers] = useState<AnswerMap | null>(null);
  // The address a sign-up on this device is waiting on (`signup-pending.ts`).
  // Drives the Save Gate's code screen and the plan's status
  // line, so neither pitches an account to someone who just made one.
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  // Only changes the plan's line about accounts. The buttons ask again when tapped.
  const [signedIn, setSignedIn] = useState(false);
  // Why the save form is open: where the player goes once signed in ("Start
  // session" to the session, anything else to the plan), and its subtitle.
  const [gateReason, setGateReason] = useState<"save" | "session">("save");
  // The button waiting on the save, and the one whose save failed.
  const [saving, setSaving] = useState<"save" | "session" | null>(null);
  const [saveFailed, setSaveFailed] = useState<"save" | "session" | null>(null);

  // localStorage is only readable after mount, so the first render is a blank
  // "loading" frame rather than question one flashing before the saved result.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Ids whose rows are gone (30 days unclaimed): the plan below rebuilds
      // from the device with no network call, so this has to ask first, or
      // they could make an account and only then be told the result is gone.
      const status = await deviceResultStatus();
      if (cancelled) return;
      if (status === "expired") {
        clearDeviceResult();
        // `getUser`, not the cookie: a cookie left by a deleted account would
        // bounce through /home to /login and lose this message.
        const { data } = await createClient().auth.getUser();
        if (cancelled) return;
        if (data.user) window.location.replace("/home?expired=1");
        else setPhase("expired");
        return;
      }

      const stored = loadLocalResult();

      // A signed-in player with a result still on this device doesn't belong
      // on the anonymous result page: attach the result to their account and
      // send them Home. (`getSession` reads the cookie, no network.) They
      // stay on the blank frame meanwhile, never on a "create account" page.
      if (stored) {
        const { data } = await createClient().auth.getSession();
        if (cancelled) return;
        if (data.session) {
          // The check couldn't answer: claim nothing, clear nothing. Home asks again.
          if (status === "unknown") {
            window.location.replace("/home");
            return;
          }
          let attached = false;
          try {
            const diag = diagnose(stored.answers);
            await attachLocalResult(stored.answers, diag, generateRoadmap(diag, stored.answers));
            attached = true;
          } catch (err) {
            // Home's own claim is the retry.
            console.error("Failed to attach the result on this device:", err);
            // Rows on another account (a shared device) will never attach. Home
            // would only link back here, so let this player take their own.
            if (err instanceof ClaimIncompleteError) {
              clearSignupPending();
              setSignedIn(true);
              setPhase("assessment");
              return;
            }
            // A sign-up for another address is waiting on this device: the
            // result is that sign-up's, so it stays here, with its pending
            // line, for that address's code (falls through to the plan).
            if (err instanceof PendingOtherAccountError) {
              if (cancelled) return;
              setSignedIn(true);
              setPendingEmail(loadSignupPending()?.email ?? null);
              setAnswers(stored.answers);
              setPhase("saved");
              return;
            }
          }
          // A successful claim cleared the pending note itself; a failed one
          // leaves it for Home's retry, which checks it again.
          window.location.replace(attached ? "/home?saved=1" : "/home");
          return;
        }
      }

      // Nothing stored, so this may be a signed-in player about to retake.
      const signedInNow = !stored && (await signedInStatus()) === "yes";
      if (cancelled) return;
      if (signedInNow) {
        // Only this account's own note: another address's stays with its sign-up.
        await clearOwnSignupPending();
        if (cancelled) return;
        setSignedIn(true);
      }
      setPendingEmail(loadSignupPending()?.email ?? null);
      if (stored) {
        setAnswers(stored.answers);
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
    // A new result: ids from an earlier run must not mix into its set.
    clearPendingIds();
    setAnswers(ans);
    setPhase("computing");

    // Start saving the unclaimed rows now, while the reveal plays. Nothing
    // waits on it here; the buttons that open the save form do.
    saveAnonymousResult(ans, diag, generateRoadmap(diag, ans)).catch((err) =>
      console.error("Failed to save the result:", err)
    );
  }

  function handleRevealNext() {
    setPhase("saved");
    window.scrollTo(0, 0);
  }

  function handleLeaveGate() {
    setGateReason("save");
    setPhase("saved");
    window.scrollTo(0, 0);
  }

  /**
   * "Start session", "Save my plan", and the pending line's "Enter code":
   * claim for a signed-in player, the save form for anyone else (the code
   * screen while a sign-up is waiting).
   */
  async function saveResult(reason: "save" | "session") {
    if (!answers || !diagnosis || !roadmap || saving) return;
    setSaving(reason);
    setSaveFailed(null);
    try {
      await saveAnonymousResult(answers, diagnosis, roadmap);

      const status = await signedInStatus();
      // Auth couldn't answer. The form would offer an account to someone who may
      // already have one, so it stays closed and the next tap asks again.
      if (status === "unknown") throw new Error("Couldn't check who is signed in");
      setSignedIn(status === "yes");
      if (status === "yes") {
        // Throws unless the caller ended up with all three rows.
        // Clears the pending note itself once claimed.
        await attachLocalResult(answers, diagnosis, roadmap);
        window.location.assign(reason === "session" ? "/session" : "/plan");
        return;
      }
    } catch (err) {
      // Signed in as someone else while a sign-up waits here ("Enter code",
      // or either button): nothing was claimed. The gate opens on that
      // sign-up's code screen, which is how the result gets saved.
      if (err instanceof PendingOtherAccountError) {
        setSaving(null);
        setPendingEmail(loadSignupPending()?.email ?? null);
        setGateReason(reason);
        setPhase("savegate");
        window.scrollTo(0, 0);
        return;
      }
      // Retried already. The form needs all three ids, so it stays closed.
      console.error("Failed to save the result:", err);
      setSaving(null);
      setSaveFailed(reason);
      return;
    }
    setSaving(null);
    setGateReason(reason);
    setPhase("savegate");
    window.scrollTo(0, 0);
  }

  function handleStartOver() {
    clearLocalResult();
    clearPendingIds();
    clearSignupPending();
    setPendingEmail(null);
    setAnswers(null);
    setSaveFailed(null);
    setPhase("assessment");
    window.scrollTo(0, 0);
  }

  if (phase === "loading") {
    return <main className="min-h-app w-full bg-background" />;
  }

  if (phase === "expired") {
    return (
      <main className="mx-auto flex min-h-app w-full max-w-md flex-col justify-center bg-background px-6 py-8 text-ink">
        <ExpiredResult>
          <button type="button" onClick={() => setPhase("assessment")} className={EXPIRED_BUTTON}>
            Take the assessment
          </button>
        </ExpiredResult>
      </main>
    );
  }

  if (phase === "computing") {
    return <Computing onDone={() => setPhase("reveal")} />;
  }

  if (phase === "reveal" && diagnosis) {
    return <Reveal diagnosis={diagnosis} onNext={handleRevealNext} />;
  }

  if (phase === "savegate" && roadmap && diagnosis && answers) {
    return (
      <SaveGate
        saveResult={() => saveAnonymousResult(answers, diagnosis, roadmap)}
        onSkip={handleLeaveGate}
        pendingEmail={pendingEmail}
        onPendingChange={setPendingEmail}
        reason={gateReason}
      />
    );
  }

  if (phase === "saved" && diagnosis && roadmap && answers) {
    return (
      <main className="min-h-app w-full bg-background text-ink">
        <div className="mx-auto w-full max-w-[600px] px-6 py-12 md:py-16">
          <PlanView
            skill={diagnosis.bottleneck}
            drills={roadmap.weeklyDrills}
            inGameRule={roadmap.inGameRule}
            retestMetric={roadmap.retestMetric}
            retestStart={retestStart(diagnosis.bottleneck, answers)}
            retestWhen={`In ${roadmap.weeksTarget} weeks`}
            readiness={diagnosis.readiness}
            weeksTarget={roadmap.weeksTarget}
            context={{
              kind: "anonymous",
              focusReason: focusReason(diagnosis, answers),
              pendingEmail,
              signedIn,
              saving,
              saveFailed,
              onStartSession: () => saveResult("session"),
              onSavePlan: () => saveResult("save"),
              onEnterCode: () => saveResult("save"),
              onReplay: () => setPhase("reveal"),
              onStartOver: handleStartOver,
            }}
          />
        </div>
      </main>
    );
  }

  return <Assessment onComplete={handleAssessmentComplete} />;
}
