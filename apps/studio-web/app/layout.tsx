import type { ReactNode } from "react";
import "./globals.css";

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
