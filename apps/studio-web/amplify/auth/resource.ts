import { defineAuth, secret } from "@aws-amplify/backend";
import type { Stack } from "aws-cdk-lib";
import { CfnUserPool, CfnUserPoolClient, CfnUserPoolIdentityProvider } from "aws-cdk-lib/aws-cognito";
import { resolveAuthRedirectUrls } from "./redirect-urls.js";

/**
 * Sign-in is Google only, through Cognito.
 *
 * `loginWith.email` stays true on purpose: dropping it changes the pool's username attributes, and CloudFormation
 * replaces a user pool when those change. The password path is closed by `restrictToGoogleSignIn` instead, which only
 * edits properties that update in place. The Google client id and secret are Amplify secrets (`GOOGLE_CLIENT_ID`,
 * `GOOGLE_CLIENT_SECRET`), set per branch and for the sandbox.
 */
export function defineStudioAuth(redirectUrls: readonly string[] = resolveAuthRedirectUrls()) {
  return defineAuth({
    loginWith: {
      email: true,
      externalProviders: {
        google: {
          clientId: secret("GOOGLE_CLIENT_ID"),
          clientSecret: secret("GOOGLE_CLIENT_SECRET"),
          scopes: ["email", "profile", "openid"],
        },
        scopes: ["EMAIL", "PROFILE", "OPENID"],
        callbackUrls: [...redirectUrls],
        logoutUrls: [...redirectUrls],
      },
    },
  });
}

export const auth = defineStudioAuth();

/** Keep Cognito's email verification state in sync with Google's verified claim. */
export function applyGoogleEmailVerifiedMapping(authStack: Stack): void {
  const providers = authStack.node
    .findAll()
    .filter((construct): construct is CfnUserPoolIdentityProvider => construct instanceof CfnUserPoolIdentityProvider && construct.providerName === "Google");
  if (providers.length !== 1) {
    throw new Error(`Expected exactly one Google identity provider to map email_verified, found ${providers.length}`);
  }
  const [provider] = providers;
  const mapping = provider.attributeMapping;
  if (mapping !== undefined && (typeof mapping !== "object" || Array.isArray(mapping))) {
    throw new Error("Expected Google identity provider attribute mappings to be a plain object");
  }
  provider.attributeMapping = { ...(mapping ?? {}), email_verified: "email_verified" };
}

/**
 * Closes every way in except Google: nobody can self sign up, the web client offers no password, SRP or custom flow,
 * and its only identity provider is Google. All three are in-place updates of the pool and its client.
 */
export function restrictToGoogleSignIn(userPool: CfnUserPool, webClient: CfnUserPoolClient): void {
  userPool.adminCreateUserConfig = { allowAdminCreateUserOnly: true };
  webClient.explicitAuthFlows = ["ALLOW_REFRESH_TOKEN_AUTH"];
  webClient.supportedIdentityProviders = ["Google"];
}

/**
 * Makes a user pool client wait for the Google identity provider. A client names its providers as plain strings
 * (`SupportedIdentityProviders: ["Google"]`), which gives CloudFormation no ordering, so when the provider is created in
 * the same update the client update fails with "The provider Google does not exist for User Pool". The explicit
 * dependency is the only thing that orders them.
 */
export function dependOnGoogleProvider(authStack: Stack, client: CfnUserPoolClient): void {
  const providers = authStack.node
    .findAll()
    .filter((construct): construct is CfnUserPoolIdentityProvider => construct instanceof CfnUserPoolIdentityProvider && construct.providerName === "Google");
  if (providers.length !== 1) {
    throw new Error(`Expected exactly one Google identity provider for a client to depend on, found ${providers.length}`);
  }
  client.addDependency(providers[0]);
}
