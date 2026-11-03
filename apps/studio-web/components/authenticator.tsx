"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useState } from "react";
import { fetchAuthSession, getCurrentUser, signInWithRedirect } from "aws-amplify/auth";
import { configureAmplify } from "../lib/amplify-config";
import { signOutOfStudio } from "../lib/use-auth";
import {
  chooseStudioAccount,
  fetchStudioSession,
  startStudioSignIn,
  syncStudioAccountGroups,
  type StudioSession,
} from "../lib/studio-session";
import { AccountPickerScreen, LoadingScreen, NoAccessScreen, SignInScreen, signInErrorMessage } from "./sign-in/screens";

// Configure Amplify for client-side components
configureAmplify();

export type AuthenticatorProps = {
  children: ReactNode;
};

type Phase =
  | { kind: "loading" }
  | { kind: "signed-out"; error: string | null }
  | { kind: "no-access" }
  | { kind: "choose"; session: StudioSession; error: string | null }
  | { kind: "ready" };

const REDIRECT_GUARD = "babulus-cognito-redirect";

function idTokenGroups(payload: Record<string, unknown> | undefined): string[] {
  const groups = payload?.["cognito:groups"];
  return Array.isArray(groups) ? groups.filter((group): group is string => typeof group === "string") : [];
}

/**
 * Wraps the app content with the Studio's sign-in. Sign-in is Google only: the server session (Prospectus Accounts)
 * decides who may enter, and the Cognito tokens Amplify holds carry the Account groups the data layer enforces.
 */
export function Authenticator({ children }: AuthenticatorProps) {
  const [phase, setPhase] = useState<Phase>({ kind: "loading" });
  const [busyAccountId, setBusyAccountId] = useState<string | null>(null);

  const resolve = useCallback(async () => {
    const params = new URLSearchParams(window.location.search);
    const urlError = signInErrorMessage(params.get("sign_in_error"));
    let session: StudioSession;
    try {
      session = await fetchStudioSession();
    } catch {
      setPhase({ kind: "signed-out", error: urlError ?? signInErrorMessage("prospectus_sign_in_unavailable") });
      return;
    }
    if (!session.signedIn) {
      setPhase({ kind: "signed-out", error: urlError });
      return;
    }
    if (session.noAccess || !session.accounts || session.accounts.length === 0) {
      setPhase({ kind: "no-access" });
      return;
    }
    if (!session.selectedAccountId) {
      setPhase({ kind: "choose", session, error: null });
      return;
    }
    // The server session is good; now make sure the Cognito tokens carry this Account's group.
    try {
      let tokens = (await fetchAuthSession()).tokens;
      if (!tokens || !idTokenGroups(tokens.idToken?.payload).includes(session.selectedAccountId)) {
        if (tokens) {
          await syncStudioAccountGroups();
          tokens = (await fetchAuthSession({ forceRefresh: true })).tokens;
        }
        if (!tokens) throw new Error("no_cognito_session");
      }
      await getCurrentUser();
      sessionStorage.removeItem(REDIRECT_GUARD);
      setPhase({ kind: "ready" });
    } catch {
      // No Cognito session yet: the hosted UI session from the server sign-in makes this silent. Try once.
      if (sessionStorage.getItem(REDIRECT_GUARD) === "1") {
        sessionStorage.removeItem(REDIRECT_GUARD);
        setPhase({ kind: "signed-out", error: signInErrorMessage("sign_in_failed") });
        return;
      }
      sessionStorage.setItem(REDIRECT_GUARD, "1");
      await signInWithRedirect({ provider: "Google" });
    }
  }, []);

  useEffect(() => {
    void resolve();
  }, [resolve]);

  if (phase.kind === "loading") return <LoadingScreen />;
  if (phase.kind === "signed-out") {
    return (
      <SignInScreen
        error={phase.error}
        onContinue={() => startStudioSignIn(window.location.pathname + window.location.search.replace(/[?&]sign_in_error=[^&]*/, ""))}
      />
    );
  }
  if (phase.kind === "no-access") return <NoAccessScreen onSignOut={() => void signOutOfStudio()} />;
  if (phase.kind === "choose") {
    return (
      <AccountPickerScreen
        accounts={phase.session.accounts ?? []}
        busyAccountId={busyAccountId}
        error={phase.error}
        onSignOut={() => void signOutOfStudio()}
        onChoose={async (accountId) => {
          setBusyAccountId(accountId);
          try {
            await chooseStudioAccount(accountId);
            setBusyAccountId(null);
            setPhase({ kind: "loading" });
            await resolve();
          } catch {
            setBusyAccountId(null);
            setPhase({ ...phase, error: "That Account could not be selected. Try again." });
          }
        }}
      />
    );
  }
  return <>{children}</>;
}
