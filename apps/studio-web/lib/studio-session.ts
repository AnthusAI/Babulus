/**
 * Browser-side helpers for the Studio's server session (`/api/auth/prospectus/*`). The browser never sees tokens or
 * Prospectus ids beyond the Account list the server chooses to return.
 */
export interface StudioSessionAccount {
  accountId: string;
  accountName: string;
  role: string;
}

export interface StudioSession {
  signedIn: boolean;
  noAccess?: boolean;
  accounts?: StudioSessionAccount[];
  selectedAccountId?: string | null;
}

const BASE = "/api/auth/prospectus";

export async function fetchStudioSession(fetcher: typeof fetch = fetch): Promise<StudioSession> {
  const response = await fetcher(`${BASE}/session`, { credentials: "same-origin", cache: "no-store" });
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? "session_unavailable");
  }
  return (await response.json()) as StudioSession;
}

export async function chooseStudioAccount(accountId: string, fetcher: typeof fetch = fetch): Promise<void> {
  const response = await fetcher(`${BASE}/selection`, {
    method: "POST",
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ accountId }),
  });
  if (!response.ok) throw new Error("selection_failed");
}

/** Asks the server to re-sync Account groups; the caller then refreshes its Cognito tokens to pick them up. */
export async function syncStudioAccountGroups(fetcher: typeof fetch = fetch): Promise<void> {
  const response = await fetcher(`${BASE}/sync`, { method: "POST", credentials: "same-origin" });
  if (!response.ok) throw new Error("sync_failed");
}

export function startStudioSignIn(returnTo: string): void {
  window.location.assign(`${BASE}/sign-in?returnTo=${encodeURIComponent(returnTo)}`);
}

export async function endStudioSession(fetcher: typeof fetch = fetch): Promise<void> {
  await fetcher(`${BASE}/sign-out`, { method: "POST", credentials: "same-origin", redirect: "manual" }).catch(() => undefined);
}
