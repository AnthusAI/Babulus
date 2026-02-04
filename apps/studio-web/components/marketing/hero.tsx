import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PreviewEmbed } from "@/components/marketing/preview-embed";

export function Hero() {
  return (
    <section className="space-y-6 pb-8 pt-6 md:pb-12 md:pt-10 lg:py-32">
      <div className="container flex max-w-[64rem] flex-col items-center gap-4 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-foreground/60">
          Videos produced for you, not by you.
        </p>
        <h1 className="font-heading text-3xl sm:text-5xl md:text-6xl lg:text-7xl">
          Your AI Video CMS
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
          <Link href="/code-to-video">
            <Button variant="outline" size="lg">
              Code to Video
            </Button>
          </Link>
        </div>

        <div className="w-full max-w-[56rem] pt-8">
            <PreviewEmbed id="home-elevator-preview" showControls />
        </div>
      </div>
    </section>
  );
}
