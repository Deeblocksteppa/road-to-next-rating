/**
 * The player's own rating, read from question 1's free text ("3.5 DUPR",
 * "self-rated around 3.7"), for the few story lines that name a level.
 *
 * Conservative on purpose: a wrong number in the diagnosis is worse than a
 * neutral phrase. It returns `null` — and the copy says "your current level"
 * — unless the answer holds exactly one plausible reading:
 *   • decimal numbers win ("2 years at 3.5" → 3.5);
 *   • with no decimal, a lone whole number counts ("about a 3" → 3.0), but
 *     not one followed by a unit ("3 years", "3x a week"), and two or more
 *     whole numbers are ambiguous and count as nothing;
 *   • the value must sit in [2.0, 4.0). At 4.0 or above, "separates 4.2
 *     from 4.0" would be nonsense, and the product's target is 4.0.
 */
export function statedRating(raw: unknown): string | null {
  if (typeof raw !== "string") return null;

  // Plain token matching (no lookbehind: that is a parse error on iOS
  // Safari before 16.4 and would break the whole bundle there).
  const decimals: string[] = [];
  const wholes: string[] = [];
  for (const m of Array.from(raw.matchAll(/\d+(?:\.\d+)?/g))) {
    const token = m[0];
    if (/^\d\.\d{1,3}$/.test(token)) {
      decimals.push(token);
    } else if (/^\d$/.test(token)) {
      // A whole number with a unit after it is a count, not a rating:
      // "3 years at this level", "3x a week".
      const after = raw.slice((m.index ?? 0) + token.length);
      if (!/^\s*(x\b|times?\b|years?\b|yrs?\b|months?\b|weeks?\b|days?\b|hours?\b|hrs?\b)/i.test(after)) {
        wholes.push(token);
      }
    }
  }

  let value: number | null = null;
  if (decimals.length > 0) {
    // Several distinct decimals ("3.5 or 3.7") are ambiguous too.
    const distinct = Array.from(new Set(decimals));
    if (distinct.length === 1) value = Number(distinct[0]);
  } else if (wholes.length === 1) {
    value = Number(wholes[0]);
  }

  if (value === null || !Number.isFinite(value) || value < 2 || value >= 4) return null;

  // Keep the precision the player used, but always show at least one decimal.
  const text = String(value);
  return text.includes(".") ? text : value.toFixed(1);
}

/** The level a story line names: the player's rating, or a neutral phrase. */
export function levelPhrase(raw: unknown): string {
  return statedRating(raw) ?? "your current level";
}

/** Fill the `{level}` slot in a story line. */
export function fillLevel(text: string, level: string): string {
  return text.split("{level}").join(level);
}
