import { ENGAGE_SOLUTION, ENGAGE_URL } from "./analytics-config";

/**
 * GA4 conversion events for the Babulus public site, ported from Anth.us-web
 * `web/assets/conversion-events.js`. No event carries personal data: no email, name, persona,
 * free text, query string or fragment.
 */

const MAXIMUM_LABEL_LENGTH = 100;
const SAFE_LOCATION_PATTERN = /^[a-z0-9_-]{1,40}$/;
const ENGAGE_HOST = new URL(ENGAGE_URL).hostname;
const ENGAGE_PATH_PATTERN = /^\/engage(\/|\/index\.html|\.html)?$/;

export const SIGN_UP_FORM_ID = "babulus-waitlist-v1";

export type CtaClickParameters = {
  cta_text: string;
  cta_location: string;
  link_url: string;
  transport_type: "beacon";
};

export type SignUpParameters = {
  method: "waitlist";
  form_id: typeof SIGN_UP_FORM_ID;
  lead_source: string;
};

/** The contact CTA destination: anth.us/engage with the solution and a short slug for where the CTA sits. */
export function contactUrl(location: string): string {
  if (!SAFE_LOCATION_PATTERN.test(location)) throw new Error(`invalid CTA location: ${location}`);
  return `${ENGAGE_URL}?solution=${encodeURIComponent(ENGAGE_SOLUTION)}&cta=${location}`;
}

/** Destination host and path, with no scheme, credentials, port, query string or fragment. */
export function linkUrlOf(href: string, base: string): string | null {
  try {
    const url = new URL(href, base);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.hostname + url.pathname;
  } catch {
    return null;
  }
}

/** The visible label, whitespace collapsed, a trailing arrow dropped, capped at 100 characters. */
export function visibleLabelOf(text: string): string {
  return text.replace(/\s+/g, " ").replace(/\s*→\s*$/, "").trim().slice(0, MAXIMUM_LABEL_LENGTH);
}

function isEngageUrl(url: URL): boolean {
  return url.hostname === ENGAGE_HOST && ENGAGE_PATH_PATTERN.test(url.pathname);
}

/**
 * The `cta_click` parameters for a clicked link, or null when the link is not a tracked CTA.
 * A link is tracked when it carries `data-cta-location`, or when it points at anth.us/engage (its
 * `cta` query value then names the location, as on anth.us).
 */
export function ctaClickParameters(
  anchor: { href: string; text: string; ctaLocation: string | null },
  base: string,
): CtaClickParameters | null {
  let url: URL;
  try {
    url = new URL(anchor.href, base);
  } catch {
    return null;
  }
  const linkUrl = linkUrlOf(url.href, base);
  if (!linkUrl) return null;
  let location = anchor.ctaLocation;
  if (location === null) {
    if (!isEngageUrl(url)) return null;
    location = url.searchParams.get("cta") ?? "";
  }
  return {
    cta_text: visibleLabelOf(anchor.text),
    cta_location: SAFE_LOCATION_PATTERN.test(location) ? location : "page",
    link_url: linkUrl,
    transport_type: "beacon",
  };
}

/** The `sign_up` parameters, only for an intake response that accepted the signup (HTTP 202). */
export function signUpParameters(status: number, leadSource: string): SignUpParameters | null {
  if (status !== 202) return null;
  return { method: "waitlist", form_id: SIGN_UP_FORM_ID, lead_source: leadSource };
}

type Gtag = (command: "event", name: string, parameters: Record<string, unknown>) => void;

/** Sends a GA4 event when gtag is loaded; analytics never breaks the page. */
export function sendEvent(name: string, parameters: Record<string, unknown>): void {
  const gtag = (globalThis as { gtag?: Gtag }).gtag;
  if (typeof gtag !== "function") return;
  try {
    gtag("event", name, parameters);
  } catch {
    // ignored
  }
}
