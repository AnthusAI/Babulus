"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Persona = "business" | "agency" | "marketer" | "creator" | "developer" | "other";

type WaitlistState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "success" }
  | { status: "error"; message: string };

const PERSONAS: Array<{ value: Persona; label: string }> = [
  { value: "business", label: "Business owner / operator" },
  { value: "agency", label: "Agency" },
  { value: "marketer", label: "Digital marketer" },
  { value: "creator", label: "Creator / influencer" },
  { value: "developer", label: "Developer / technical" },
  { value: "other", label: "Other" },
];

const FORM_ID = "babulus-waitlist-v1";
const NOTICE_VERSION = "babulus-waitlist-v1";
const SOURCE_PATTERN = /^[a-z0-9][a-z0-9-]{0,39}$/;

// Read at build time (inlined by Next.js). Unset means the waitlist is not live yet.
const INTAKE_BASE_URL = (process.env.NEXT_PUBLIC_PROSPECTUS_INTAKE_BASE_URL ?? "")
  .trim()
  .replace(/\/+$/, "");

function newSubmissionId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // Fallback for non-secure contexts: RFC 4122 v4.
  const bytes = new Uint8Array(16);
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function readCampaign(): Record<string, string> | undefined {
  const params = new URLSearchParams(window.location.search);
  const campaign: Record<string, string> = {};
  for (const key of ["utm_source", "utm_medium", "utm_campaign"]) {
    const value = params.get(key);
    if (value) campaign[key] = value;
  }
  return Object.keys(campaign).length > 0 ? campaign : undefined;
}

export function WaitlistForm({ source }: { source?: string }) {
  const [state, setState] = useState<WaitlistState>({ status: "idle" });
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [persona, setPersona] = useState<Persona>("marketer");
  const [wantsUpdates, setWantsUpdates] = useState(true);
  const [website, setWebsite] = useState(""); // honeypot

  // One id per form attempt; reused on retry (network error or 503) so Prospectus can
  // deduplicate. Cleared when the content changes, since an id used with different
  // content is rejected with a 409.
  const submissionIdRef = useRef<string | null>(null);

  const live = INTAKE_BASE_URL.length > 0;

  const canSubmit = useMemo(() => {
    if (!live) return false;
    if (state.status === "submitting") return false;
    return email.trim().length > 0;
  }, [live, email, state.status]);

  const resetAttempt = () => {
    submissionIdRef.current = null;
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!live) return;
    setState({ status: "submitting" });

    if (!submissionIdRef.current) submissionIdRef.current = newSubmissionId();

    const rawSource = source ?? "marketing-site";
    const payload: Record<string, unknown> = {
      submission_id: submissionIdRef.current,
      email: email.trim(),
      notice_version: NOTICE_VERSION,
      marketing_opt_in: wantsUpdates,
      page_path: window.location.pathname,
      website,
      attributes: {
        persona,
        source: SOURCE_PATTERN.test(rawSource) ? rawSource : "marketing-site",
      },
    };
    if (name.trim()) payload.name = name.trim();
    const campaign = readCampaign();
    if (campaign) payload.campaign = campaign;

    try {
      // Direct browser request: Prospectus binds the form by the request Origin.
      const response = await fetch(`${INTAKE_BASE_URL}/intake/waitlist/${FORM_ID}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.status === 202) {
        setState({ status: "success" });
        return;
      }

      let message: string | undefined;
      try {
        const data = (await response.json()) as { message?: string };
        message = typeof data.message === "string" ? data.message : undefined;
      } catch {
        message = undefined;
      }

      if (response.status === 400) {
        setState({ status: "error", message: message ?? "Please check your details and try again." });
      } else if (response.status === 409) {
        resetAttempt();
        setState({
          status: "error",
          message: message ?? "Something changed since your last attempt. Please submit again.",
        });
      } else if (response.status === 429) {
        setState({
          status: "error",
          message: "We’re getting a lot of requests. Please try again in a moment.",
        });
      } else if (response.status === 503) {
        // Keep the same submission_id so the retry is safe.
        setState({
          status: "error",
          message: "We couldn’t confirm your signup. Please try again; it won’t be counted twice.",
        });
      } else {
        setState({ status: "error", message: "Something went wrong. Please try again shortly." });
      }
    } catch {
      // Network error: keep submission_id for the retry.
      setState({
        status: "error",
        message: "We couldn’t reach the waitlist. Please check your connection and try again.",
      });
    }
  };

  if (state.status === "success") {
    return (
      <div className="rounded-2xl bg-card p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-foreground/60">
          You’re on the list
        </p>
        <h2 className="mt-2 font-heading text-3xl md:text-4xl">Thanks for joining.</h2>
        <p className="mt-3 text-muted-foreground">
          We’ll reach out as soon as early access opens. If you opted in, you’ll also receive progress
          updates.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-2xl bg-card p-6 md:p-8">
      <div className="grid gap-5">
        {!live ? (
          <div role="status" className="rounded-lg bg-background/70 p-3 text-sm text-foreground">
            <p className="font-semibold">The waitlist opens soon</p>
            <p className="mt-1 text-muted-foreground">
              We’re not taking signups just yet. Please check back shortly.
            </p>
          </div>
        ) : null}

        <div className="grid gap-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            disabled={!live}
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              resetAttempt();
            }}
            placeholder="you@company.com"
            className="border-transparent bg-background/70 focus-visible:ring-1"
          />
        </div>

        <div className="grid gap-2 md:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="name">Name (optional)</Label>
            <Input
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              disabled={!live}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                resetAttempt();
              }}
              placeholder="Alex"
              className="border-transparent bg-background/70 focus-visible:ring-1"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="persona">I’m a…</Label>
            <select
              id="persona"
              name="persona"
              value={persona}
              disabled={!live}
              onChange={(e) => {
                setPersona(e.target.value as Persona);
                resetAttempt();
              }}
              className="h-10 w-full rounded-md bg-background/70 px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {PERSONAS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <input
            id="updates"
            type="checkbox"
            checked={wantsUpdates}
            disabled={!live}
            onChange={(e) => {
              setWantsUpdates(e.target.checked);
              resetAttempt();
            }}
            className="mt-1 h-4 w-4 rounded bg-background/70 accent-[hsl(var(--primary))]"
          />
          <div className="grid gap-1">
            <Label htmlFor="updates">Email me progress updates</Label>
            <p className="text-sm text-muted-foreground">
              Occasional updates. Unsubscribe any time.
            </p>
          </div>
        </div>

        <div className="sr-only">
          <Label htmlFor="website">Website</Label>
          <Input
            id="website"
            name="website"
            type="text"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            tabIndex={-1}
            autoComplete="off"
          />
        </div>

        {state.status === "error" ? (
          <div className="rounded-lg bg-background/70 p-3 text-sm text-foreground">
            {state.message}
          </div>
        ) : null}

        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <p className="text-xs text-muted-foreground">
            By joining, you agree to receive email related to early access and product updates (if opted in).
          </p>
          <Button type="submit" disabled={!canSubmit}>
            {state.status === "submitting" ? "Joining…" : live ? "Join Waitlist" : "Opens soon"}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Your details are processed by Anthus’s Prospectus CRM. See our{" "}
          <Link href="/privacy" className="underline underline-offset-2">
            privacy notice
          </Link>
          .
        </p>
      </div>
    </form>
  );
}
