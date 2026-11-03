import { isAccountId } from "@babulus/shared";

/** One Account the signed-in person may use Studio in, as the sign-in service's session route reports it. */
export type AccountSummary = {
  id: string;
  name: string;
  /** The Studio role, already capped by the Prospectus role (member is editor). A viewer is never listed. */
  role: "owner" | "admin" | "editor";
};

/** The shape of `GET /api/auth/prospectus/session` (see lib/prospectus/sign-in-routes.ts). */
export type AccountSession = {
  signedIn: boolean;
  noAccess?: boolean;
  accounts?: Array<{ accountId: string; accountName: string; role: AccountSummary["role"] }>;
  selectedAccountId?: string | null;
};

export const ACCOUNT_SESSION_PATH = "/api/auth/prospectus/session";

/** Keep only well formed Accounts. The route already leaves out Accounts without Studio access. */
export const studioAccountsFrom = (session: AccountSession | null | undefined): AccountSummary[] =>
  (session?.accounts ?? [])
    .filter((account) => isAccountId(account.accountId) && typeof account.accountName === "string")
    .map((account) => ({ id: account.accountId, name: account.accountName, role: account.role }));

export async function fetchAccountSession(fetcher: typeof fetch = fetch): Promise<AccountSession> {
  const response = await fetcher(ACCOUNT_SESSION_PATH, { credentials: "same-origin", cache: "no-store" });
  if (!response.ok) {
    throw new Error("Your Accounts could not be loaded.");
  }
  return (await response.json()) as AccountSession;
}

export async function fetchAccounts(fetcher: typeof fetch = fetch): Promise<AccountSummary[]> {
  return studioAccountsFrom(await fetchAccountSession(fetcher));
}
