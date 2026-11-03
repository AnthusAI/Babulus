import { CfnOutput, type Stack } from "aws-cdk-lib";
import { CfnUserPoolClient, CfnUserPoolIdentityProvider, type IUserPool } from "aws-cdk-lib/aws-cognito";
import { redirectOrigins } from "./redirect-urls.js";

/**
 * The Google-only app client Babulus registers with Prospectus (Prospectus docs/accounts/GOOGLE_IDENTITY.md, policy
 * google-only-unlinked-v1). It sits on the Studio's user pool beside the web client but admits only the built-in Google
 * provider through the authorization code flow from the Studio server, with no secret and every native, SRP, custom,
 * password and client-credentials path left off. The server keeps no refresh token, so a session lasts one access token.
 */
export const PROSPECTUS_SIGN_IN_CALLBACK_PATH = "/api/auth/prospectus/callback";
export const PROSPECTUS_SIGN_IN_TOKEN_VALIDITY_MINUTES = 60;

/** One callback per site origin; local development origins included so the sign-in can be tried on a laptop. */
export function prospectusSignInCallbackUrls(redirectUrls: readonly string[]): string[] {
  return redirectOrigins(redirectUrls).map((origin) => `${origin}${PROSPECTUS_SIGN_IN_CALLBACK_PATH}`);
}

export function prospectusSignInLogoutUrls(redirectUrls: readonly string[]): string[] {
  return redirectOrigins(redirectUrls).map((origin) => `${origin}/`);
}

export function addProspectusGoogleOnlyClient(authStack: Stack, userPool: IUserPool, redirectUrls: readonly string[]): CfnUserPoolClient {
  const callbackUrls = prospectusSignInCallbackUrls(redirectUrls);
  if (callbackUrls.length === 0) throw new Error("The Prospectus Google-only client needs at least one site origin.");
  const client = new CfnUserPoolClient(authStack, "ProspectusGoogleOnlyClient", {
    userPoolId: userPool.userPoolId,
    clientName: "prospectus-google-only",
    generateSecret: false,
    supportedIdentityProviders: ["Google"],
    allowedOAuthFlowsUserPoolClient: true,
    allowedOAuthFlows: ["code"],
    allowedOAuthScopes: ["openid", "email", "profile"],
    callbackUrLs: callbackUrls,
    logoutUrLs: prospectusSignInLogoutUrls(redirectUrls),
    explicitAuthFlows: ["ALLOW_REFRESH_TOKEN_AUTH"],
    enableTokenRevocation: true,
    preventUserExistenceErrors: "ENABLED",
    accessTokenValidity: PROSPECTUS_SIGN_IN_TOKEN_VALIDITY_MINUTES,
    idTokenValidity: PROSPECTUS_SIGN_IN_TOKEN_VALIDITY_MINUTES,
    refreshTokenValidity: PROSPECTUS_SIGN_IN_TOKEN_VALIDITY_MINUTES,
    tokenValidityUnits: { accessToken: "minutes", idToken: "minutes", refreshToken: "minutes" },
  });
  const googleProviders = authStack.node
    .findAll()
    .filter((construct): construct is CfnUserPoolIdentityProvider => construct instanceof CfnUserPoolIdentityProvider && construct.providerName === "Google");
  for (const provider of googleProviders) client.addDependency(provider);

  new CfnOutput(authStack, "ProspectusGoogleOnlyClientId", {
    value: client.ref,
    description: "client id for Babulus's Prospectus registration (PROSPECTUS_BABULUS_CLIENT_ID)",
  });
  new CfnOutput(authStack, "ProspectusGoogleOnlyIssuer", {
    value: `https://cognito-idp.${authStack.region}.amazonaws.com/${userPool.userPoolId}`,
    description: "issuer for Babulus's Prospectus registration (PROSPECTUS_BABULUS_ISSUER)",
  });
  return client;
}
