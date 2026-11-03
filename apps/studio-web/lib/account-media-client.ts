/**
 * Ask the Studio server for a short-lived signed URL for a stored object. The server checks the caller's Account
 * membership; the browser has no direct access to Account media.
 */
export async function fetchAccountMediaUrl(accountId: string, key: string): Promise<string> {
  const query = new URLSearchParams({ accountId, key });
  const response = await fetch(`/api/account-media?${query.toString()}`, { credentials: "same-origin", cache: "no-store" });
  if (!response.ok) {
    throw new Error(response.status === 403 ? "You do not have access to this file." : "The file could not be opened.");
  }
  const body = (await response.json()) as { url?: string };
  if (!body.url) {
    throw new Error("The file could not be opened.");
  }
  return body.url;
}
