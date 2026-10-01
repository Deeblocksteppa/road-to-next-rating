import type { Metadata, Viewport } from "next";
import { Archivo, Instrument_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

// Display — Archivo (variable). Include the wdth axis for the expanded wordmark.
const archivo = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-display",
  display: "swap",
});

// Body / UI — Instrument Sans (variable).
const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

// Mono — IBM Plex Mono (not variable; load the weights we use).
const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Road to Next Rating",
  description:
    "You don't need to fix ten things. Start with one. Find the pickleball skill to work on first, with a three-week plan to work on it.",
};

/*
 * `viewport-fit=cover` lets the page use the whole screen on notched iPhones,
 * including as a home-screen app with the translucent status bar. Without it
 * iOS reports every safe-area inset as 0, so nothing could clear the notch
 * or the home indicator. The insets are applied in globals.css (body
 * padding, `min-h-app`) and on the fixed tab bar.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0B0B0C",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${archivo.variable} ${instrumentSans.variable} ${ibmPlexMono.variable}`}
    >
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
