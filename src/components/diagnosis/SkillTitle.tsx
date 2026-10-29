/**
 * A skill title for display sizes. At 46px "Third-shot drop" is wider than the
 * 375px column, and the browser breaks after the typed hyphen ("Third-" /
 * "shot drop"). Each hyphenated word is kept whole, so a break can only fall
 * between words. `hyphens: none` doesn't help (a typed hyphen is a break
 * opportunity, not hyphenation), and a non-breaking hyphen (U+2011) may be
 * missing from Archivo.
 */
export function SkillTitle({ title }: { title: string }) {
  const words = title.split(" ");
  return (
    <>
      {words.map((word, i) => (
        <span key={i}>
          {word.includes("-") ? <span className="whitespace-nowrap">{word}</span> : word}
          {i < words.length - 1 ? " " : null}
        </span>
      ))}
    </>
  );
}
