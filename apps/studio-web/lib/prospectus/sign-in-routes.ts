import { NextResponse, type NextRequest } from "next/server";
import {
  ProspectusAccountsError,
  beginProspectusGoogleSignIn,
  completeProspectusGoogleSignIn,
  type CompleteProspectusGoogleSignInInput,
} from "./site-identity";
import {
  AppOriginNotConfiguredError,
  PROSPECTUS_PENDING_SIGN_IN_COOKIE,
  PROSPECTUS_SESSION_COOKIE,
  appOrigin,
  openProspectusCookie,
  resolveProspectusSignInRuntime,
  sameSiteReturnPath,
  sealProspectusCookie,
  sealedCookieAttributes,
  signedInProspectusSession,
  type PendingProspectusSignInCookie,
  type ProspectusSignInRuntime,
  type ProspectusSignedInSession,
} from "./session";
import { authorizedStudioAccounts, cognitoGroupAdmin, syncAccountGroups, type CognitoGroupAdmin, type StudioAccountAccess } from "./access";

/**
 * The Studio's sign-in routes for Prospectus Accounts: start (challenge, then the Google-only Cognito redirect),
 * callback (verify, enroll the Person, sync Account groups, seal the session), session (who is signed in and which
 * Accounts they can work in), selection, sync and sign-out. Every route answers 503 until Babulus is registered and
 * configured, so an unregistered deployment never half-signs anyone in.
 */
export interface ProspectusSignInRouteOptions {
  resolveRuntime?: (siteOrigin: string) => Promise<ProspectusSignInRuntime | null>;
  groupAdmin?: CognitoGroupAdmin;
  completionOverrides?: Pick<CompleteProspectusGoogleSignInInput, "verifyCognitoTokens" | "fetcher">;
  nowInSeconds?: () => number;
  environment?: Record<string, string | undefined>;
  log?: (line: string) => void;
}

const NO_STORE = { "cache-control": "no-store" };

function now(options: ProspectusSignInRouteOptions): number {
  return options.nowInSeconds?.() ?? Math.floor(Date.now() / 1000);
}

function jsonFailure(status: number, code: string, message: string): NextResponse {
  return NextResponse.json({ error: code, message }, { status, headers: NO_STORE });
}

function unavailable(): NextResponse {
  return jsonFailure(503, "prospectus_sign_in_unavailable", "Sign-in through Prospectus is not configured for this deployment.");
}

function clearCookie(response: NextResponse, name: string): void {
  response.cookies.set(name, "", sealedCookieAttributes(0, 0));
}

async function failingClosed(route: () => Promise<NextResponse>): Promise<NextResponse> {
  try {
    return await route();
  } catch (error) {
    if (error instanceof AppOriginNotConfiguredError) return jsonFailure(error.status, error.code, error.message);
    throw error;
  }
}

async function runtimeFor(options: ProspectusSignInRouteOptions): Promise<{ runtime: ProspectusSignInRuntime; origin: string } | null> {
  const origin = appOrigin(options.environment);
  const runtime = await (options.resolveRuntime ?? ((siteOrigin: string) => resolveProspectusSignInRuntime(siteOrigin, { environment: options.environment })))(origin);
  return runtime ? { runtime, origin } : null;
}

function sameOrigin(request: NextRequest, origin: string): boolean {
  return request.headers.get("origin") === origin;
}

