import { assertKeyInAccount, isAccountId } from "@babulus/shared";
import { AccountAccessError, accountAccessResponse, requireAccount, type AccountAuthOptions } from "./account-authorization.js";

export type AccountMediaDeps = AccountAuthOptions & {
  presign: (accountId: string, key: string) => Promise<string>;
};

/**
 * `GET /api/account-media?accountId=<id>&key=<stored key>`: a short-lived download URL for one object of an
 * Account the caller belongs to. The Account is checked against the verified ID token's groups, the key must
 * sit under that Account's own prefix, and traversal is refused, so no other path reaches another Account's media.
 */
export const handleAccountMediaGet = async (
  request: { url: string; headers: { get(name: string): string | null } },
  deps: AccountMediaDeps,
): Promise<Response> => {
  const params = new URL(request.url).searchParams;
  const accountId = params.get("accountId") ?? "";
  const key = params.get("key") ?? "";
  if (!isAccountId(accountId) || key.length === 0) {
    return Response.json({ error: "invalid_request", message: "accountId and key are required." }, { status: 400 });
  }
  try {
    await requireAccount(request, accountId, deps);
    try {
      assertKeyInAccount(key, accountId);
    } catch {
      throw new AccountAccessError(403, "That file is not in this Account.");
    }
    return Response.json({ url: await deps.presign(accountId, key) }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    const refusal = accountAccessResponse(error);
    if (refusal) {
      return refusal;
    }
    return Response.json({ error: "unavailable", message: "The file could not be prepared." }, { status: 503 });
  }
};
