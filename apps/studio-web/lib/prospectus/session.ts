import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { GetParameterCommand, SSMClient } from "@aws-sdk/client-ssm";
import type { NextRequest } from "next/server";
import {
  ProspectusStudioAccounts,
  signedProspectusTransport,
  type GoogleOnlyCognitoClient,
  type PendingProspectusSignIn,
  type ProspectusTransport,
} from "./site-identity";

/**
 * Browser state for signing in through Prospectus, kept in two sealed cookies so the Studio holds no session table.
 * The pending cookie carries one sign-in attempt (challenge, state, PKCE verifier) from the redirect to the callback;
 * the session cookie carries the signed-in Person and their Cognito access token until it expires. Both are
 * AES-256-GCM sealed with a per-cookie key derived from a generated secret, and bound to the cookie name so one cannot
 * be replayed as the other. Tokens never reach the browser.
 */
export const PROSPECTUS_PENDING_SIGN_IN_COOKIE = "__Host-babulus-prospectus-pending";
export const PROSPECTUS_SESSION_COOKIE = "__Host-babulus-prospectus-session";
export const PROSPECTUS_ACCOUNTS_ENDPOINT_ENV = "BABULUS_PROSPECTUS_ACCOUNTS_ENDPOINT";
export const PROSPECTUS_SESSION_SECRET_PARAMETER_ENV = "BABULUS_PROSPECTUS_SESSION_SECRET_PARAMETER";
export const APP_ORIGIN_ENV = "BABULUS_APP_ORIGIN";
export const PROSPECTUS_SESSION_SECRET_CACHE_MILLISECONDS = 5 * 60 * 1000;

const SEALED_COOKIE_FORMAT_VERSION = "v1";
const SEALED_COOKIE_KEY_DERIVATION_SALT = "babulus-prospectus-cookie";
const GCM_INITIALIZATION_VECTOR_BYTES = 12;
const GCM_AUTHENTICATION_TAG_BYTES = 16;
const MINIMUM_SEALING_SECRET_LENGTH = 32;

export interface PendingProspectusSignInCookie extends PendingProspectusSignIn {
  returnPath: string;
}

export interface ProspectusSignedInSession {
  personId: string;
  accessToken: string;
  accessTokenExpiresAt: number;
  /** The Cognito username, used only to address the user when syncing Account groups. */
  cognitoUsername: string;
  selectedAccountId?: string;
}

export class AppOriginNotConfiguredError extends Error {
  readonly code = "app_origin_not_configured";
  readonly status = 503;
  constructor() {
    super(`${APP_ORIGIN_ENV} must name the Studio's public origin.`);
  }
}

/** The Studio's own origin from trusted configuration, never the request's Host header. */
export function appOrigin(environment: Record<string, string | undefined> = process.env): string {
  const configured = (environment[APP_ORIGIN_ENV] ?? "").trim();
  try {
    const parsed = new URL(configured);
    const loopback = parsed.protocol === "http:" && ["localhost", "127.0.0.1"].includes(parsed.hostname);
    if ((parsed.protocol === "https:" || loopback) && parsed.origin === configured) return parsed.origin;
  } catch {
    // fall through
  }
  throw new AppOriginNotConfiguredError();
}

export function signedInProspectusSession(
  request: Pick<NextRequest, "cookies">,
  sealingSecret: string,
  nowInSeconds?: number,
): ProspectusSignedInSession | null {
  return openProspectusCookie<ProspectusSignedInSession>(
    sealingSecret,
    PROSPECTUS_SESSION_COOKIE,
    request.cookies.get(PROSPECTUS_SESSION_COOKIE)?.value,
    nowInSeconds,
  );
}

function sealingKeyForCookie(sealingSecret: string, cookieName: string): Buffer {
  if (sealingSecret.length < MINIMUM_SEALING_SECRET_LENGTH) throw new Error("The Prospectus session sealing secret is too short.");
  return Buffer.from(hkdfSync("sha256", sealingSecret, SEALED_COOKIE_KEY_DERIVATION_SALT, cookieName, 32));
}