/** GET or POST starts the Google sign-in with a 303 to the Google-only Cognito authorize URL. */
export function handleProspectusSignInStart(request: NextRequest, options: ProspectusSignInRouteOptions = {}): Promise<NextResponse> {
  return failingClosed(async () => {
    const resolved = await runtimeFor(options);
    if (!resolved) return unavailable();
    const { runtime } = resolved;
    const { authorizationUrl, pendingSignIn } = await beginProspectusGoogleSignIn(runtime.accounts, runtime.cognitoClient);
    const pending: PendingProspectusSignInCookie = { ...pendingSignIn, returnPath: sameSiteReturnPath(request.nextUrl.searchParams.get("returnTo")) };
    const response = NextResponse.redirect(authorizationUrl, { status: 303, headers: NO_STORE });
    response.cookies.set(
      PROSPECTUS_PENDING_SIGN_IN_COOKIE,
      sealProspectusCookie(runtime.sealingSecret, PROSPECTUS_PENDING_SIGN_IN_COOKIE, pending, pendingSignIn.expiresAt),
      sealedCookieAttributes(pendingSignIn.expiresAt, now(options)),
    );
    return response;
  });
}

function failedRedirect(origin: string, returnPath: string | null, code: string): NextResponse {
  const target = new URL(returnPath ?? "/", origin);
  target.searchParams.set("sign_in_error", /^[a-z0-9_]{1,60}$/.test(code) ? code : "sign_in_failed");
  return NextResponse.redirect(target, { status: 303, headers: NO_STORE });
}

export function handleProspectusSignInCallback(request: NextRequest, options: ProspectusSignInRouteOptions = {}): Promise<NextResponse> {
  return failingClosed(async () => {
    const resolved = await runtimeFor(options);
    if (!resolved) return unavailable();
    const { runtime, origin } = resolved;
    const at = now(options);
    const pending = openProspectusCookie<PendingProspectusSignInCookie>(
      runtime.sealingSecret,
      PROSPECTUS_PENDING_SIGN_IN_COOKIE,
      request.cookies.get(PROSPECTUS_PENDING_SIGN_IN_COOKIE)?.value,
      at,
    );
    const response = await completeCallback(request, runtime, origin, pending, options, at);
    clearCookie(response, PROSPECTUS_PENDING_SIGN_IN_COOKIE);
    return response;
  });
}

async function completeCallback(
  request: NextRequest,
  runtime: ProspectusSignInRuntime,
  origin: string,
  pending: PendingProspectusSignInCookie | null,
  options: ProspectusSignInRouteOptions,
  at: number,
): Promise<NextResponse> {
  const failed = (code: string, detail: Record<string, unknown> = {}) => {
    (options.log ?? console.error)(`prospectus_sign_in_failed ${JSON.stringify({ code, ...detail })}`);
    return failedRedirect(origin, pending?.returnPath ?? null, code);
  };
  if (!pending) return failed("sign_in_expired");
  const params = request.nextUrl.searchParams;
  if (params.get("error")) return failed("sign_in_declined");
  const code = params.get("code");
  const state = params.get("state");
  if (!code || !state) return failed("sign_in_incomplete");
  try {
    const signedIn = await completeProspectusGoogleSignIn({
      accounts: runtime.accounts,
      cognitoClient: runtime.cognitoClient,
      pendingSignIn: pending,
      returnedState: state,
      authorizationCode: code,
      nowInSeconds: at,
      ...options.completionOverrides,
    });
    // Groups are synced before the session exists, so a sign-in that cannot be scoped does not half-succeed.
    const accounts = await authorizedStudioAccounts(runtime.accounts, signedIn.accessToken, signedIn.person.id);
    await syncAccountGroups({
      admin: options.groupAdmin ?? cognitoGroupAdmin(),
      userPoolId: runtime.cognitoClient.userPoolId,
      username: signedIn.cognitoUsername,
      entitledAccountIds: accounts.map((account) => account.accountId),
    });
    const session: ProspectusSignedInSession = {
      personId: signedIn.person.id,
      accessToken: signedIn.accessToken,
      accessTokenExpiresAt: signedIn.accessTokenExpiresAt,
      cognitoUsername: signedIn.cognitoUsername,
      ...(accounts.length === 1 ? { selectedAccountId: accounts[0].accountId } : {}),
    };
    const response = NextResponse.redirect(new URL(pending.returnPath, origin), { status: 303, headers: NO_STORE });
    response.cookies.set(
      PROSPECTUS_SESSION_COOKIE,
      sealProspectusCookie(runtime.sealingSecret, PROSPECTUS_SESSION_COOKIE, session, session.accessTokenExpiresAt),
      sealedCookieAttributes(session.accessTokenExpiresAt, at),
    );
    return response;
  } catch (error) {
    if (error instanceof ProspectusAccountsError) return failed(error.code, { httpStatus: error.status });
    return failed("sign_in_failed", { errorName: error instanceof Error ? error.name : "error" });
  }
}

