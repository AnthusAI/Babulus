"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { elapsedMs, sanitizeCampaign, sanitizePagePath, sanitizeSource } from "@/lib/waitlist-intake";
import { SIGN_UP_FORM_ID, sendEvent, signUpParameters } from "@/lib/analytics";

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

const FORM_ID = SIGN_UP_FORM_ID;
const NOTICE_VERSION = "babulus-waitlist-v1";

// Read at build time (inlined by Next.js). Unset means the waitlist is not live yet.
const INTAKE_BASE_URL = (process.env.NEXT_PUBLIC_PROSPECTUS_INTAKE_BASE_URL ?? "")
  .trim()
  .replace(/\/+$/, "");

export function WaitlistForm({ source }: { source?: string }) {
  const [state, setState] = useState<WaitlistState>({ status: "idle" });
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [persona, setPersona] = useState<Persona>("marketer");
  const [wantsUpdates, setWantsUpdates] = useState(false);
  const [website, setWebsite] = useState(""); // honeypot

  // Reused on retry; cleared when the content changes (a reused id with new content is a 409).
  const submissionIdRef = useRef<string | null>(null);
  // Render-to-submit time for Prospectus spam scoring; the first value is kept for retries of the same submission.
  const renderedAtRef = useRef<number | null>(null);
  const elapsedRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    renderedAtRef.current = performance.now();
  }, []);

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

    if (!submissionIdRef.current) {
      submissionIdRef.current = crypto.randomUUID();
      elapsedRef.current =
        renderedAtRef.current === null ? undefined : elapsedMs(renderedAtRef.current, performance.now());
    }

    const leadSource = sanitizeSource(source ?? "marketing-site", "marketing-site");
    const payload: Record<string, unknown> = {
      submission_id: submissionIdRef.current,
      email: email.trim(),
      notice_version: NOTICE_VERSION,
      marketing_opt_in: wantsUpdates,
      website,
      attributes: { persona, source: leadSource },
    };
    if (name.trim()) payload.name = name.trim();
    const pagePath = sanitizePagePath(window.location.pathname);
    if (pagePath) payload.page_path = pagePath;
    const campaign = sanitizeCampaign(new URLSearchParams(window.location.search));
    if (campaign) payload.campaign = campaign;
    if (elapsedRef.current !== undefined) payload.elapsed_ms = elapsedRef.current;

    try {
      const response = await fetch(`${INTAKE_BASE_URL}/intake/waitlist/${FORM_ID}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });

      // GA4 sign_up only for an accepted signup, with no personal data (no email, name or persona).
      const signUp = signUpParameters(response.status, leadSource);
      if (signUp) sendEvent("sign_up", signUp);

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
        setState({
          status: "error",
          message: "We couldn’t confirm your signup. Please try again; it won’t be counted twice.",
        });
      } else {
        setState({ status: "error", message: "Something went wrong. Please try again shortly." });
      }
    } catch {
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

        {/* Honeypot: hidden from sight and from assistive tech, so only bots fill it in. */}
        <div aria-hidden="true" className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden">
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
