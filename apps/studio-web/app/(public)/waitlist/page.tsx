import Link from "next/link";
import { WaitlistForm } from "@/components/marketing/waitlist-form";
import { WaitlistExpectations } from "@/components/marketing/waitlist-expectations";

export default function WaitlistPage() {
  return (
    <div className="container py-10 md:py-16">
      <div className="mx-auto grid max-w-5xl gap-10 md:grid-cols-2 md:gap-12">
        <div className="space-y-5">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-foreground/60">
            Early access
          </p>
          <h1 className="font-heading text-4xl leading-[1.05] md:text-6xl">
            Put video marketing on autopilot.
          </h1>
          <p className="text-muted-foreground md:text-lg">
            Babulus turns “a little guidance” into an ongoing stream of publish-ready videos—then
            distributes them across your channels. You stay in control with lightweight approvals.
          </p>

          <div className="space-y-3 rounded-2xl bg-recess p-6">
            <h2 className="font-heading text-2xl">What you get</h2>
            <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
              <li>Automated research → scripts → storyboards → renders</li>
              <li>Fine-grained approvals so you only review what matters</li>
              <li>Multi-channel publishing with “campaign” style automation</li>
              <li>Unlimited translations: voiceover and on-screen text (not just audio)</li>
              <li>No vendor lock-in: exportable projects, run cloud or local</li>
            </ul>
          </div>

          <p className="text-sm text-muted-foreground">
            Prefer to learn first?{" "}
            <Link href="/" className="text-foreground/80 underline underline-offset-4">
              See how it works
            </Link>
            .
          </p>
        </div>

        <div className="space-y-4">
          <WaitlistForm source="waitlist-page" />
          <div className="rounded-2xl bg-recess p-6">
            <WaitlistExpectations />
          </div>
          <p className="text-xs text-muted-foreground">
            Read our{" "}
            <Link href="/privacy" className="underline underline-offset-4">
              Privacy
            </Link>{" "}
            and{" "}
            <Link href="/terms" className="underline underline-offset-4">
              Terms
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
