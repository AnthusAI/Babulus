import type { ReactNode } from "react";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/marketing/site-header";
import { Footer } from "@/components/marketing/footer";

export const metadata: Metadata = {
  title: {
    default: "Babulus: AI Video CMS",
    template: "%s — Babulus",
  },
  description:
    "Your AI Video CMS for automated research, scripting, rendering, and publishing.",
  openGraph: {
    title: "Babulus: AI Video CMS",
    description:
      "Your AI Video CMS for automated research, scripting, rendering, and publishing.",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Babulus: AI Video CMS",
    description:
      "Your AI Video CMS for automated research, scripting, rendering, and publishing.",
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