export interface SessionView {
  signedIn: boolean;
  /** True when the person is signed in but no Account has Babulus switched on for them. */
  noAccess?: boolean;
  accounts?: StudioAccountAccess[];
  selectedAccountId?: string | null;
}

/** Re-reads Prospectus for the session's person; only the fields the UI needs ever go to the browser. */
export function handleProspectusSessionRead(request: NextRequest, options: ProspectusSignInRouteOptions = {}): Promise<NextResponse> {
  return failingClosed(async () => {
    const resolved = await runtimeFor(options);
    if (!resolved) return unavailable();
    const { runtime } = resolved;
    const session = signedInProspectusSession(request, runtime.sealingSecret, now(options));
    if (!session) return NextResponse.json({ signedIn: false } satisfies SessionView, { headers: NO_STORE });
    try {
      const accounts = await authorizedStudioAccounts(runtime.accounts, session.accessToken, session.personId);
      const view: SessionView = {
        signedIn: true,
        noAccess: accounts.length === 0,
        accounts,
        selectedAccountId: accounts.some((account) => account.accountId === session.selectedAccountId) ? (session.selectedAccountId ?? null) : null,
      };
      return NextResponse.json(view, { headers: NO_STORE });
    } catch (error) {
      if (error instanceof ProspectusAccountsError && error.status === 401) {
        const response = NextResponse.json({ signedIn: false } satisfies SessionView, { headers: NO_STORE });
        clearCookie(response, PROSPECTUS_SESSION_COOKIE);
        return response;
      }
      if (error instanceof ProspectusAccountsError) return jsonFailure(error.status, error.code, error.message);
      return jsonFailure(503, "prospectus_unavailable", "Prospectus could not be reached.");
    }
  });
}

/** Chooses the Account to work in. Selection is a preference only; every action is authorized again server-side. */
export function handleProspectusAccountSelection(request: NextRequest, options: ProspectusSignInRouteOptions = {}): Promise<NextResponse> {
  return failingClosed(async () => {
    const resolved = await runtimeFor(options);
    if (!resolved) return unavailable();
    const { runtime, origin } = resolved;
    if (!sameOrigin(request, origin)) return jsonFailure(403, "cross_origin_selection", "Choose an Account from the Studio.");
    const at = now(options);
    const session = signedInProspectusSession(request, runtime.sealingSecret, at);
    if (!session) return jsonFailure(401, "signed_out", "Sign in first.");
    const body = (await request.json().catch(() => null)) as { accountId?: unknown } | null;
    const accountId = typeof body?.accountId === "string" ? body.accountId.trim().toLowerCase() : "";
    if (!accountId) return jsonFailure(400, "account_required", "Choose an Account.");
    try {
      const accounts = await authorizedStudioAccounts(runtime.accounts, session.accessToken, session.personId);
      const chosen = accounts.find((account) => account.accountId === accountId);
      if (!chosen) return jsonFailure(403, "not_a_studio_account", "You cannot work in that Account.");
      const response = NextResponse.json({ selectedAccountId: chosen.accountId, role: chosen.role }, { headers: NO_STORE });
      const selected: ProspectusSignedInSession = { ...session, selectedAccountId: chosen.accountId };
      response.cookies.set(
        PROSPECTUS_SESSION_COOKIE,
        sealProspectusCookie(runtime.sealingSecret, PROSPECTUS_SESSION_COOKIE, selected, session.accessTokenExpiresAt),
        sealedCookieAttributes(session.accessTokenExpiresAt, at),
      );
      return response;
    } catch (error) {
      if (error instanceof ProspectusAccountsError) return jsonFailure(error.status, error.code, error.message);
      return jsonFailure(503, "prospectus_unavailable", "Prospectus could not be reached.");
    }
  });
}

