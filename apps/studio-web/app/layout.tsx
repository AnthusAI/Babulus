import type { ReactNode } from "react";
import "./globals.css";
import localFont from "next/font/local";
import { configureAmplify } from "../lib/amplify-config.js";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeConfigProvider } from "@/lib/theme-config";
import { SettingsProvider } from "@/lib/settings-context";
import { SettingsDialog } from "@/components/settings-dialog";

// Fonts are self-hosted (latin subset, from Fontsource) so the build never fetches them from Google.
// Russo One comes from the @fontsource/russo-one package, so its licence ships unedited.
const fontHeading = localFont({
  src: [
    { path: "./fonts/bebas-neue/bebas-neue-latin-400-normal.woff2", weight: "400", style: "normal" },
  ],
  display: "swap",
  variable: "--font-heading",
});

const fontBody = localFont({
  src: [
    { path: "./fonts/montserrat/montserrat-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "./fonts/montserrat/montserrat-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "./fonts/montserrat/montserrat-latin-600-normal.woff2", weight: "600", style: "normal" },
    { path: "./fonts/montserrat/montserrat-latin-700-normal.woff2", weight: "700", style: "normal" },
  ],
  display: "swap",
  variable: "--font-body",
});

const fontPreviewSans = localFont({
  src: [
    { path: "./fonts/inter/inter-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "./fonts/inter/inter-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "./fonts/inter/inter-latin-600-normal.woff2", weight: "600", style: "normal" },
    { path: "./fonts/inter/inter-latin-700-normal.woff2", weight: "700", style: "normal" },
    { path: "./fonts/inter/inter-latin-800-normal.woff2", weight: "800", style: "normal" },
  ],
  display: "swap",
  variable: "--font-preview-sans",
});

const fontPreviewHumanist = localFont({
  src: [
    { path: "./fonts/source-sans-3/source-sans-3-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "./fonts/source-sans-3/source-sans-3-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "./fonts/source-sans-3/source-sans-3-latin-600-normal.woff2", weight: "600", style: "normal" },
    { path: "./fonts/source-sans-3/source-sans-3-latin-700-normal.woff2", weight: "700", style: "normal" },
    { path: "./fonts/source-sans-3/source-sans-3-latin-800-normal.woff2", weight: "800", style: "normal" },
  ],
  display: "swap",
  variable: "--font-preview-humanist",
});

const fontPreviewCondensed = localFont({
  src: [
    { path: "./fonts/oswald/oswald-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "./fonts/oswald/oswald-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "./fonts/oswald/oswald-latin-600-normal.woff2", weight: "600", style: "normal" },
    { path: "./fonts/oswald/oswald-latin-700-normal.woff2", weight: "700", style: "normal" },
  ],
  display: "swap",
  variable: "--font-preview-condensed",
});

const fontPreviewDisplay = localFont({
  src: [
    { path: "./fonts/bebas-neue/bebas-neue-latin-400-normal.woff2", weight: "400", style: "normal" },
  ],
  display: "swap",
  variable: "--font-preview-display",
});

// Variable fonts: one file covers the whole weight range.
const fontPreviewSerif = localFont({
  src: "./fonts/playfair-display/playfair-display-latin-wght-normal.woff2",
  weight: "400 900",
  style: "normal",
  display: "swap",
  variable: "--font-preview-serif",
});

const fontPreviewSlab = localFont({
  src: "./fonts/roboto-slab/roboto-slab-latin-wght-normal.woff2",
  weight: "100 900",
  style: "normal",
  display: "swap",
  variable: "--font-preview-slab",
});

const fontPreviewRounded = localFont({
  src: [
    { path: "./fonts/varela-round/varela-round-latin-400-normal.woff2", weight: "400", style: "normal" },
  ],
  display: "swap",
  variable: "--font-preview-rounded",
});

const fontPreviewSciFi = localFont({
  src: [
    { path: "./fonts/orbitron/orbitron-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "./fonts/orbitron/orbitron-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "./fonts/orbitron/orbitron-latin-600-normal.woff2", weight: "600", style: "normal" },
    { path: "./fonts/orbitron/orbitron-latin-700-normal.woff2", weight: "700", style: "normal" },
  ],
  display: "swap",
  variable: "--font-preview-scifi",
});

const fontPreviewGaming = localFont({
  src: [
    { path: "../../../node_modules/@fontsource/russo-one/files/russo-one-latin-400-normal.woff2", weight: "400", style: "normal" },
  ],
  display: "swap",
  variable: "--font-preview-gaming",
});

// Configure Amplify once at app startup
configureAmplify();

export const metadata = {
  title: "Babulus - The AI Video Factory",
  description: "Automated video production for modern brands.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body
        className={[
          fontHeading.variable,
          fontBody.variable,
          fontPreviewSans.variable,
          fontPreviewHumanist.variable,
          fontPreviewCondensed.variable,
          fontPreviewDisplay.variable,
          fontPreviewSerif.variable,
          fontPreviewSlab.variable,
          fontPreviewRounded.variable,
          fontPreviewSciFi.variable,
          fontPreviewGaming.variable,
        ].join(" ")}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ThemeConfigProvider>
            <SettingsProvider>
              <SettingsDialog />
              {children}
            </SettingsProvider>
          </ThemeConfigProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
