/**
 * Synthesizes the Studio's auth stack (no AWS calls, no deploy) and prints the Cognito resources as JSON.
 * The BDD steps run it in a child process because the Amplify backend reads its context once per process.
 */
import { defineBackend } from "@aws-amplify/backend";
import { Template } from "aws-cdk-lib/assertions";
import { auth, applyGoogleEmailVerifiedMapping, dependOnGoogleProvider, restrictToGoogleSignIn } from "../amplify/auth/resource.js";
import { applyCognitoDomainPrefix, resolveCognitoDomainPrefix } from "../amplify/auth/cognito-domain.js";
import { addProspectusGoogleOnlyClient } from "../amplify/auth/prospectus-google-client.js";
import { resolveAuthRedirectUrls } from "../amplify/auth/redirect-urls.js";

process.env.CDK_CONTEXT_JSON = JSON.stringify({
  "amplify-backend-name": "synth",
  "amplify-backend-namespace": "check",
  "amplify-backend-type": "branch",
});
const backend = defineBackend({ auth });
restrictToGoogleSignIn(backend.auth.resources.cfnResources.cfnUserPool, backend.auth.resources.cfnResources.cfnUserPoolClient);
applyGoogleEmailVerifiedMapping(backend.auth.stack);
dependOnGoogleProvider(backend.auth.stack, backend.auth.resources.cfnResources.cfnUserPoolClient);
applyCognitoDomainPrefix(backend.auth.stack, resolveCognitoDomainPrefix());
addProspectusGoogleOnlyClient(backend.auth.stack, backend.auth.resources.userPool, resolveAuthRedirectUrls());
const resources = Template.fromStack(backend.auth.stack).toJSON().Resources as Record<string, { Type: string }>;
const relevant = Object.fromEntries(
  Object.entries(resources).filter(([, resource]) => resource.Type.startsWith("AWS::Cognito::") || resource.Type === "Custom::AmplifySecretFetcherResource"),
);
console.log(`SYNTH=${JSON.stringify(relevant)}`);
