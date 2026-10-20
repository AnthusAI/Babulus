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
          Waitlist signups are processed by Anthus’s Prospectus CRM, which records your submission as a contact
          along with the role you select and the page you signed up from.
        </p>
        <p className="text-muted-foreground">
          We don’t sell your information. You can unsubscribe from updates at any time.
        </p>
        <p className="text-muted-foreground">
          We keep your signup until you ask us to delete it. To unsubscribe or request deletion, email{" "}
          <a href="mailto:info@anth.us" className="underline underline-offset-2">
            info@anth.us
          </a>
          .
        </p>
      </div>
    </div>
  );
}
