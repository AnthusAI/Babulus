import { babulusRoleForAccountRole, type AccountRole, isAccountId } from "@babulus/shared";

/** One Account the signed-in person belongs to, as the sign-in service reports it. */
export type AccountSummary = {
  id: string;
  name: string;
  role: AccountRole;
};

export type AccountSession = {
  person?: { id: string } | null;
  accounts: AccountSummary[];
  selectedAccountId?: string | null;
};

/** The sign-in service's session route (the Prospectus session, kept server side). */
export const ACCOUNT_SESSION_PATH = "/api/auth/prospectus/session";

/**
 * Keep only the Accounts that are well formed and in which the person's role grants Studio access. A viewer has
 * no Studio access, so a viewer-only Account is left out (the groups in the ID token omit it too).
 */
export const studioAccountsFrom = (session: AccountSession | null | undefined): AccountSummary[] =>
  (session?.accounts ?? []).filter(
    (account) => isAccountId(account.id) && typeof account.name === "string" && babulusRoleForAccountRole(account.role) !== null,
  );

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
