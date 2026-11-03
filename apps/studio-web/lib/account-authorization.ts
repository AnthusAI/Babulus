import { CognitoJwtVerifier } from "aws-jwt-verify";
import { accountIdsFromGroups, isAccountId } from "@babulus/shared";

/**
 * Server-side Account authorization. The only trusted input is an ID token whose signature, issuer,
 * audience, expiry and token use have been verified; the Accounts a person may use are the Account IDs in
 * its `cognito:groups` claim, which the sign-in service sets. An Account ID that arrives from the client
 * (a form field, a URL, a stored row) is only ever compared against that list.
 */

export type VerifiedIdentity = {
  /** The Cognito subject. */
  sub: string;
  /** Account IDs from the verified groups claim. */
  accountIds: string[];
};

export type TokenClaims = { sub?: unknown; "cognito:groups"?: unknown };

/** Verifies a token's signature and claims and returns them, or throws. Injectable so specs need no network. */
export type IdTokenVerifier = (token: string) => Promise<TokenClaims>;

export class AccountAccessError extends Error {
  readonly status: 401 | 403;
  constructor(status: 401 | 403, message: string) {
    super(message);
    this.name = "AccountAccessError";
    this.status = status;
  }
}

export type AccountAuthOptions = {
  verifier?: IdTokenVerifier;
  /** Where to find the ID token when the request carries no Authorization header (the Amplify session cookies). */
  tokenFromCookies?: () => Promise<string | null | undefined>;
};

type HeaderSource = { headers: { get(name: string): string | null } };

let cachedVerifier: IdTokenVerifier | null = null;

export const cognitoIdTokenVerifier = (userPoolId: string, clientId: string): IdTokenVerifier => {
  const verifier = CognitoJwtVerifier.create({ userPoolId, clientId, tokenUse: "id" });
  return async (token) => (await verifier.verify(token)) as TokenClaims;
};

/** The verifier for this deployment, built from the generated outputs file. */
export const defaultIdTokenVerifier = (): IdTokenVerifier => {
  if (!cachedVerifier) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const outputs = require("../amplify_outputs.json");
    const userPoolId = outputs?.auth?.user_pool_id;
    const clientId = outputs?.auth?.user_pool_client_id;
    if (!userPoolId || !clientId) {
      throw new AccountAccessError(401, "Sign-in is not configured.");
    }
    cachedVerifier = cognitoIdTokenVerifier(userPoolId, clientId);
  }
  return cachedVerifier;
};

const bearerToken = (request: HeaderSource | null | undefined): string | null => {
  const header = request?.headers.get("authorization") ?? "";
  const match = /^Bearer ([A-Za-z0-9._-]{1,8192})$/.exec(header);
  return match ? match[1] : null;
};

/** Verify a token and read the Accounts it names. An unsigned, forged, expired or wrong-audience token is a 401. */
export const identityFromToken = async (
  token: string | null | undefined,
  verifier: IdTokenVerifier = defaultIdTokenVerifier(),
): Promise<VerifiedIdentity> => {
  if (!token) {
    throw new AccountAccessError(401, "Sign in to continue.");
  }
  let claims: TokenClaims;
  try {
    claims = await verifier(token);
  } catch {
    throw new AccountAccessError(401, "Your sign-in could not be verified. Sign in again.");
  }
  if (typeof claims.sub !== "string" || claims.sub.length === 0) {
    throw new AccountAccessError(401, "Your sign-in could not be verified. Sign in again.");
  }
  return { sub: claims.sub, accountIds: accountIdsFromGroups(claims["cognito:groups"]) };
};

export const identityFromRequest = async (
  request: HeaderSource | null | undefined,
  options: AccountAuthOptions = {},
): Promise<VerifiedIdentity> => {
  const token = bearerToken(request) ?? (await options.tokenFromCookies?.()) ?? null;
  return identityFromToken(token, options.verifier ?? defaultIdTokenVerifier());
};

/**
 * Require that the verified caller belongs to `accountId` (a 403 otherwise). A caller with no Account, such
 * as a person without the `babulus` entitlement, belongs to none and is refused for every Account.
 */
export const requireAccount = async (
  request: HeaderSource | null | undefined,
  accountId: string,
  options: AccountAuthOptions = {},
): Promise<VerifiedIdentity & { accountId: string }> => {
  const identity = await identityFromRequest(request, options);
  if (!isAccountId(accountId) || !identity.accountIds.includes(accountId)) {
    throw new AccountAccessError(403, "You do not have access to this Account.");
  }
  return { ...identity, accountId };
};

/** The JSON answer for a refused request. */
export const accountAccessResponse = (error: unknown): Response | null => {
  if (error instanceof AccountAccessError) {
    return Response.json({ error: error.status === 401 ? "unauthenticated" : "forbidden", message: error.message }, { status: error.status });
  }
  return null;
};
