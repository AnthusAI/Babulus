/**
 * Google Analytics 4 and Consent Mode v2 settings for the Babulus public site.
 *
 * Copied from the anth.us implementation so every Anthus site behaves the same:
 * Papyrus `src/papyrus_content/markus_renderer/consent.py` (ConsentModeSettings defaults and
 * CONSENT_DENIED_BY_DEFAULT_REGIONS) and Anth.us-web `web/projection.json` (`ga_measurement_id`,
 * `consent_mode` banner wording).
 */

/** The one GA4 property shared by the Anthus sites. */
export const GA_MEASUREMENT_ID = "G-31SC26SDGX";

/**
 * Regions where all four consent signals start denied: the EEA (EU 27 plus IS, LI, NO), GB and CH.
 * Everywhere else starts with analytics_storage granted and every ad_* signal denied.
 * Region detection is gtag's own (the `region` parameter), never client-side guessing.
 */
export const CONSENT_DENIED_BY_DEFAULT_REGIONS: readonly string[] = [
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR",
  "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK",
  "SI", "ES", "SE", "IS", "LI", "NO", "GB", "CH",
];

export const CONSENT_WAIT_FOR_UPDATE_MS = 500;

/** Raise to ask every visitor again (a stored choice with another version is ignored). */
export const CONSENT_POLICY_VERSION = 1;

/** A stored choice is honoured for about six months, then the banner asks again. */
export const CONSENT_RETENTION_DAYS = 183;

/** localStorage key for the visitor's choice (`<sitename>-consent`, as Papyrus derives it). */
export const CONSENT_STORAGE_KEY = "babulus-consent";

/** Any link to this hash reopens the consent banner (the footer "Cookie settings" link). */
export const COOKIE_SETTINGS_HASH = "#cookie-settings";

export const CONSENT_BANNER_HEADING = "Cookies and analytics";
export const CONSENT_BANNER_MESSAGE =
  "We use cookies to measure how this site is used and, if you agree, for advertising. " +
  "You can accept all, reject all, and change your choice at any time.";

/** Where every "work with us" contact CTA points; `contactUrl` adds the solution and CTA location. */
export const ENGAGE_URL = "https://anth.us/engage/";
export const ENGAGE_SOLUTION = "Babulus";

/** GA only loads in production builds, so local development never pollutes the property. */
export const ANALYTICS_ENABLED = process.env.NODE_ENV === "production";
