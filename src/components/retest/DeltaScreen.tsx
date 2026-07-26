"use client";

import Link from "next/link";

import type { RetestResult } from "@/app/retest/actions";
import { LockedCard } from "@/components/ui/locked-card";
import { SKILL_LABELS, SKILL_TITLES } from "@/lib/diagnoses";
import type { SkillDelta } from "@/lib/delta";

function sign(n: number): string {
  return n > 0 ? `+${n}` : `${n}`;
}

/** "your third-shot drop" → "third-shot drop", for "Your ___ moved." */
function bareSkillPhrase(skill: SkillDelta["skill"]): string {
  return SKILL_LABELS[skill].replace(/^your\s+/i, "");
}

export function DeltaScreen({ result }: { result: RetestResult }) {
  const { delta } = result;
  const up = delta.readiness.delta >= 0;

  return (
    <main className="flex min-h-[100dvh] w-full flex-col justify-center gap-6 bg-reveal px-6 py-8 text-ink">
      <div className="flex flex-col gap-3">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-ink-3">
          Re-test complete
        </p>
        <h1 className="font-display text-[34px] font-extrabold leading-[1.05] tracking-[-0.02em]">
          Your {bareSkillPhrase(result.previousBottleneck)} moved.
        </h1>
      </div>

      <div className="flex items-baseline gap-3.5">
        <span className="font-display text-[72px] font-extrabold leading-none tabular-nums text-ink-3">
          {delta.readiness.previous}
        </span>
        <span className="font-display text-2xl font-extrabold text-ink-3">→</span>
        <span className="font-display text-[72px] font-extrabold leading-none tabular-nums">
          {delta.readiness.current}
        </span>
        <span
          className={`pb-2 font-mono text-sm ${up ? "text-optic" : "text-danger"}`}
        >
          {sign(delta.readiness.delta)}
        </span>
      </div>

      {result.isPaid ? (
        <>
          <BreakdownCard skills={delta.skills} />
          <Link
            href="/home"
            className="flex h-[52px] w-full items-center justify-center rounded-lg bg-optic text-[15px] font-semibold text-optic-ink transition-colors hover:bg-optic-hover active:scale-[0.98]"
          >
            See what to fix next
          </Link>
        </>
      ) : (
        <>
          <LockedCard
            label="Which skills moved"
            teaser="See the movement in each skill — and where it came from."
          >
            <BreakdownCard skills={delta.skills} />
          </LockedCard>
          {/* This delta result is ephemeral client state (not a URL), so there's
              no stable page to return "back" to — send them to Home instead. */}
          <Link
            href="/paywall?from=/home"
            className="flex h-[52px] w-full items-center justify-center rounded-lg bg-optic text-[15px] font-semibold text-optic-ink transition-colors hover:bg-optic-hover active:scale-[0.98]"
          >
            See the full breakdown
          </Link>
        </>
      )}
    </main>
  );
}

function BreakdownCard({ skills }: { skills: SkillDelta[] }) {
  return (
    <div className="flex flex-col rounded-2xl border border-line bg-background px-5">
      {skills.map((s, i) => (
        <div key={s.skill}>
          {i > 0 && <div className="h-px bg-line" />}
          <div className="flex items-center justify-between py-4">
            <span className="text-[15px] font-semibold">{SKILL_TITLES[s.skill]}</span>
            <span className="font-mono text-[13px]">
              <span className="text-ink-3">{s.previousLevel}/3</span>{" "}
              <span className="text-ink-3">→</span> {s.currentLevel}/3{" "}
              {s.delta !== 0 && (
                <span className={s.delta > 0 ? "text-optic" : "text-danger"}>
                  {sign(s.delta)}
                </span>
              )}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
