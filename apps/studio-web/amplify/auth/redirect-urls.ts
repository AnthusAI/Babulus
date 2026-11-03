/**
 * Sign-in return URLs for the Studio's Cognito web client.
 *
 * The public hosts come from the deployment (`BABULUS_OAUTH_REDIRECT_URLS`, comma separated) so the repository names no
 * Amplify app id. Without it the defaults below apply: the public site and local development.
 */
export const DEFAULT_AUTH_REDIRECT_URLS = ["https://babul.us/", "http://localhost:3000/", "http://localhost:3001/"];

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

/** Whether a return URL may be registered: https anywhere, http only on a loopback host, no query or fragment. */
export function isRegistrableRedirectUrl(value: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return false;
  }
  if (parsed.search !== "" || parsed.hash !== "" || parsed.username !== "" || parsed.password !== "") return false;
  if (parsed.protocol === "https:") return true;
  return parsed.protocol === "http:" && LOOPBACK_HOSTS.has(parsed.hostname);
}

export function resolveAuthRedirectUrls(environment: Record<string, string | undefined> = process.env): string[] {
  const raw = (environment.BABULUS_OAUTH_REDIRECT_URLS ?? "").trim();
  const urls = raw === "" ? DEFAULT_AUTH_REDIRECT_URLS : raw.split(",").map((url) => url.trim()).filter((url) => url.length > 0);
  const refused = urls.filter((url) => !isRegistrableRedirectUrl(url));
  if (refused.length > 0) {
    throw new Error(`Refusing sign-in return URLs that are not https or loopback http without a query: ${refused.join(", ")}`);
  }
  return [...new Set(urls)];
}

/** The origin of every return URL, once each. */
export function redirectOrigins(redirectUrls: readonly string[]): string[] {
  return [...new Set(redirectUrls.map((url) => new URL(url).origin))];
}
