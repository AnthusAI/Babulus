import type { ReactNode } from "react";
import "./globals.css";
import { configureAmplify } from "../lib/amplify-config.js";
import { Authenticator } from "../components/authenticator.js";
import { ThemeProvider } from "@/components/theme-provider";

// Configure Amplify once at app startup
configureAmplify();

export const metadata = {
  title: "Babulus Studio",
  description: "Core rendering preview",
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
          <Authenticator>{children}</Authenticator>
        </ThemeProvider>
      </body>
    </html>
  );
}
