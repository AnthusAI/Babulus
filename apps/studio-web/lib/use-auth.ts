"use client";

import { useEffect, useState } from "react";
import { getCurrentUser, signOut as amplifySignOut, fetchAuthSession } from "aws-amplify/auth";
import { configureAmplify } from "./amplify-config";
import { endStudioSession } from "./studio-session";

// Ensure Amplify is configured before using auth APIs
configureAmplify();

export type AuthUser = {
  userId: string;
  email: string | null;
  emailVerified: boolean;
  /** The Account ids (Cognito groups) the ID token carries; the data layer authorizes records by these. */
  accountIds: string[];
};

export type AuthState = {
  user: AuthUser | null;
  isLoading: boolean;
  error: Error | null;
};

const ACCOUNT_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** Signs out of the Studio session and of Cognito (which also ends the Google hosted-UI session). */
export async function signOutOfStudio(): Promise<void> {
  await endStudioSession();
  await amplifySignOut();
}

/**
 * Hook to manage authentication state. Returns the current user (read from the verified Cognito tokens Amplify holds),
 * loading state, and any errors.
 */
export function useAuth(): AuthState & {
  signOut: () => Promise<void>;
  refreshAuth: () => Promise<void>;
} {
  const [state, setState] = useState<AuthState>({ user: null, isLoading: true, error: null });

  const loadUser = async () => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));
      const currentUser = await getCurrentUser();
      const session = await fetchAuthSession();
      const payload = session.tokens?.idToken?.payload ?? {};
      const groups = Array.isArray(payload["cognito:groups"]) ? (payload["cognito:groups"] as unknown[]) : [];
      setState({
        user: {
          userId: currentUser.userId,
          email: typeof payload.email === "string" ? payload.email : null,
          emailVerified: payload.email_verified === true,
          accountIds: groups.filter((group): group is string => typeof group === "string" && ACCOUNT_ID.test(group)),
        },
        isLoading: false,
        error: null,
      });
    } catch (error) {
      setState({ user: null, isLoading: false, error: error instanceof Error ? error : new Error(String(error)) });
    }
  };

  useEffect(() => {
    loadUser();
  }, []);

  const signOut = async () => {
    try {
      await signOutOfStudio();
      setState({ user: null, isLoading: false, error: null });
    } catch (error) {
      setState((prev) => ({ ...prev, error: error instanceof Error ? error : new Error(String(error)) }));
    }
  };

  return { ...state, signOut, refreshAuth: loadUser };
}
