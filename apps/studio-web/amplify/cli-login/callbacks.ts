/**
 * The sign-in return URLs the `babulus` command needs on the Studio's web app client. Kept free of imports so the auth
 * resource, the backend and the discovery route share one definition.
 *
 * Cognito matches callback URLs exactly, so the loopback port is fixed. The command refuses to start a local sign-in
 * if something already listens on it.
 */
export const CLI_LOOPBACK_CALLBACK = "http://localhost:38512/";
export const CLI_APPROVE_PATH = "/cli/approve";
export const CLI_CALLBACK_PATH = "/cli/callback";

/** Every return URL the command adds to the web app client: always the loopback one, plus the remote one when remote sign-in is on. */
export function cliCallbackUrls(remoteCallbackUri?: string): string[] {
  return remoteCallbackUri ? [CLI_LOOPBACK_CALLBACK, remoteCallbackUri] : [CLI_LOOPBACK_CALLBACK];
}
