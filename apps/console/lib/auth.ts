/**
 * Operator sign-in for the Babulus control plane console.
 *
 * Google is the only way in: the Cognito hosted UI runs the authorization code
 * flow with PKCE and sends the browser back to /callback. Being signed in does
 * not make someone an operator; the API answers 403 until an administrator adds
 * them to the operators group.
 */

export interface Session {
  email: string;
  accessToken: string;
  idToken: string;
  expiresAt: number;
}

const SESSION_STORAGE_KEY = 'auritus_console_session';

export function getStoredSession(): Session | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as Session;
    if (Date.now() > session.expiresAt) {
      localStorage.removeItem(SESSION_STORAGE_KEY);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function saveSession(session: Session): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

export function clearSession(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(SESSION_STORAGE_KEY);
}

const PKCE_STORAGE_KEY = 'babulus_console_pkce';
const DEFAULT_COGNITO_DOMAIN = 'babulus-control-plane-auth';

export const NOT_OPERATOR_MESSAGE =
  'You are signed in, but you are not an operator yet. Ask an administrator to add you to the operators group, then sign in again.';

function cognitoConfig() {
  const domain = process.env.NEXT_PUBLIC_COGNITO_DOMAIN || DEFAULT_COGNITO_DOMAIN;
  const region = process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1';
  const clientId = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID || '';
  const redirectUri = `${window.location.origin}/callback`;
  return { host: `${domain}.auth.${region}.amazoncognito.com`, clientId, redirectUri };
}

function base64Url(bytes: Uint8Array): string {
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function randomString(byteLength: number): string {
  return base64Url(crypto.getRandomValues(new Uint8Array(byteLength)));
}

async function challengeFor(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return base64Url(new Uint8Array(digest));
}

/** Build the hosted UI address that signs in with Google, and remember the PKCE secrets for /callback. */
export async function startGoogleSignIn(): Promise<string> {
  const { host, clientId, redirectUri } = cognitoConfig();
  if (!clientId) {
    throw new Error('Sign-in is not configured: set NEXT_PUBLIC_COGNITO_CLIENT_ID (see apps/console/README.md).');
  }
  const verifier = randomString(64);
  const state = randomString(16);
  sessionStorage.setItem(PKCE_STORAGE_KEY, JSON.stringify({ verifier, state }));

  const params = new URLSearchParams({
    identity_provider: 'Google',
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'openid email profile',
    state,
    code_challenge: await challengeFor(verifier),
    code_challenge_method: 'S256',
  });
  return `https://${host}/oauth2/authorize?${params.toString()}`;
}

/** Trade the code Google sign-in returned for tokens, checking the state and sending the PKCE verifier. */
export async function completeGoogleSignIn(code: string, state: string | null): Promise<Session> {
  const { host, clientId, redirectUri } = cognitoConfig();
  const stored = sessionStorage.getItem(PKCE_STORAGE_KEY);
  sessionStorage.removeItem(PKCE_STORAGE_KEY);
  if (!stored) {
    throw new Error('This sign-in did not start in this browser tab. Start again from the sign-in page.');
  }
  const { verifier, state: expectedState } = JSON.parse(stored) as { verifier: string; state: string };
  if (!state || state !== expectedState) {
    throw new Error('The sign-in response did not match the request. Start again from the sign-in page.');
  }

  const response = await fetch(`https://${host}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId,
      code,
      redirect_uri: redirectUri,
      code_verifier: verifier,
    }).toString(),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error_description || data.error || 'Failed to exchange authorization code.');
  }

  let email = '';
  if (data.id_token) {
    try {
      const payload = data.id_token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      email = JSON.parse(atob(payload)).email || '';
    } catch {
      // The address is only shown in the header.
    }
  }

  const session: Session = {
    email,
    accessToken: data.access_token,
    idToken: data.id_token || '',
    expiresAt: Date.now() + (data.expires_in || 3600) * 1000,
  };
  saveSession(session);
  return session;
}

export function getAuthorizationHeader(): Record<string, string> {
  const session = getStoredSession();
  if (session?.accessToken) {
    return { Authorization: `Bearer ${session.accessToken}` };
  }
  return {};
}
