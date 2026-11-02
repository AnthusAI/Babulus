"use client";

import { Authenticator as AmplifyAuthenticator } from "@aws-amplify/ui-react";
import "@aws-amplify/ui-react/styles.css";
import type { ReactNode } from "react";
import { useState, useEffect } from "react";
import { getCurrentUser } from "aws-amplify/auth";
import { configureAmplify } from "../lib/amplify-config";

// Configure Amplify for client-side components
configureAmplify();

export type AuthenticatorProps = {
  children: ReactNode;
};

/**
 * Wraps the app content with Amplify authentication.
 * Shows the sign-in UI if the user is not authenticated.
 */
export function Authenticator({ children }: AuthenticatorProps) {
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Quick session check using cached credentials
    async function checkAuth() {
      try {
        await getCurrentUser();
      } catch {
      } finally {
        setIsChecking(false);
      }
    }
    checkAuth();
  }, []);

  // Show loading state while checking auth (should be very fast with cached session)
  if (isChecking) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <AmplifyAuthenticator
      signUpAttributes={["email"]}
      loginMechanisms={["email"]}
    >
      {children}
    </AmplifyAuthenticator>
  );
}
