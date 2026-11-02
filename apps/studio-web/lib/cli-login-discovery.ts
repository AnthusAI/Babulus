import { NextResponse } from "next/server";
import { CLI_LOOPBACK_CALLBACK } from "../amplify/cli-login/callbacks";
import { readCliLoginOutputs, type CliLoginOutputs } from "./cli-login-outputs";

/**
 * The public values `babulus login <studio>` needs, served at `/.well-known/babulus-cli.json`.
 * Every value is public (Cognito pool and client ids, hosted-UI domain, API URL). Nothing here is a secret, and the
 * file exists only when the web app client really registers the command's loopback return URL.
 */
export interface CliLoginDocument {
  publication: string;
  issuer: string;
  client_id: string;
  oauth_domain: string;
  api_endpoint: string;
  callback_uri: string;
  /** Present only when remote sign-in is switched on (docs/cli-login.md). */
  broker_endpoint?: string;
  remote_callback_uri?: string;
}

export function cliLoginDocumentFromOutputs(outputs: CliLoginOutputs | null): CliLoginDocument | null {
  const published = outputs?.custom?.cliLogin;
  const userPoolId = outputs?.auth?.user_pool_id;
  const clientId = outputs?.auth?.user_pool_client_id;
  const domain = outputs?.auth?.oauth?.domain;
  const redirects = outputs?.auth?.oauth?.redirect_sign_in_uri ?? [];
  const apiEndpoint = published?.apiEndpoint;
  const origin = published?.appOrigin;
  if (!userPoolId || !clientId || !domain || !published || !apiEndpoint || !origin) return null;
  if (!apiEndpoint.startsWith("https://") || !origin.startsWith("https://")) return null;
  // Only when the client registers the callback; otherwise the sign-in could never complete.
  if (!redirects.includes(CLI_LOOPBACK_CALLBACK)) return null;
  const region = outputs?.auth?.aws_region ?? userPoolId.split("_")[0];
  const document: CliLoginDocument = {
    publication: origin,
    issuer: `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`,
    client_id: clientId,
    oauth_domain: `https://${domain}`,
    api_endpoint: apiEndpoint,
    callback_uri: CLI_LOOPBACK_CALLBACK,
  };
  const broker = published.brokerEndpoint;
  const callback = published.remoteCallbackUri;
  // Remote sign-in only when the backend published a broker, the callback is this Studio's own page, and the client registers it.
  if (broker && callback && broker.startsWith("https://") && callback === `${origin}/cli/callback` && redirects.includes(callback)) {
    document.broker_endpoint = broker;
    document.remote_callback_uri = callback;
  }
  return document;
}

export interface CliLoginDiscoveryOptions {
  readOutputs?: () => CliLoginOutputs | null;
}

export function handleCliLoginDiscovery(options: CliLoginDiscoveryOptions = {}): NextResponse {
  const document = cliLoginDocumentFromOutputs((options.readOutputs ?? readCliLoginOutputs)());
  if (!document) {
    return NextResponse.json(
      { error: "cli_login_not_configured", message: "This Studio does not register the command's sign-in callback." },
      { status: 404, headers: { "cache-control": "public, max-age=60" } },
    );
  }
  return NextResponse.json(document, { headers: { "cache-control": "public, max-age=300" } });
}
