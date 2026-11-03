import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Given, Then, When } from "@cucumber/cucumber";
import { NextRequest } from "next/server";
import { resolveCognitoDomainPrefix } from "../../apps/studio-web/amplify/auth/cognito-domain.js";
import { resolveAuthRedirectUrls } from "../../apps/studio-web/amplify/auth/redirect-urls.js";
import {
  STUDIO_ROLE_FOR_PROSPECTUS_ROLE,
  type CognitoGroupAdmin,
} from "../../apps/studio-web/lib/prospectus/access.js";
import {
  handleProspectusAccountSelection,
  handleProspectusGroupSync,
  handleProspectusSessionRead,
  handleProspectusSignInCallback,
  handleProspectusSignInStart,
  type ProspectusSignInRouteOptions,
} from "../../apps/studio-web/lib/prospectus/sign-in-routes.js";
import {
  PROSPECTUS_PENDING_SIGN_IN_COOKIE,
  PROSPECTUS_SESSION_COOKIE,
  sealProspectusCookie,
  type ProspectusSignInRuntime,
} from "../../apps/studio-web/lib/prospectus/session.js";
import {
  ProspectusAccountsError,
  type ProspectusDirectoryAccount,
  type ProspectusRole,
} from "../../apps/studio-web/lib/prospectus/site-identity.js";

const studioWeb = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../apps/studio-web");

// ---------------------------------------------------------------- synthesized auth stack

type CfnResource = { Type: string; Properties: Record<string, any> };
let synthesized: CfnResource[] = [];

function resourcesOfType(type: string): CfnResource[] {
  return synthesized.filter((resource) => resource.Type === type);
}

function clientNamed(name: string): CfnResource {
  const found = resourcesOfType("AWS::Cognito::UserPoolClient").filter((client) => (client.Properties.ClientName ?? "") === name);
  assert.equal(found.length, 1, `expected one client named ${name}`);
  return found[0];
}

function webClient(): CfnResource {
  const clients = resourcesOfType("AWS::Cognito::UserPoolClient").filter((client) => client.Properties.ClientName !== "prospectus-google-only");
  assert.equal(clients.length, 1, "expected exactly one web client");
  return clients[0];
}

Given("the Studio auth stack is synthesized for the {string} branch", (branch: string) => {
  const environment: Record<string, string> = {
    PATH: process.env.PATH ?? "",
    HOME: process.env.HOME ?? "",
    AWS_REGION: "us-east-1",
    AWS_BRANCH: branch,
    AWS_EC2_METADATA_DISABLED: "true",
  };
  const run = spawnSync(process.execPath, ["--import", "tsx", "scripts/synth-auth.ts"], { cwd: studioWeb, env: environment, encoding: "utf8" });
  assert.equal(run.status, 0, run.stderr.slice(-2000));
  const line = /^SYNTH=(.*)$/m.exec(run.stdout);
  assert.ok(line, `no synth output: ${run.stdout.slice(-500)}`);
  synthesized = JSON.parse(line[1]) as CfnResource[];
});

Then("the user pool lets only administrators create users", () => {
  const [pool] = resourcesOfType("AWS::Cognito::UserPool");
  assert.equal(pool.Properties.AdminCreateUserConfig.AllowAdminCreateUserOnly, true);
});

Then("the user pool still uses email as its username attribute", () => {
  const [pool] = resourcesOfType("AWS::Cognito::UserPool");
  assert.deepEqual(pool.Properties.UsernameAttributes, ["email"]);
});

Then("the user pool has no schema override that would replace it", () => {
  const [pool] = resourcesOfType("AWS::Cognito::UserPool");
  assert.deepEqual(pool.Properties.UsernameAttributes, ["email"]);
  assert.equal(pool.Properties.AliasAttributes, undefined);
  const schemaNames = (pool.Properties.Schema ?? []).map((attribute: { Name: string }) => attribute.Name);
  assert.deepEqual(schemaNames, ["email"]);
});

