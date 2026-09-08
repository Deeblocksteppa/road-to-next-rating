import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        // Archivo — verdicts & metrics (variable, incl. wdth axis for the wordmark)
        display: ["var(--font-display)", "Archivo", "sans-serif"],
        // Instrument Sans — body, buttons, the coach's voice
        sans: ["var(--font-sans)", "Instrument Sans", "sans-serif"],
        // IBM Plex Mono — labels, units, countdowns (mono smallcaps)
        mono: ["var(--font-mono)", "IBM Plex Mono", "monospace"],
      },
      colors: {
        // ── shadcn / base-ui semantic tokens (CSS-var driven, dark only) ──
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: { DEFAULT: "hsl(var(--card))", foreground: "hsl(var(--card-foreground))" },
        popover: { DEFAULT: "hsl(var(--popover))", foreground: "hsl(var(--popover-foreground))" },
        primary: { DEFAULT: "hsl(var(--primary))", foreground: "hsl(var(--primary-foreground))" },
        secondary: { DEFAULT: "hsl(var(--secondary))", foreground: "hsl(var(--secondary-foreground))" },
        muted: { DEFAULT: "hsl(var(--muted))", foreground: "hsl(var(--muted-foreground))" },
        accent: { DEFAULT: "hsl(var(--accent))", foreground: "hsl(var(--accent-foreground))" },
        destructive: { DEFAULT: "hsl(var(--destructive))", foreground: "hsl(var(--destructive-foreground))" },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",

        // ── RTNR design tokens (raw hex) — see design/DESIGN_SYSTEM.md ──
        surface: { DEFAULT: "#131315", 2: "#1A1A1D" },
        // `line` (#232327) is ~rgba(255,255,255,0.08) over the app ground and
        // stays the in-app card edge. `soft` is the lighter 0.06 rule used
        // between marketing sections; `hair` is the exact 0.08 edge every
        // marketing screenshot card carries now that it sits on the page
        // ground directly rather than inside a presentation surface.
        line: {
          DEFAULT: "#232327",
          soft: "rgba(255,255,255,0.06)",
          // The card hairline on the marketing site. Translucent rather than a
          // flat hex so the same edge holds over both marketing grounds
          // (`background` and the raised `#0E0E10`) without being re-picked.
          hair: "rgba(255,255,255,0.08)",
          strong: "#2E2E33",
          hover: "#4A4A50",
        },
        // ink-2/ink-3 raised from the original spec (#9C9C97 / #63635E) for
        // legibility — ink-3 was 3.25:1 against #0B0B0C, below WCAG AA's 4.5:1
        // floor for small text. New values: ink-3 ~4.96:1, ink-2 ~9.06:1,
        // ink (unchanged) ~17.86:1 — same warm-neutral hue, ordering preserved.
        //
        // ink-1 (~13.8:1) sits between ink and ink-2 and exists for marketing
        // body copy, which a cold visitor scans rather than studies. In-app
        // secondary text stays on ink-2; this tier is not a replacement for it.
        ink: { DEFAULT: "#F4F4F2", 1: "#D8D8D4", 2: "#B0B0AB", 3: "#80807B" },
        optic: {
          DEFAULT: "#D8E34C",
          hover: "#E6EF7A",
          ink: "#131408",
          dim: "rgba(216,227,76,0.12)",
        },
        warn: "#E3B84C",
        danger: { DEFAULT: "#E3654C", hover: "#E98572" },
        reveal: "#060607",
      },
      borderRadius: {
        // Formalized radius scale (DESIGN_SYSTEM.md §3). rounded-lg (14) = base/button.
        xs: "6px",
        sm: "8px",
        md: "12px",
        lg: "14px",
        xl: "16px",
        "2xl": "20px",
      },
    },
  },
  plugins: [],
};
export default config;