export function sealProspectusCookie(sealingSecret: string, cookieName: string, payload: object, expiresAtSeconds: number): string {
  const initializationVector = randomBytes(GCM_INITIALIZATION_VECTOR_BYTES);
  const cipher = createCipheriv("aes-256-gcm", sealingKeyForCookie(sealingSecret, cookieName), initializationVector);
  cipher.setAAD(Buffer.from(cookieName));
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify({ payload, expiresAtSeconds })), cipher.final()]);
  return `${SEALED_COOKIE_FORMAT_VERSION}.${Buffer.concat([initializationVector, ciphertext, cipher.getAuthTag()]).toString("base64url")}`;
}

export function openProspectusCookie<Payload>(
  sealingSecret: string,
  cookieName: string,
  sealedValue: string | undefined,
  nowInSeconds: number = Math.floor(Date.now() / 1000),
): Payload | null {
  if (!sealedValue?.startsWith(`${SEALED_COOKIE_FORMAT_VERSION}.`)) return null;
  const sealedBytes = Buffer.from(sealedValue.slice(SEALED_COOKIE_FORMAT_VERSION.length + 1), "base64url");
  if (sealedBytes.length <= GCM_INITIALIZATION_VECTOR_BYTES + GCM_AUTHENTICATION_TAG_BYTES) return null;
  try {
    const decipher = createDecipheriv(
      "aes-256-gcm",
      sealingKeyForCookie(sealingSecret, cookieName),
      sealedBytes.subarray(0, GCM_INITIALIZATION_VECTOR_BYTES),
    );
    decipher.setAAD(Buffer.from(cookieName));
    decipher.setAuthTag(sealedBytes.subarray(sealedBytes.length - GCM_AUTHENTICATION_TAG_BYTES));
    const plaintext = Buffer.concat([
      decipher.update(sealedBytes.subarray(GCM_INITIALIZATION_VECTOR_BYTES, sealedBytes.length - GCM_AUTHENTICATION_TAG_BYTES)),
      decipher.final(),
    ]).toString("utf8");
    const { payload, expiresAtSeconds } = JSON.parse(plaintext) as { payload: Payload; expiresAtSeconds: number };
    if (typeof expiresAtSeconds !== "number" || nowInSeconds >= expiresAtSeconds) return null;
    return payload;
  } catch {
    return null;
  }
}

export function sealedCookieAttributes(expiresAtSeconds: number, nowInSeconds: number = Math.floor(Date.now() / 1000)) {
  return {
    httpOnly: true,
    secure: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: Math.max(0, expiresAtSeconds - nowInSeconds),
  };
}

export function sameSiteReturnPath(requestedReturnPath: string | null | undefined): string {
  if (!requestedReturnPath || !requestedReturnPath.startsWith("/") || requestedReturnPath.startsWith("//")) return "/";
  if (/[\\\u0000-\u001f]/.test(requestedReturnPath)) return "/";
  const parsed = new URL(requestedReturnPath, "https://babulus.invalid");
  if (parsed.origin !== "https://babulus.invalid") return "/";
  return `${parsed.pathname}${parsed.search}${parsed.hash}`;
}

export type ProspectusSessionSecretReader = (parameterName: string) => Promise<string | null>;

type CachedSealingSecret = { parameterName: string; value: string; expiresAt: number };

let cachedSealingSecret: CachedSealingSecret | null = null;
let defaultSsmClient: SSMClient | null = null;

export function resetProspectusSessionSecretCache(): void {
  cachedSealingSecret = null;
}

export async function readSealingSecretFromSsm(parameterName: string, client?: Pick<SSMClient, "send">): Promise<string | null> {
  defaultSsmClient ??= new SSMClient({});
  const response = await (client ?? defaultSsmClient).send(new GetParameterCommand({ Name: parameterName, WithDecryption: true }));
  return response.Parameter?.Value?.trim() || null;
}

export async function loadProspectusSessionSealingSecret(
  options: { environment?: Record<string, string | undefined>; readSecret?: ProspectusSessionSecretReader; now?: number } = {},
): Promise<string | null> {
  const environment = options.environment ?? process.env;
  const parameterName = environment[PROSPECTUS_SESSION_SECRET_PARAMETER_ENV]?.trim();
  if (!parameterName) return null;
  const now = options.now ?? Date.now();
  if (cachedSealingSecret && cachedSealingSecret.parameterName === parameterName && cachedSealingSecret.expiresAt > now) {
    return cachedSealingSecret.value;
  }
  try {
    const value = (await (options.readSecret ?? readSealingSecretFromSsm)(parameterName))?.trim();
    if (!value || value.length < MINIMUM_SEALING_SECRET_LENGTH) return null;
    cachedSealingSecret = { parameterName, value, expiresAt: now + PROSPECTUS_SESSION_SECRET_CACHE_MILLISECONDS };
    return value;
  } catch (error) {
    console.error(`Prospectus session sealing secret could not be read (${error instanceof Error ? error.name : "error"}).`);
    return null;
  }
}

