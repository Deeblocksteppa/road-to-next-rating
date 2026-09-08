import { QUESTIONS } from "@/lib/questions";
import { SKILL_TITLES } from "@/lib/diagnoses";

/**
 * Gives the fold a floor. The reference pages put a logo wall here; this
 * product has no customers yet and PRODUCT.md forbids inventing any, so the
 * slot carries facts about the product instead.
 *
 * Every figure is derived from the source of truth rather than typed in, so a
 * change to the question set or the skill taxonomy cannot silently make this
 * row a lie.
 */
const STATS = [
  { value: String(QUESTIONS.length), label: "Questions" },
  { value: String(Object.keys(SKILL_TITLES).length), label: "Skills scored" },
  { value: "3", label: "Week plan" },
  { value: "0", label: "Account needed" },
] as const;

export function StatRow() {
  return (
    <div className="border-y border-line-soft px-6 md:px-10">
      <dl className="mx-auto grid w-full max-w-[1120px] grid-cols-2 md:grid-cols-4">
        {STATS.map((stat, i) => (
          <div
            key={stat.label}
            className={`flex flex-col gap-1.5 py-7 md:py-8 ${
              i % 2 === 1 ? "border-l border-line-soft pl-6" : "md:border-l md:border-line-soft md:pl-6"
            } ${i < 2 ? "border-b border-line-soft md:border-b-0" : ""} ${
              i === 0 ? "md:border-l-0 md:pl-0" : ""
            }`}
          >
            <dd className="font-display text-[32px] font-extrabold leading-none tracking-[-0.01em] tabular-nums text-ink">
              {stat.value}
            </dd>
            <dt className="font-mono text-[11px] uppercase leading-[1.5] tracking-[0.14em] text-ink-3">
              {stat.label}
            </dt>
          </div>
        ))}
      </dl>
    </div>
  );
}
