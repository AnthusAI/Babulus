"use client";

import { useMemo, useState } from "react";
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

export function WaitlistForm({ source }: { source?: string }) {
  const [state, setState] = useState<WaitlistState>({ status: "idle" });
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [persona, setPersona] = useState<Persona>("marketer");
  const [wantsUpdates, setWantsUpdates] = useState(true);
  const [website, setWebsite] = useState(""); // honeypot

  const canSubmit = useMemo(() => {
    if (state.status === "submitting") return false;
    return email.trim().length > 0;
  }, [email, state.status]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setState({ status: "submitting" });

    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email,
          name,
          persona,
          wantsUpdates,
          source: source ?? "marketing-site",
          website,
        }),
      });
      const data = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok) {
        setState({ status: "error", message: data.error ?? "Failed to join waitlist." });
        return;
      }
      setState({ status: "success" });
    } catch (error) {
      setState({
        status: "error",
        message: error instanceof Error ? error.message : "Failed to join waitlist.",
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
        <div className="grid gap-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
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
              value={name}
              onChange={(e) => setName(e.target.value)}
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
              onChange={(e) => setPersona(e.target.value as Persona)}
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
            onChange={(e) => setWantsUpdates(e.target.checked)}
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
            {state.status === "submitting" ? "Joining…" : "Join Waitlist"}
          </Button>
        </div>
      </div>
    </form>
  );
}