Then("the hosted UI domain is a new resource named {string}", (prefix: string) => {
  const domains = resourcesOfType("AWS::Cognito::UserPoolDomain");
  assert.equal(domains.length, 1);
  assert.equal(domains[0].Properties.Domain, prefix);
});

Then("the web client offers only the refresh token flow", () => {
  assert.deepEqual(webClient().Properties.ExplicitAuthFlows, ["ALLOW_REFRESH_TOKEN_AUTH"]);
});

Then("the web client's only identity provider is {string}", (provider: string) => {
  assert.deepEqual(webClient().Properties.SupportedIdentityProviders, [provider]);
});

Then("the user pool has a Google identity provider", () => {
  const providers = resourcesOfType("AWS::Cognito::UserPoolIdentityProvider");
  assert.equal(providers.length, 1);
  assert.equal(providers[0].Properties.ProviderName, "Google");
  assert.equal(providers[0].Properties.ProviderType, "Google");
});

Then("the Prospectus client is named {string}", (name: string) => {
  assert.ok(clientNamed(name));
});

Then("the Prospectus client has no secret", () => {
  assert.equal(clientNamed("prospectus-google-only").Properties.GenerateSecret, false);
});

Then("the Prospectus client uses only the authorization code flow", () => {
  assert.deepEqual(clientNamed("prospectus-google-only").Properties.AllowedOAuthFlows, ["code"]);
});

Then("the Prospectus client offers only the refresh token flow", () => {
  assert.deepEqual(clientNamed("prospectus-google-only").Properties.ExplicitAuthFlows, ["ALLOW_REFRESH_TOKEN_AUTH"]);
});

Then("the Prospectus client's only identity provider is {string}", (provider: string) => {
  assert.deepEqual(clientNamed("prospectus-google-only").Properties.SupportedIdentityProviders, [provider]);
});

Then("the Prospectus client's callback paths all end in {string}", (suffix: string) => {
  const urls = clientNamed("prospectus-google-only").Properties.CallbackURLs as string[];
  assert.ok(urls.length > 0);
  for (const url of urls) assert.ok(url.endsWith(suffix), url);
});

// ---------------------------------------------------------------- domain prefix and return URLs

let branch = "";
let override = "";

Given("the deployment branch is {string} and the prefix override is {string}", (givenBranch: string, givenOverride: string) => {
  branch = givenBranch;
  override = givenOverride;
});

Then("the Cognito domain prefix is {string}", (prefix: string) => {
  assert.equal(resolveCognitoDomainPrefix({ AWS_BRANCH: branch, BABULUS_COGNITO_DOMAIN_PREFIX: override }), prefix);
});

Then("choosing the Cognito domain prefix is refused", () => {
  assert.throws(() => resolveCognitoDomainPrefix({ AWS_BRANCH: branch, BABULUS_COGNITO_DOMAIN_PREFIX: override }), /registers/);
});

let configuredUrls: string | undefined;

Given("no return URLs are configured", () => {
  configuredUrls = undefined;
});

Given("the return URLs are configured as {string}", (urls: string) => {
  configuredUrls = urls;
});

function readUrls(): string[] {
  return resolveAuthRedirectUrls({ BABULUS_OAUTH_REDIRECT_URLS: configuredUrls });
}

Then("the return URLs include {string}", (url: string) => {
  assert.ok(readUrls().includes(url));
});

Then("the return URLs are exactly {string}", (urls: string) => {
  assert.deepEqual(readUrls(), urls.split(","));
});

Then("reading the return URLs is refused", () => {
  assert.throws(() => readUrls(), /Refusing sign-in return URLs/);
});

// ---------------------------------------------------------------- fake Prospectus, Cognito and Google

const ORIGIN = "https://studio.example.test";
const HOSTED_UI = "https://babulus-dev.auth.us-east-1.amazoncognito.com";
const SEALING_SECRET = "s".repeat(48);
const USERNAME = "Google_synthetic-user";
/** Synthetic ids are built from a counter so the file holds no literal identifier. */
const syntheticId = (n: number): string => ["00000000", "0000", "4000", "8000", n.toString(16).padStart(12, "0")].join("-");
const PERSON_ID = syntheticId(9001);
const CHALLENGE_ID = syntheticId(9002);
const NOW = 1_800_000_000;

