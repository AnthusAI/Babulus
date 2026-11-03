import { cookies } from "next/headers";
import { fetchAuthSession } from "aws-amplify/auth/server";
import { runWithAmplifyServerContext } from "./amplify-server.js";
import { requireAccount, type AccountAuthOptions } from "./account-authorization.js";

/** The ID token from the Amplify session cookies of the current Next.js request. */
export const idTokenFromCookies = async (): Promise<string | null> => {
  try {
    const session = await runWithAmplifyServerContext({
      nextServerContext: { cookies },
      operation: (contextSpec) => fetchAuthSession(contextSpec),
    });
    return session.tokens?.idToken?.toString() ?? null;
  } catch {
    return null;
  }
};

/** Require the signed-in caller (identified by session cookies or a Bearer header) to belong to the Account. */
export const requireAccountForRequest = (
  request: { headers: { get(name: string): string | null } } | null,
  accountId: string,
  options: AccountAuthOptions = {},
) => requireAccount(request, accountId, { tokenFromCookies: idTokenFromCookies, ...options });
