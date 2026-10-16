import type { Metadata, Viewport } from "next";
import { Geist_Mono, Instrument_Serif, Inter_Tight } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const sans = Inter_Tight({ variable: "--font-inter-tight", subsets: ["latin"], display: "swap" });
const serif = Instrument_Serif({ variable: "--font-instrument-serif", subsets: ["latin"], weight: "400", display: "swap" });
const mono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: { default: "Skylark — Your next move, already in motion", template: "%s · Skylark" },
  description:
    "Skylark is a human-assisted job application service. Share your profile once; we match you to roles you're eligible for, tailor each application, and a specialist reviews and submits it — while you prepare for interviews.",
  applicationName: "Skylark",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  openGraph: { type: "website", siteName: "Skylark" },
};

export const viewport: Viewport = {
  themeColor: "#FFFFFF",
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // Browser extensions often stamp attributes onto <html> and <body> before React hydrates; this
    // ignores attribute differences on these two elements only, so real mismatches still surface.
    <html lang="en" className={`${sans.variable} ${serif.variable} ${mono.variable} antialiased`} suppressHydrationWarning>
      <body className="min-h-dvh" suppressHydrationWarning>
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:bg-fg focus:px-3 focus:py-2 focus:text-sm focus:text-bg">
          Skip to content
        </a>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
