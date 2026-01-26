import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms",
  description: "Preview terms for Babulus waitlist access and updates.",
  openGraph: {
    title: "Terms",
    description: "Preview terms for Babulus waitlist access and updates.",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Terms",
    description: "Preview terms for Babulus waitlist access and updates.",
  },
};

export default function TermsPage() {
  return (
    <div className="container py-10 md:py-16">
      <div className="mx-auto max-w-3xl space-y-4">
        <h1 className="font-heading text-4xl md:text-5xl">Terms</h1>
        <p className="text-muted-foreground">
          This site is a preview of Babulus. Features described may change. By joining the waitlist, you agree
          that we may contact you about early access and product updates (if you opted in).
        </p>
      </div>
    </div>
  );
}
