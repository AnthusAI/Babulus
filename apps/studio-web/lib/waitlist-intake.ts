const CAMPAIGN_KEYS = ["utm_source", "utm_medium", "utm_campaign"] as const;
const CAMPAIGN_VALUE_MAX = 120;
const CAMPAIGN_VALUE_PATTERN = /^[\w .-]*$/;
const PAGE_PATH_MAX = 200;
const PAGE_PATH_PATTERN = /^\/[a-z0-9/_-]*$/i;
const SOURCE_PATTERN = /^[a-z0-9][a-z0-9-]{0,39}$/;

export function sanitizeCampaign(params: URLSearchParams): Record<string, string> | undefined {
  const campaign: Record<string, string> = {};
  for (const key of CAMPAIGN_KEYS) {
    const value = params.get(key)?.trim();
    if (value && value.length <= CAMPAIGN_VALUE_MAX && CAMPAIGN_VALUE_PATTERN.test(value)) {
      campaign[key] = value;
    }
  }
  return Object.keys(campaign).length > 0 ? campaign : undefined;
}

export function sanitizePagePath(pathname: string): string | undefined {
  return pathname.length <= PAGE_PATH_MAX && PAGE_PATH_PATTERN.test(pathname) ? pathname : undefined;
}

export function sanitizeSource(source: string, fallback: string): string {
  return SOURCE_PATTERN.test(source) ? source : fallback;
}