const accountIds = new Map<string, string>();
function accountId(name: string): string {
  if (!accountIds.has(name)) {
    accountIds.set(name, syntheticId(accountIds.size + 1));
  }
  return accountIds.get(name)!;
}

let directory: ProspectusDirectoryAccount[] = [];
let refusedWrites = new Set<string>();
let prospectusUnreachable = false;
let resolveCalls: Array<{ challengeToken?: string; accessToken: string; idToken: string }> = [];
let configured = true;
let groups = new Map<string, Set<string>>();
let sessionCookie = "";
let lastResponse: Response | null = null;
let lastSessionView: any = null;
let authorizeUrl: URL | null = null;
let pendingCookie = "";
let challengeNonce = "";

function resetWorld(): void {
  directory = [];
  refusedWrites = new Set();
  prospectusUnreachable = false;
  resolveCalls = [];
  configured = true;
  groups = new Map([[USERNAME, new Set<string>()]]);
  sessionCookie = "";
  lastResponse = null;
  lastSessionView = null;
  authorizeUrl = null;
  pendingCookie = "";
  challengeNonce = "n".repeat(40);
}
resetWorld();

const groupAdmin: CognitoGroupAdmin = {
  async listGroupsForUser(_pool, username) {
    return [...(groups.get(username) ?? [])];
  },
  async createGroup() {},
  async addUserToGroup(_pool, username, group) {
    groups.get(username)!.add(group);
  },
  async removeUserFromGroup(_pool, username, group) {
    groups.get(username)!.delete(group);
  },
};

const fakeAccounts: ProspectusSignInRuntime["accounts"] = {
  async requestGoogleSignInChallenge() {
    return { challengeId: CHALLENGE_ID, nonce: challengeNonce, expiresAt: NOW + 300, challengeToken: "signed-challenge" };
  },
  async resolveGoogleSignIn(challenge, accessToken, idToken) {
    resolveCalls.push({ challengeToken: challenge.challengeToken, accessToken, idToken });
    return { person: { id: PERSON_ID, createdAt: "2026-01-01T00:00:00Z" } };
  },
  async currentPerson() {
    return { person: { id: PERSON_ID, createdAt: "2026-01-01T00:00:00Z" } };
  },
  async accountDirectory() {
    if (prospectusUnreachable) throw new Error("connect ECONNREFUSED");
    return { person: { id: PERSON_ID, createdAt: "2026-01-01T00:00:00Z" }, accounts: directory };
  },
  async authorizeAccountOperation(_token, id, operation) {
    if (refusedWrites.has(id)) throw new ProspectusAccountsError(403, "not_authorized", "refused");
    const account = directory.find((candidate) => candidate.id === id);
    if (!account) throw new ProspectusAccountsError(404, "account_not_found", "unknown");
    return { allowed: true, accountId: id, personId: PERSON_ID, product: "babulus", role: account.role, operation, revision: 1 };
  },
};

function runtime(): ProspectusSignInRuntime {
  return {
    accounts: fakeAccounts,
    cognitoClient: { hostedUiOrigin: HOSTED_UI, userPoolId: "pool-for-tests", clientId: "federation-client-for-tests", redirectUri: `${ORIGIN}/api/auth/prospectus/callback` },
    sealingSecret: SEALING_SECRET,
  };
}

function fakeJwt(claims: Record<string, unknown>): string {
  return `header.${Buffer.from(JSON.stringify(claims)).toString("base64url")}.signature`;
}

