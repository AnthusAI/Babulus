"use client";

import { Authenticator as AmplifyAuthenticator } from "@aws-amplify/ui-react";
import "@aws-amplify/ui-react/styles.css";
import type { ReactNode } from "react";
import { Amplify } from "aws-amplify";
import outputs from "../amplify_outputs.json";

// Configure Amplify for client-side components
Amplify.configure(outputs);

export type AuthenticatorProps = {
  children: ReactNode;
};

/**
 * Wraps the app content with Amplify authentication.
 * Shows the sign-in UI if the user is not authenticated.
 */
export function Authenticator({ children }: AuthenticatorProps) {
  return (
    <AmplifyAuthenticator
      signUpAttributes={["email"]}
      loginMechanisms={["email"]}
    >
      {children}
    </AmplifyAuthenticator>
  );
}
