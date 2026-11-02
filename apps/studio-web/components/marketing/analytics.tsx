import Script from "next/script";
import { ANALYTICS_ENABLED, GA_MEASUREMENT_ID } from "@/lib/analytics-config";
import { consentBootstrapScript } from "@/lib/consent";
import { ConsentBanner } from "@/components/marketing/consent-banner";
import { CtaClickTracker } from "@/components/marketing/cta-click-tracker";

/**
 * GA4 with Consent Mode v2 for the public pages. The inline bootstrap is server-rendered, so the
 * browser runs it while parsing, before hydration and before gtag.js loads: it sets the consent
 * defaults and any stored choice, then queues `gtag('config')`. gtag.js processes the queue in order.
 */
export function Analytics() {
  if (!ANALYTICS_ENABLED) return null;
  return (
    <>
      <script id="babulus-consent-defaults" dangerouslySetInnerHTML={{ __html: consentBootstrapScript() }} />
      <Script
        id="babulus-gtag"
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
      />
      <ConsentBanner />
      <CtaClickTracker />
    </>
  );
}