function routeOptions(): ProspectusSignInRouteOptions {
  return {
    resolveRuntime: async () => (configured ? runtime() : null),
    groupAdmin,
    nowInSeconds: () => NOW,
    environment: { BABULUS_APP_ORIGIN: ORIGIN },
    log: () => undefined,
    completionOverrides: {
      verifyCognitoTokens: async () => undefined,
      fetcher: (async () =>
        new Response(JSON.stringify({ access_token: fakeJwt({ username: USERNAME, sub: "sub-synthetic" }), id_token: fakeJwt({ sub: "sub-synthetic" }), expires_in: 3600 }), {
          status: 200,
        })) as typeof fetch,
    },
  };
}

function request(urlPath: string, init: { method?: string; cookies?: Record<string, string>; origin?: string; body?: unknown } = {}): NextRequest {
  const headers: Record<string, string> = {};
  if (init.cookies && Object.keys(init.cookies).length > 0) {
    headers.cookie = Object.entries(init.cookies).map(([name, value]) => `${name}=${value}`).join("; ");
  }
  if (init.origin) headers.origin = init.origin;
  if (init.body !== undefined) headers["content-type"] = "application/json";
  return new NextRequest(`${ORIGIN}${urlPath}`, {
    method: init.method ?? "GET",
    headers,
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
}

function cookieValue(response: Response, name: string): string {
  const header = (response.headers.getSetCookie?.() ?? []).find((line) => line.startsWith(`${name}=`));
  return header ? decodeURIComponent(header.slice(name.length + 1).split(";")[0]) : "";
}

function addAccount(name: string, role: ProspectusRole, switchedOn: boolean): void {
  directory.push({
    id: accountId(name),
    name: `${name} Account`,
    role,
    products: switchedOn ? [{ product: "babulus", status: "active" }] : [{ product: "other-product", status: "active" }],
  });
}

Given("Babulus is configured for Prospectus sign-in", () => {
  resetWorld();
});

Given("Babulus is not configured for Prospectus sign-in", () => {
  resetWorld();
  configured = false;
});

Given("the signed-in person belongs to Account {string} as {word} with Babulus switched on", (name: string, role: string) => {
  addAccount(name, role as ProspectusRole, true);
});

Given("the signed-in person belongs to Account {string} as {word} without Babulus switched on", (name: string, role: string) => {
  addAccount(name, role as ProspectusRole, false);
});

Given("the person has since been added to Account {string} as {word} with Babulus switched on", (name: string, role: string) => {
  addAccount(name, role as ProspectusRole, true);
});

Given("the person already holds the group for Account {string} and a hand-made group {string}", (name: string, handMade: string) => {
  groups.get(USERNAME)!.add(accountId(name));
  groups.get(USERNAME)!.add(handMade);
});

Given("Prospectus refuses console write for Account {string}", (name: string) => {
  refusedWrites.add(accountId(name));
});

Given("Prospectus cannot be reached after the sign-in", () => {
  prospectusUnreachable = true;
});

async function startSignIn(): Promise<void> {
  lastResponse = await handleProspectusSignInStart(request("/api/auth/prospectus/sign-in"), routeOptions());
  const location = lastResponse.headers.get("location");
  if (location) authorizeUrl = new URL(location);
  pendingCookie = cookieValue(lastResponse, PROSPECTUS_PENDING_SIGN_IN_COOKIE);
}

When("a visitor starts to sign in", async () => {
  await startSignIn();
});

async function callback(query: string, withPendingCookie = true): Promise<void> {
  lastResponse = await handleProspectusSignInCallback(
    request(`/api/auth/prospectus/callback?${query}`, { cookies: withPendingCookie && pendingCookie ? { [PROSPECTUS_PENDING_SIGN_IN_COOKIE]: pendingCookie } : {} }),
    routeOptions(),
  );
  sessionCookie = cookieValue(lastResponse, PROSPECTUS_SESSION_COOKIE);
}

When("a visitor starts to sign in and Google returns with a valid code", async () => {
  await startSignIn();
  await callback(`code=authorization-code&state=${authorizeUrl!.searchParams.get("state")}`);
});

When("a visitor starts to sign in and Google returns with the wrong state", async () => {
  await startSignIn();
  await callback("code=authorization-code&state=not-the-state");
});

When("a visitor starts to sign in and Google reports that the person cancelled", async () => {
  await startSignIn();
  await callback("error=access_denied");
});

When("Google returns with a code but the browser has no pending sign-in", async () => {
  await callback("code=authorization-code&state=anything", false);
});

Then("the visitor is sent to the Google-only Cognito authorize address", () => {
  assert.equal(lastResponse!.status, 303);
  assert.equal(authorizeUrl!.origin, HOSTED_UI);
  assert.equal(authorizeUrl!.pathname, "/oauth2/authorize");
  assert.equal(authorizeUrl!.searchParams.get("client_id"), "federation-client-for-tests");
});

Then("the authorize address asks for the Google provider with the code flow and a PKCE challenge", () => {
  assert.equal(authorizeUrl!.searchParams.get("identity_provider"), "Google");
  assert.equal(authorizeUrl!.searchParams.get("response_type"), "code");
  assert.equal(authorizeUrl!.searchParams.get("code_challenge_method"), "S256");
  assert.ok((authorizeUrl!.searchParams.get("code_challenge") ?? "").length >= 40);
});

Then("the authorize address carries the nonce Prospectus issued", () => {
  assert.equal(authorizeUrl!.searchParams.get("nonce"), challengeNonce);
});

Then("a sealed pending cookie is set that is not readable text", () => {
  assert.ok(pendingCookie.startsWith("v1."));
  assert.ok(!pendingCookie.includes("signed-challenge"));
  assert.ok(!pendingCookie.includes(authorizeUrl!.searchParams.get("state")!));
});

Then("the answer is a 503 that says sign-in is not configured", async () => {
  assert.equal(lastResponse!.status, 503);
  const body = (await lastResponse!.json()) as { error: string };
  assert.equal(body.error, "prospectus_sign_in_unavailable");
});

Then("Prospectus is asked to resolve the challenge with the person's access and ID tokens", () => {
  assert.equal(resolveCalls.length, 1);
  assert.equal(resolveCalls[0].challengeToken, "signed-challenge");
  assert.ok(resolveCalls[0].accessToken.length > 0 && resolveCalls[0].idToken.length > 0);
});

Then("the visitor is sent back into the Studio with a sealed session cookie", () => {
  assert.equal(lastResponse!.status, 303);
  assert.equal(new URL(lastResponse!.headers.get("location")!).origin, ORIGIN);
  assert.ok(sessionCookie.startsWith("v1."));
});

Then("the session cookie holds no readable token", () => {
  assert.ok(!sessionCookie.includes(Buffer.from('"username"').toString("base64url")));
  assert.ok(!Buffer.from(sessionCookie.slice(3), "base64url").toString("utf8").includes("header."));
});

Then("the visitor is sent back with the sign-in error {string}", (code: string) => {
  assert.equal(lastResponse!.status, 303);
  assert.equal(new URL(lastResponse!.headers.get("location")!).searchParams.get("sign_in_error"), code);
});

Then("the visitor is sent back with a sign-in error", () => {
  assert.equal(lastResponse!.status, 303);
  assert.ok(new URL(lastResponse!.headers.get("location")!).searchParams.get("sign_in_error"));
});

Then("no session cookie is set", () => {
  assert.equal(sessionCookie, "");
});

function heldGroups(): Set<string> {
  return groups.get(USERNAME)!;
}

Then("the person is in the group for Account {string}", (name: string) => {
  assert.ok(heldGroups().has(accountId(name)));
});

Then("the person is still in the group for Account {string}", (name: string) => {
  assert.ok(heldGroups().has(accountId(name)));
});

Then("the person is not in the group for Account {string}", (name: string) => {
  assert.ok(!heldGroups().has(accountId(name)));
});

Then("the person is still in the hand-made group {string}", (name: string) => {
  assert.ok(heldGroups().has(name));
});

Then("the person is in no Account groups", () => {
  const accountGroups = [...heldGroups()].filter((group) => /^[0-9a-f]{8}-/.test(group));
  assert.deepEqual(accountGroups, []);
});

async function readSessionView(): Promise<void> {
  const response = await handleProspectusSessionRead(request("/api/auth/prospectus/session", { cookies: { [PROSPECTUS_SESSION_COOKIE]: sessionCookie } }), routeOptions());
  lastSessionView = await response.json();
}

Then("the session view says the person has no access to Babulus", async () => {
  await readSessionView();
  assert.equal(lastSessionView.signedIn, true);
  assert.equal(lastSessionView.noAccess, true);
});

Then("the session view lists no Accounts", () => {
  assert.deepEqual(lastSessionView.accounts, []);
});

Then("the session view lists Account {string} only", async (name: string) => {
  await readSessionView();
  assert.deepEqual(lastSessionView.accounts.map((account: { accountId: string }) => account.accountId), [accountId(name)]);
  assert.equal(lastSessionView.selectedAccountId, accountId(name));
});

Then("the session view asks the person to choose an Account", async () => {
  await readSessionView();
  assert.equal(lastSessionView.accounts.length, 2);
  assert.equal(lastSessionView.selectedAccountId, null);
});

Given("the Prospectus role {string}", (role: string) => {
  roleUnderTest = role as ProspectusRole;
});
let roleUnderTest: ProspectusRole = "viewer";

Then("the Studio role is {string}", (studio: string) => {
  assert.equal(STUDIO_ROLE_FOR_PROSPECTUS_ROLE[roleUnderTest] ?? "none", studio === "none" ? "none" : studio);
});

// ---------------------------------------------------------------- group refresh and selection

function sealedSession(selected?: string): string {
  return sealProspectusCookie(
    SEALING_SECRET,
    PROSPECTUS_SESSION_COOKIE,
    { personId: PERSON_ID, accessToken: "access-token", accessTokenExpiresAt: NOW + 3000, cognitoUsername: USERNAME, ...(selected ? { selectedAccountId: selected } : {}) },
    NOW + 3000,
  );
}

Given("the person has a signed-in session", () => {
  sessionCookie = sealedSession(directory[0] ? directory[0].id : undefined);
});

When("the Studio asks the server to refresh the person's Account groups", async () => {
  lastResponse = await handleProspectusGroupSync(
    request("/api/auth/prospectus/sync", { method: "POST", origin: ORIGIN, cookies: { [PROSPECTUS_SESSION_COOKIE]: sessionCookie } }),
    routeOptions(),
  );
  assert.equal(lastResponse.status, 200);
});

When("another site asks the server to refresh the person's Account groups", async () => {
  lastResponse = await handleProspectusGroupSync(
    request("/api/auth/prospectus/sync", { method: "POST", origin: "https://other.example.test", cookies: { [PROSPECTUS_SESSION_COOKIE]: sessionCookie } }),
    routeOptions(),
  );
});

When("the Studio asks the server to refresh groups without a session", async () => {
  lastResponse = await handleProspectusGroupSync(request("/api/auth/prospectus/sync", { method: "POST", origin: ORIGIN }), routeOptions());
});

Then("the answer is a 403 and no group changes", () => {
  assert.equal(lastResponse!.status, 403);
  assert.equal(heldGroups().size, 0);
});

Then("the answer is a 401 and no group changes", () => {
  assert.equal(lastResponse!.status, 401);
  assert.equal(heldGroups().size, 0);
});

When("the person chooses Account {string}", async (name: string) => {
  lastResponse = await handleProspectusAccountSelection(
    request("/api/auth/prospectus/selection", {
      method: "POST",
      origin: ORIGIN,
      cookies: { [PROSPECTUS_SESSION_COOKIE]: sessionCookie },
      body: { accountId: accountId(name) },
    }),
    routeOptions(),
  );
});

Then("the answer is a 403 and the selection is unchanged", () => {
  assert.equal(lastResponse!.status, 403);
  assert.equal(cookieValue(lastResponse!, PROSPECTUS_SESSION_COOKIE), "");
});
