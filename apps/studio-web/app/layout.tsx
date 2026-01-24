import type { ReactNode } from "react";
import "./globals.css";
import { configureAmplify } from "../lib/amplify-config.js";

// Configure Amplify once at app startup
configureAmplify();

export const metadata = {
  title: "Babulus Studio",
  description: "Frame-driven preview prototype",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
