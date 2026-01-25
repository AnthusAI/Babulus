import Link from "next/link";
import { Button } from "@/components/ui/button";

export function Hero() {
  return (
    <section className="space-y-6 pb-8 pt-6 md:pb-12 md:pt-10 lg:py-32">
      <div className="container flex max-w-[64rem] flex-col items-center gap-4 text-center">
        <Link
          href="https://twitter.com/babulus_ai"
          className="rounded-2xl bg-muted px-4 py-1.5 text-sm font-medium"
          target="_blank"
        >
          Follow along on Twitter
        </Link>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-foreground/60">
          Studio-grade automation for video marketing
        </p>
        <h1 className="font-heading text-3xl sm:text-5xl md:text-6xl lg:text-7xl">
          The Studio-Grade AI Video Factory
        </h1>
        <p className="max-w-[42rem] leading-normal text-muted-foreground sm:text-xl sm:leading-8">
          A pipeline that turns research into publish-ready video—on schedule, on brand,
          and fully portable. Use the cloud app, sync local folders, or take everything with you.
        </p>
        <div className="space-x-4">
          <Link href="/waitlist">
            <Button size="lg">Join waitlist</Button>
          </Link>
          <Link href="#how-it-works">
            <Button variant="outline" size="lg">
              See How It Works
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
