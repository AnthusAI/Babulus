import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy",
  description: "How Babulus handles waitlist information and updates.",
  openGraph: {
    title: "Privacy",
    description: "How Babulus handles waitlist information and updates.",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Privacy",
    description: "How Babulus handles waitlist information and updates.",
  },
};

export default function PrivacyPage() {
  return (
    <div className="container py-10 md:py-16">
      <div className="mx-auto max-w-3xl space-y-4">
        <h1 className="font-heading text-4xl md:text-5xl">Privacy</h1>
        <p className="text-muted-foreground">
          If you join the Babulus waitlist, we store the information you submit (like your email, optional name,
          and whether you opted into updates) so we can contact you about early access and product progress.
        </p>
        <p className="text-muted-foreground">
          We don’t sell your information. You can unsubscribe from updates at any time.
        </p>
      </div>
    </div>
  );
}
