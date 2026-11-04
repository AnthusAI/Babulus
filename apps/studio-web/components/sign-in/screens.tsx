"use client";

import type { ReactNode } from "react";
import { Building2, ChevronRight, CircleAlert, LoaderCircle, LogIn, LogOut, ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";

/** What the screens say when a sign-in attempt failed, by the code the callback put in `sign_in_error`. */
export const SIGN_IN_ERROR_MESSAGES: Record<string, string> = {
  sign_in_declined: "Google sign-in was cancelled.",
  sign_in_expired: "Sign-in took too long. Try again.",
  sign_in_incomplete: "Sign-in did not finish. Try again.",
  account_sync_failed: "Your Account access could not be set up. Try again in a moment.",
  prospectus_sign_in_unavailable: "Sign-in is not available right now.",
};

export function signInErrorMessage(code: string | null | undefined): string | null {
  if (!code) return null;
  return SIGN_IN_ERROR_MESSAGES[code] ?? "Sign-in failed. Try again.";
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md space-y-6 rounded-2xl bg-card p-8 text-card-foreground">{children}</div>
    </main>
  );
}

function Heading({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-foreground/60">Babulus</p>
      <h1 className="font-heading text-4xl">{title}</h1>
      {children ? <p className="text-sm leading-6 text-muted-foreground">{children}</p> : null}
    </div>
  );
}

export function LoadingScreen() {
  return (
    <Shell>
      <div className="flex items-center gap-3 text-muted-foreground" role="status">
        <LoaderCircle className="h-5 w-5 animate-spin" aria-hidden="true" />
        <span>Loading…</span>
      </div>
    </Shell>
  );
}

export function SignInScreen({ error, busy, onContinue }: { error?: string | null; busy?: boolean; onContinue: () => void }) {
  return (
    <Shell>
      <Heading title="Sign in">Babulus uses your Google sign-in. There are no passwords to manage here.</Heading>
      {error ? (
        <div className="flex items-start gap-2 rounded-xl bg-destructive/15 p-3 text-sm" role="alert">
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      ) : null}
      <Button size="lg" className="w-full gap-2" onClick={onContinue} disabled={busy}>
        {busy ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <LogIn className="h-4 w-4" aria-hidden="true" />}
        Continue with Google
      </Button>
      <p className="text-xs leading-5 text-muted-foreground">
        Your Accounts and who can use Babulus in them are managed by Anthus One.
      </p>
    </Shell>
  );
}

export function NoAccessScreen({ onSignOut }: { onSignOut: () => void }) {
  return (
    <Shell>
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary">
        <ShieldOff className="h-6 w-6" aria-hidden="true" />
      </div>
      <Heading title="No access to Babulus">
        You are signed in, but none of your Accounts has Babulus switched on for you. An Anthus operator has to turn it on,
        then you can sign in again.
      </Heading>
      <Button variant="secondary" className="w-full gap-2" onClick={onSignOut}>
        <LogOut className="h-4 w-4" aria-hidden="true" />
        Sign out
      </Button>
    </Shell>
  );
}

export interface PickableAccount {
  accountId: string;
  accountName: string;
  role: string;
}

export function AccountPickerScreen({
  accounts,
  busyAccountId,
  error,
  onChoose,
  onSignOut,
}: {
  accounts: readonly PickableAccount[];
  busyAccountId?: string | null;
  error?: string | null;
  onChoose: (accountId: string) => void;
  onSignOut: () => void;
}) {
  return (
    <Shell>
      <Heading title="Choose an Account">Your work in Babulus belongs to one Account at a time. You can switch later.</Heading>
      {error ? (
        <div className="flex items-start gap-2 rounded-xl bg-destructive/15 p-3 text-sm" role="alert">
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      ) : null}
      <ul className="space-y-2">
        {accounts.map((account) => (
          <li key={account.accountId}>
            <button
              type="button"
              onClick={() => onChoose(account.accountId)}
              disabled={busyAccountId != null}
              className="flex w-full items-center gap-3 rounded-xl bg-secondary p-3 text-left transition-colors hover:bg-accent disabled:opacity-60"
            >
              <Building2 className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{account.accountName}</span>
                <span className="block text-xs capitalize text-muted-foreground">{account.role}</span>
              </span>
              {busyAccountId === account.accountId ? (
                <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              )}
            </button>
          </li>
        ))}
      </ul>
      <Button variant="bare" className="gap-2" onClick={onSignOut}>
        <LogOut className="h-4 w-4" aria-hidden="true" />
        Sign out
      </Button>
    </Shell>
  );
}