export interface ProspectusSignInRuntime {
  accounts: Pick<ProspectusStudioAccounts, "requestGoogleSignInChallenge" | "resolveGoogleSignIn" | "currentPerson" | "authorizeAccountOperation" | "accountDirectory">;
  cognitoClient: GoogleOnlyCognitoClient;
  sealingSecret: string;
}

export interface AmplifyOutputsForProspectusSignIn {
  auth?: { user_pool_id?: string; oauth?: { domain?: string } };
  custom?: { prospectusSignIn?: { clientId?: string; callbackPath?: string; sessionSecretParameter?: string } | null };
}

/** Reads the deployed backend's public values from `amplify_outputs.json`; null when the file is absent or unreadable. */
export function readAmplifyOutputs(): AmplifyOutputsForProspectusSignIn | null {
  try {
    return JSON.parse(readFileSync(path.join(process.cwd(), "amplify_outputs.json"), "utf8")) as AmplifyOutputsForProspectusSignIn;
  } catch {
    return null;
  }
}

export function regionOfProspectusAccountsEndpoint(endpoint: string): string {
  const match = /^[a-z0-9]+\.execute-api\.([a-z0-9-]+)\.amazonaws\.com$/.exec(new URL(endpoint).hostname);
  if (!match) throw new Error("The Prospectus accounts endpoint is not an API Gateway execute-api host.");
  return match[1];
}

export function googleOnlyCognitoClientFromOutputs(outputs: AmplifyOutputsForProspectusSignIn | null, siteOrigin: string): GoogleOnlyCognitoClient | null {
  const userPoolId = outputs?.auth?.user_pool_id;
  const hostedUiDomain = outputs?.auth?.oauth?.domain;
  const signIn = outputs?.custom?.prospectusSignIn;
  if (!userPoolId || !hostedUiDomain || !signIn?.clientId || !signIn.callbackPath) return null;
  return {
    hostedUiOrigin: `https://${hostedUiDomain}`,
    userPoolId,
    clientId: signIn.clientId,
    redirectUri: new URL(signIn.callbackPath, siteOrigin).toString(),
  };
}

export async function resolveProspectusSignInRuntime(
  siteOrigin: string,
  options: {
    environment?: Record<string, string | undefined>;
    amplifyOutputs?: AmplifyOutputsForProspectusSignIn | null;
    readSecret?: ProspectusSessionSecretReader;
    transport?: ProspectusTransport;
  } = {},
): Promise<ProspectusSignInRuntime | null> {
  const environment = options.environment ?? process.env;
  const endpoint = environment[PROSPECTUS_ACCOUNTS_ENDPOINT_ENV]?.trim();
  if (!endpoint) return null;
  const outputs = options.amplifyOutputs !== undefined ? options.amplifyOutputs : readAmplifyOutputs();
  const cognitoClient = googleOnlyCognitoClientFromOutputs(outputs, siteOrigin);
  if (!cognitoClient) return null;
  // The parameter name comes from the deployed backend's outputs; the environment variable only overrides it.
  const parameterName = environment[PROSPECTUS_SESSION_SECRET_PARAMETER_ENV]?.trim() || outputs?.custom?.prospectusSignIn?.sessionSecretParameter;
  const sealingSecret = await loadProspectusSessionSealingSecret({
    environment: { ...environment, [PROSPECTUS_SESSION_SECRET_PARAMETER_ENV]: parameterName },
    readSecret: options.readSecret,
  });
  if (!sealingSecret) return null;
  const transport = options.transport ?? signedProspectusTransport({ endpoint, region: regionOfProspectusAccountsEndpoint(endpoint) });
  return { accounts: new ProspectusStudioAccounts(transport), cognitoClient, sealingSecret };
}
