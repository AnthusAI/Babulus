import AnthusFooter, { defaultCommunityLinks } from "anthus-footer";
import { contactUrl } from "@/lib/analytics";
import { COOKIE_SETTINGS_HASH } from "@/lib/analytics-config";

// The shared footer's "Contact us" goes to anth.us/engage like every Anthus contact CTA.
const communityLinks = defaultCommunityLinks.map((link) =>
  link.label === "Contact us" ? { ...link, href: contactUrl("footer") } : link,
);

export function Footer() {
  return (
    <AnthusFooter
      siteId="babulus"
      communityLinks={communityLinks}
      description="Babulus is an AI-agent-driven marketing automation system for turning VideoML workflows into repeatable video production pipelines."
      additionalColumns={[
        {
          title: "Product",
          links: [
            { label: "Join waitlist", href: "/waitlist", external: false },
            { label: "Docs", href: "/docs", external: false },
            { label: "GitHub", href: "https://github.com/AnthusAI/Babulus" },
          ],
        },
        {
          title: "Legal",
          links: [
            { label: "Privacy", href: "/privacy", external: false },
            { label: "Terms", href: "/terms", external: false },
            // Opens the consent banner (components/marketing/consent-banner.tsx listens for this hash).
            { label: "Cookie settings", href: COOKIE_SETTINGS_HASH, external: false },
          ],
        },
      ]}
    />
  );
}
