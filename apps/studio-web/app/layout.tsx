import type { ReactNode } from "react";
import "./globals.css";
import { configureAmplify } from "../lib/amplify-config.js";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeConfigProvider } from "@/lib/theme-config";
import { SettingsProvider } from "@/lib/settings-context";
import { SettingsDialog } from "@/components/settings-dialog";

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
      <body>
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
