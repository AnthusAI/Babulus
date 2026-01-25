import type { ReactNode } from "react";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/marketing/site-header";
import { Footer } from "@/components/marketing/footer";

export const metadata: Metadata = {
  title: {
    default: "Babulus",
    template: "%s — Babulus",
  },
  description:
    "Studio-grade automation for video marketing: research, production, rendering, and publishing—powered by AI, portable by design.",
  openGraph: {
    title: "Babulus",
    description:
      "Studio-grade automation for video marketing: research, production, rendering, and publishing—powered by AI, portable by design.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Babulus",
    description:
      "Studio-grade automation for video marketing: research, production, rendering, and publishing—powered by AI, portable by design.",
  },
};

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
