"use client";

import { useEffect } from "react";
import { ctaClickParameters, sendEvent } from "@/lib/analytics";

/**
 * Reports GA4 `cta_click` for links marked with `data-cta-location` and for anth.us/engage links,
 * like Anth.us-web `web/assets/conversion-events.js`: one delegated listener, click and auxclick.
 */
export function CtaClickTracker() {
  useEffect(() => {
    const report = (event: MouseEvent) => {
      const target = event.target as Element | null;
      const anchor = target?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!anchor) return;
      const parameters = ctaClickParameters(
        {
          href: anchor.href,
          text: anchor.textContent ?? "",
          ctaLocation: anchor.getAttribute("data-cta-location"),
        },
        window.location.href,
      );
      if (parameters) sendEvent("cta_click", parameters);
    };
    document.addEventListener("click", report);
    document.addEventListener("auxclick", report);
    return () => {
      document.removeEventListener("click", report);
      document.removeEventListener("auxclick", report);
    };
  }, []);
  return null;
}
