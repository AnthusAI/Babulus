import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PreviewEmbed } from "@/components/marketing/preview-embed";

export function Hero() {
  return (
    <section className="space-y-6 pb-8 pt-6 md:pb-12 md:pt-10 lg:py-32">
      <div className="container flex max-w-[80rem] flex-col items-center gap-4 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-foreground/60">
          Always-on, on-brand video messaging.
        </p>
        <h1 className="font-heading text-3xl sm:text-5xl md:text-6xl lg:text-7xl">
          Your agent-driven video broadcaster
        </h1>
        <p className="max-w-[42rem] leading-normal text-muted-foreground sm:text-xl sm:leading-8">
          AI agents write scene-by-scene scripts and render on-brand videos with voiceover and motion graphics,
          including per-contact personalization when you want it. Not black-box “generated video” like Sora or Veo.
          Everything exports as portable VideoML (VML) projects you can run anywhere with the reference renderer—no vendor lock-in.
        </p>
        <div className="space-x-4">
          <Link href="/waitlist">
            <Button size="lg">Join waitlist</Button>
          </Link>
          <Link href="/docs/introduction">
            <Button variant="outline" size="lg">
              What is VideoML?
            </Button>
          </Link>
        </div>

        <div className="w-full max-w-[80rem] pt-8">
          <PreviewEmbed id="home-intro-preview" showControls />
        </div>
      </div>
    </section>
  );
}