/**
 * Re-syncs the signed-in user's Account groups from Prospectus. The web app calls it before refreshing its Cognito
 * tokens, so a new or removed Account shows in `cognito:groups` without signing out. The server decides the groups; the
 * request carries no Account id.
 */
export function handleProspectusGroupSync(request: NextRequest, options: ProspectusSignInRouteOptions = {}): Promise<NextResponse> {
  return failingClosed(async () => {
    const resolved = await runtimeFor(options);
    if (!resolved) return unavailable();
    const { runtime, origin } = resolved;
    if (request.method !== "POST") return jsonFailure(405, "method_not_allowed", "Use POST.");
    if (!sameOrigin(request, origin)) return jsonFailure(403, "cross_origin_sync", "Sync from the Studio.");
    const session = signedInProspectusSession(request, runtime.sealingSecret, now(options));
    if (!session) return jsonFailure(401, "signed_out", "Sign in first.");
    try {
      const accounts = await authorizedStudioAccounts(runtime.accounts, session.accessToken, session.personId);
      const result = await syncAccountGroups({
        admin: options.groupAdmin ?? cognitoGroupAdmin(),
        userPoolId: runtime.cognitoClient.userPoolId,
        username: session.cognitoUsername,
        entitledAccountIds: accounts.map((account) => account.accountId),
      });
      return NextResponse.json({ accounts: accounts.length, added: result.added.length, removed: result.removed.length }, { headers: NO_STORE });
    } catch (error) {
      if (error instanceof ProspectusAccountsError) return jsonFailure(error.status, error.code, error.message);
      return jsonFailure(503, "sync_unavailable", "Account access could not be refreshed.");
    }
  });
}

export function handleProspectusSignOut(_request: NextRequest, options: ProspectusSignInRouteOptions = {}): Promise<NextResponse> {
  return failingClosed(async () => {
    const resolved = await runtimeFor(options);
    const origin = resolved?.origin ?? appOrigin(options.environment);
    const home = new URL("/", origin).toString();
    const destination = resolved
      ? new URL(`/logout?${new URLSearchParams({ client_id: resolved.runtime.cognitoClient.clientId, logout_uri: home })}`, resolved.runtime.cognitoClient.hostedUiOrigin)
      : new URL(home);
    const response = NextResponse.redirect(destination, { status: 303, headers: NO_STORE });
    clearCookie(response, PROSPECTUS_SESSION_COOKIE);
    clearCookie(response, PROSPECTUS_PENDING_SIGN_IN_COOKIE);
    return response;
  });
}

/**
 * The selection a server action or route works under: the session's chosen Account, re-authorized with Prospectus now.
 * Null when signed out, nothing is chosen, or Prospectus no longer authorizes it. PR B's authorization builds on this.
 */
export async function currentStudioSelection(
  request: Pick<NextRequest, "cookies">,
  options: ProspectusSignInRouteOptions = {},
): Promise<{ personId: string; accountId: string; role: string } | null> {
  const resolved = await runtimeFor(options);
  if (!resolved) return null;
  const session = signedInProspectusSession(request, resolved.runtime.sealingSecret, now(options));
  if (!session?.selectedAccountId) return null;
  try {
    const accounts = await authorizedStudioAccounts(resolved.runtime.accounts, session.accessToken, session.personId);
    const chosen = accounts.find((account) => account.accountId === session.selectedAccountId);
    return chosen ? { personId: session.personId, accountId: chosen.accountId, role: chosen.role } : null;
  } catch {
    return null;
  }
}
