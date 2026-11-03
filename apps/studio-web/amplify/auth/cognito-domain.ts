import type { Stack } from "aws-cdk-lib";
import { CfnUserPoolDomain } from "aws-cdk-lib/aws-cognito";

/** The Cognito hosted-UI prefixes whose Google redirect URIs are registered (production and development). */
export const PRODUCTION_DOMAIN_PREFIX = "babulus";
export const DEVELOPMENT_DOMAIN_PREFIX = "babulus-dev";

/**
 * Which hosted-UI prefix a deployment uses: an explicit `BABULUS_COGNITO_DOMAIN_PREFIX` wins, otherwise the production
 * branch (`main`) uses `babulus` and everything else (sandboxes, other branches) uses `babulus-dev`.
 */
export function resolveCognitoDomainPrefix(environment: Record<string, string | undefined> = process.env): string {
  const explicit = (environment.BABULUS_COGNITO_DOMAIN_PREFIX ?? "").trim();
  if (explicit !== "") {
    if (explicit !== PRODUCTION_DOMAIN_PREFIX && explicit !== DEVELOPMENT_DOMAIN_PREFIX) {
      throw new Error(`BABULUS_COGNITO_DOMAIN_PREFIX must be ${PRODUCTION_DOMAIN_PREFIX} or ${DEVELOPMENT_DOMAIN_PREFIX}; those are the prefixes the Google client registers.`);
    }
    return explicit;
  }
  return (environment.AWS_BRANCH ?? "").trim() === "main" ? PRODUCTION_DOMAIN_PREFIX : DEVELOPMENT_DOMAIN_PREFIX;
}

/**
 * Amplify overwrites `externalProviders.domainPrefix` with a hash of the backend id, so the prefix is set on the
 * synthesized domain instead. The pool has no domain today, so this creates one; it never renames an existing one.
 */
export function applyCognitoDomainPrefix(authStack: Stack, cognitoDomainPrefix: string): void {
  const domains = authStack.node.findAll().filter((construct): construct is CfnUserPoolDomain => construct instanceof CfnUserPoolDomain);
  if (domains.length !== 1) {
    throw new Error(`Expected exactly one Cognito user pool domain in the auth stack, found ${domains.length}`);
  }
  domains[0].domain = cognitoDomainPrefix;
}
