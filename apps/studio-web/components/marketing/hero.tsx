import Link from "next/link";
import { MonitorPlay } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Hero() {
  return (
    <section className="space-y-6 pb-8 pt-6 md:pb-12 md:pt-10 lg:py-32">
      <div className="container flex max-w-[64rem] flex-col items-center gap-4 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-foreground/60">
          Publish on schedule, without the busywork
        </p>
        <h1 className="font-heading text-3xl sm:text-5xl md:text-6xl lg:text-7xl">
          Videos produced for you, not by you.
        </h1>
        <p className="max-w-[42rem] leading-normal text-muted-foreground sm:text-xl sm:leading-8">
          Babulus runs the research, scripting, and production loop so you can publish
          consistently without being the bottleneck. Use the cloud app, sync local folders,
          or take everything with you.
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

        <div className="w-full max-w-[56rem] pt-8">
          <div className="rounded-2xl bg-card p-2">
            <div className="rounded-xl bg-background p-3">
              <div className="aspect-video w-full rounded-xl bg-muted flex items-center justify-center">
                <div className="flex items-center gap-3 text-foreground/70">
                  <div className="h-10 w-10 rounded-full bg-background flex items-center justify-center">
                    <MonitorPlay className="h-5 w-5" />
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-semibold leading-5">Video preview</div>
                    <div className="text-xs text-muted-foreground leading-5">Coming soon</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
