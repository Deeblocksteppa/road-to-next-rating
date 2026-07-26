import type { Metadata } from "next";
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
    "You don't have ten weaknesses. You have one. Find the skill holding your rating down — and the three weeks that fix it.",
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
        <meta name="theme-color" content="#0B0B0C" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
