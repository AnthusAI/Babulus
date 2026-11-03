/**
 * The SSM parameter that seals the Studio's sign-in cookies, named from the deployment so every branch and the sandbox
 * have their own. The name is not secret; only the generated value is.
 */
export function sealingParameterName(environment: Record<string, string | undefined> = process.env): string {
  const branch = (environment.AWS_BRANCH ?? "").trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");
  return `/babulus/studio/${branch === "" ? "sandbox" : branch}/prospectus-session-sealing`;
}
