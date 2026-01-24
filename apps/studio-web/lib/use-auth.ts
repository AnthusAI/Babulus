"use client";

import { useEffect, useState } from "react";
import { getCurrentUser, signOut as amplifySignOut, fetchAuthSession } from "aws-amplify/auth";

export type AuthUser = {
  userId: string;
  email: string | null;
  emailVerified: boolean;
};

export type AuthState = {
  user: AuthUser | null;
  isLoading: boolean;
  error: Error | null;
};

/**
 * Hook to manage authentication state.
 * Returns the current user, loading state, and any errors.
 */
export function useAuth(): AuthState & {
  signOut: () => Promise<void>;
  refreshAuth: () => Promise<void>;
} {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    error: null,
  });

  const loadUser = async () => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      const currentUser = await getCurrentUser();
      const session = await fetchAuthSession();

      const email = currentUser.signInDetails?.loginId ?? null;

      setState({
        user: {
          userId: currentUser.userId,
          email,
          emailVerified: session.tokens?.idToken?.payload?.email_verified === true,
        },
        isLoading: false,
        error: null,
      });
    } catch (error) {
      // User not signed in
      setState({
        user: null,
        isLoading: false,
        error: error instanceof Error ? error : new Error(String(error)),
      });
    }
  };

  useEffect(() => {
    loadUser();
  }, []);

  const signOut = async () => {
    try {
      await amplifySignOut();
      setState({ user: null, isLoading: false, error: null });
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error : new Error(String(error)),
      }));
    }
  };

  return {
    ...state,
    signOut,
    refreshAuth: loadUser,
  };
}
