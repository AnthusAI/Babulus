import type { Metadata } from "next";
import { COOKIE_SETTINGS_HASH, GA_MEASUREMENT_ID } from "@/lib/analytics-config";

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

        <h2 className="pt-6 font-heading text-3xl">Analytics and cookies</h2>
        <p className="text-muted-foreground">
          This site uses Google Analytics 4 (measurement ID {GA_MEASUREMENT_ID}) to understand how it is used: which
          pages are visited, how visitors arrive, roughly what kind of device and browser they use, and which main
          buttons and links are clicked, such as “Join waitlist”. When someone joins the waitlist we record that a
          signup happened and which page it came from. Google Analytics uses cookies or similar identifiers in your
          browser.
        </p>
        <p className="text-muted-foreground">
          We don’t send personal data to Google Analytics: never your email address, your name, the role you select,
          or anything else you type into a form.
        </p>
        <p className="text-muted-foreground">
          If you are in the European Economic Area, the United Kingdom or Switzerland, analytics and advertising
          cookies are off until you choose. Elsewhere, analytics is on by default and advertising stays off until you
          accept it. The “Cookies and analytics” banner lets you choose “Accept all” or “Reject all”, and you can
          change your choice at any time with the{" "}
          <a href={COOKIE_SETTINGS_HASH} className="underline underline-offset-2">
            Cookie settings
          </a>{" "}
          link in the footer of every page. We do not currently run advertising on this site.
        </p>
        <p className="text-muted-foreground">
          Your choice is stored in your browser’s local storage for about six months, after which we ask again. You
          can also block or delete cookies and local storage in your browser settings.
        </p>
      </div>
    </div>
  );
}
