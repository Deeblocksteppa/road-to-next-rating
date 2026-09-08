import Image from "next/image";
import { SHOTS, type ShotKey } from "./shots";

/**
 * A real app screenshot, framed in the app's own card language: 20px radius,
 * a 1px rgba(255,255,255,0.08) hairline, `surface` ground, no shadow
 * (DESIGN.md's Flat-By-Default rule holds on the marketing site too).
 *
 * The card sits directly on the page ground. It used to sit inside a
 * presentation stage — an outer rounded rectangle a shade lighter than the
 * card, with ~80px of empty grey on either side. Two frames around one
 * picture: the grey was close enough in value to the card to read as a smudge
 * rather than as a surface, and its only real contribution was empty area.
 * The hairline is what the stage was standing in for, and it is enough.
 *
 * `reveal` is the fraction of the source screen's height the frame shows. It is
 * deliberately a ratio, not a pixel height: a fixed height cannot be correct at
 * both a 300px mobile container and a 440px desktop one, and getting it wrong
 * makes `object-fit: cover` scale by height and slice the left and right edges
 * off the screenshot. Expressed as a fraction the frame's aspect ratio tracks
 * its width, so width always governs the cover scale and horizontal clipping is
 * impossible at any container size.
 */
export function AppShot({
  shot,
  glow = false,
  reveal = 1,
  bleed = false,
  anchor = "top",
  caption,
  priority = false,
  className = "",
}: {
  shot: ShotKey;
  /**
   * Names what this particular screen is. Required wherever two shots sit side
   * by side — without it the reader has to guess which claim maps to which
   * image, and two screens from different demo runs read as one contradiction.
   */
  caption?: string;
  /** Ambient optic field behind the frame. Hero only — one per page. */
  glow?: boolean;
  /** Fraction of the source screen's height to show, 0–1. */
  reveal?: number;
  /**
   * Cuts the frame flat along its bottom edge, so the screen reads as running
   * on past it. A depth signal that only works while it is rare — six cropped
   * cards stop implying "the product continues" and start reading as an
   * overflow bug — so this is spent on one card per page, not applied by
   * default.
   */
  bleed?: boolean;
  /**
   * Which band of the screen is kept. List screens like Plan and Progress read
   * from the top down. A number (0–1) is the band's own offset down the source
   * — reveal beats sit their one idea in a screen that is mostly empty above
   * and below it, and neither `top` nor `center` lands on that idea.
   */
  anchor?: "top" | "center" | number;
  priority?: boolean;
  className?: string;
}) {
  const { src, ready, w, h, label, alt } = SHOTS[shot];

  return (
    <div className={`relative ${className}`}>
      {glow ? (
        <div
          aria-hidden="true"
          // The frame in front of this is opaque, so anything inside its
          // footprint is invisible. Push the field's energy outward past the
          // frame edge, where it can actually be seen.
          className="pointer-events-none absolute -inset-x-24 -inset-y-16 -z-10"
          style={{
            background:
              "radial-gradient(closest-side at 50% 46%, rgba(216,227,76,0.30), rgba(216,227,76,0.14) 58%, rgba(216,227,76,0.05) 76%, transparent 92%)",
          }}
        />
      ) : null}

      <div
        className={`overflow-hidden border-line-hair bg-surface ${
          bleed ? "rounded-t-2xl border-x border-t" : "rounded-2xl border"
        }`}
        style={{ aspectRatio: `${w} / ${h * reveal}` }}
      >
        {ready ? (
          <Image
            src={src}
            alt={alt}
            width={w}
            height={h}
            priority={priority}
            // The desktop candidate is picked from the widest box a shot
            // actually gets, not from the source's 375px logical width: the
            // Proof frames render ~532px and step 03 ~440px, so a flat 375px
            // hint had the browser upscale the two Proof captures by 1.41×.
            sizes="(max-width: 767px) 88vw, (max-width: 1023px) 45vw, 540px"
            className={`block h-full w-full object-cover ${
              typeof anchor === "number"
                ? ""
                : anchor === "center"
                  ? "object-center"
                  : "object-top"
            }`}
            style={
              typeof anchor === "number"
                ? { objectPosition: `50% ${(anchor * 100).toFixed(1)}%` }
                : undefined
            }
          />
        ) : (
          <div
            role="img"
            aria-label={alt}
            className="flex h-full w-full flex-col items-center justify-center gap-2 px-6 text-center"
          >
            <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-3">
              Screenshot pending
            </span>
            <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-2">
              {label}
            </span>
          </div>
        )}
      </div>

      {caption ? (
        <p className="mt-3 text-center font-mono text-[11px] uppercase leading-[1.5] tracking-[0.12em] text-ink-3">
          {caption}
        </p>
      ) : null}
    </div>
  );
}
