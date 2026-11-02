import {
  CONSENT_DENIED_BY_DEFAULT_REGIONS,
  CONSENT_POLICY_VERSION,
  CONSENT_RETENTION_DAYS,
  CONSENT_STORAGE_KEY,
  CONSENT_WAIT_FOR_UPDATE_MS,
  GA_MEASUREMENT_ID,
} from "./analytics-config";

const MILLISECONDS_PER_DAY = 86_400_000;

export type ConsentSignals = {
  ad_storage: "granted" | "denied";
  ad_user_data: "granted" | "denied";
  ad_personalization: "granted" | "denied";
  analytics_storage: "granted" | "denied";
};

/** What `window.babulusConsent` exposes once the bootstrap script has run. */
export type BabulusConsent = {
  key: string;
  version: number;
  retentionMilliseconds: number;
  read: () => { version: number; savedAt: number; granted: boolean } | null;
  apply: (granted: boolean) => void;
  save: (granted: boolean) => void;
};

/**
 * The two Consent Mode v2 `default` commands, in the order gtag must receive them: the region-scoped
 * all-denied default first, then the global default (analytics granted, ads denied).
 */
export function consentDefaults(
  regions: readonly string[] = CONSENT_DENIED_BY_DEFAULT_REGIONS,
  waitForUpdate: number = CONSENT_WAIT_FOR_UPDATE_MS,
): Array<ConsentSignals & { wait_for_update: number; region?: string[] }> {
  const defaults: Array<ConsentSignals & { wait_for_update: number; region?: string[] }> = [];
  if (regions.length > 0) {
    defaults.push({
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
      analytics_storage: "denied",
      wait_for_update: waitForUpdate,
      region: [...regions],
    });
  }
  defaults.push({
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    analytics_storage: "granted",
    wait_for_update: waitForUpdate,
  });
  return defaults;
}

/** Accept all grants all four signals; Reject all denies all four. */
export function consentUpdate(granted: boolean): ConsentSignals {
  const value = granted ? "granted" : "denied";
  return { ad_storage: value, ad_user_data: value, ad_personalization: value, analytics_storage: value };
}

function javascriptLiteral(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026");
}

/**
 * The inline script that must run before gtag.js does anything: it defines `gtag`, sets the consent
 * defaults, re-applies a stored choice, and only then calls `config`. A port of Papyrus's
 * `render_consent_defaults_script` (markus_renderer/consent.py), with `window.babulusConsent` in place
 * of `window.papyrusConsent`.
 */
export function consentBootstrapScript(measurementId: string = GA_MEASUREMENT_ID): string {
  const defaults = consentDefaults()
    .map((settings) => `gtag('consent','default',${javascriptLiteral(settings)});\n`)
    .join("");
  return (
    "window.dataLayer=window.dataLayer||[];\n" +
    "function gtag(){window.dataLayer.push(arguments);}\n" +
    "window.gtag=gtag;\n" +
    defaults +
    "gtag('set','ads_data_redaction',true);\n" +
    "gtag('set','url_passthrough',false);\n" +
    "(function(){var c=window.babulusConsent={" +
    `key:${javascriptLiteral(CONSENT_STORAGE_KEY)},` +
    `version:${CONSENT_POLICY_VERSION},` +
    `retentionMilliseconds:${CONSENT_RETENTION_DAYS * MILLISECONDS_PER_DAY}};\n` +
    "c.read=function(){try{var s=JSON.parse(localStorage.getItem(c.key));" +
    "if(s&&s.version===c.version&&typeof s.savedAt==='number'&&typeof s.granted==='boolean'" +
    "&&s.savedAt<=Date.now()&&Date.now()-s.savedAt<c.retentionMilliseconds)return s}" +
    "catch(e){}return null};\n" +
    "c.apply=function(granted){var v=granted?'granted':'denied';" +
    "gtag('consent','update',{ad_storage:v,ad_user_data:v,ad_personalization:v,analytics_storage:v})};\n" +
    "c.save=function(granted){try{localStorage.setItem(c.key,JSON.stringify(" +
    "{version:c.version,savedAt:Date.now(),granted:granted}))}catch(e){}};\n" +
    "var stored=c.read();if(stored)c.apply(stored.granted)})();\n" +
    "gtag('js',new Date());\n" +
    `gtag('config',${javascriptLiteral(measurementId)});\n`
  );
}
