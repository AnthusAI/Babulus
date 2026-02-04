import type { ReactNode } from "react";
import "./globals.css";
import {
  Bebas_Neue,
  Inter,
  Montserrat,
  Orbitron,
  Oswald,
  Playfair_Display,
  Roboto_Slab,
  Russo_One,
  Source_Sans_3,
  Varela_Round,
} from "next/font/google";
import { configureAmplify } from "../lib/amplify-config.js";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeConfigProvider } from "@/lib/theme-config";
import { SettingsProvider } from "@/lib/settings-context";
import { SettingsDialog } from "@/components/settings-dialog";

const fontHeading = Bebas_Neue({
  subsets: ["latin"],
  weight: "400",
  display: "swap",
  variable: "--font-heading",
});

const fontBody = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-body",
});

const fontPreviewSans = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-preview-sans",
});

const fontPreviewHumanist = Source_Sans_3({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-preview-humanist",
});

const fontPreviewCondensed = Oswald({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-preview-condensed",
});

const fontPreviewDisplay = Bebas_Neue({
  subsets: ["latin"],
  weight: "400",
  display: "swap",
  variable: "--font-preview-display",
});

const fontPreviewSerif = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-preview-serif",
});

const fontPreviewSlab = Roboto_Slab({
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
  display: "swap",
  variable: "--font-preview-slab",
});

const fontPreviewRounded = Varela_Round({
  subsets: ["latin"],
  weight: "400",
  display: "swap",
  variable: "--font-preview-rounded",
});

const fontPreviewSciFi = Orbitron({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-preview-scifi",
});

const fontPreviewGaming = Russo_One({
  subsets: ["latin"],
  weight: "400",
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
