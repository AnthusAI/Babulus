import { Hero } from "@/components/marketing/hero";
import { FeatureGrid, FeatureCard } from "@/components/marketing/feature-grid";
import { CodeReveal } from "@/components/marketing/code-reveal";
import {
  Bot,
  Lock,
  Share2,
  Code2,
  Sparkles,
  Zap,
  Terminal,
  Layers,
  Unlock,
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Hero />

      {/* Feature: Agent-based Research */}
      <section
        id="features"
        className="container space-y-6 bg-slate-50 py-8 dark:bg-transparent md:py-12 lg:py-24"
      >
        <div className="mx-auto flex max-w-[58rem] flex-col items-center space-y-4 text-center">
          <h2 className="font-heading text-3xl leading-[1.1] sm:text-3xl md:text-6xl">
            Never Miss a Trend
          </h2>
          <p className="max-w-[85%] leading-normal text-muted-foreground sm:text-lg sm:leading-7">
            Babulus agents monitor the web 24/7 for topics relevant to your
            brand. They research, summarize, and queue up content ideas so you
            don't have to.
          </p>
        </div>
        <div className="mx-auto grid justify-center gap-4 sm:grid-cols-2 md:max-w-[64rem] md:grid-cols-3">
          <FeatureCard
            title="Continuous Monitoring"
            description="Agents watch X, News, and RSS feeds for your keywords."
            icon={<Bot className="h-10 w-10 text-primary" />}
          />
          <FeatureCard
            title="Smart Summarization"
            description="LLMs digest long-form content into video-ready scripts."
            icon={<Sparkles className="h-10 w-10 text-primary" />}
          />
          <FeatureCard
            title="Auto-Queue"
            description="Approved topics are automatically converted to storyboards."
            icon={<Zap className="h-10 w-10 text-primary" />}
          />
        </div>
      </section>

      {/* Feature: The Studio & Code Reveal */}
      <section className="container py-8 md:py-12 lg:py-24">
        <div className="mx-auto flex max-w-[58rem] flex-col items-center space-y-4 text-center mb-12">
          <h2 className="font-heading text-3xl leading-[1.1] sm:text-3xl md:text-6xl">
            Code is the Best Interface
          </h2>
          <p className="max-w-[85%] leading-normal text-muted-foreground sm:text-lg sm:leading-7">
            No-code tools hit a wall when complexity scales. Babulus uses
            TypeScript as the universal language for collaboration between you
            and your AI agents.
          </p>
        </div>
        <CodeReveal />
        <div className="mx-auto mt-12 grid justify-center gap-4 sm:grid-cols-2 md:max-w-[64rem] md:grid-cols-3">
          <FeatureCard
            title="Everything as Code"
            description="Your video is a TypeScript file. Version control, diffs, and PRs come standard."
            icon={<Code2 className="h-10 w-10 text-primary" />}
          />
          <FeatureCard
            title="Agent Collaboration"
            description="Agents can write code better than they can drag-and-drop. Work side-by-side."
            icon={<Terminal className="h-10 w-10 text-primary" />}
          />
          <FeatureCard
            title="Precision Control"
            description="Tweak every frame, every pixel, every audio cue with code-level precision."
            icon={<Layers className="h-10 w-10 text-primary" />}
          />
        </div>
      </section>

      {/* Feature: No Vendor Lock-in */}
      <section className="container space-y-6 bg-slate-50 py-8 dark:bg-transparent md:py-12 lg:py-24">
        <div className="mx-auto flex max-w-[58rem] flex-col items-center space-y-4 text-center">
          <h2 className="font-heading text-3xl leading-[1.1] sm:text-3xl md:text-6xl">
            Your Content. Your Keys.
          </h2>
          <p className="max-w-[85%] leading-normal text-muted-foreground sm:text-lg sm:leading-7">
            Don't get locked into "magic" black boxes like HeyGen, Synthesia, or
            D-ID. With Babulus, you own the source code and the rendering
            pipeline.
          </p>
        </div>
        <div className="mx-auto grid justify-center gap-4 sm:grid-cols-2 md:max-w-[64rem]">
          <div className="relative overflow-hidden rounded-lg border bg-background p-2">
            <div className="flex h-[180px] flex-col justify-between rounded-md p-6">
              <Lock className="h-10 w-10 text-muted-foreground" />
              <div className="space-y-2">
                <h3 className="font-bold text-muted-foreground">The Others</h3>
                <p className="text-sm text-muted-foreground">
                  Proprietary avatars. Closed ecosystem. If you stop paying, you
                  lose your project files.
                </p>
              </div>
            </div>
          </div>
          <div className="relative overflow-hidden rounded-lg border bg-background p-2">
            <div className="flex h-[180px] flex-col justify-between rounded-md p-6">
              <Unlock className="h-10 w-10 text-primary" />
              <div className="space-y-2">
                <h3 className="font-bold">Babulus</h3>
                <p className="text-sm text-muted-foreground">
                  Open source DSL. Bring your own API keys. Export to standard
                  formats. Run locally or in the cloud.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature: Broadcasting */}
      <section className="container py-8 md:py-12 lg:py-24">
        <div className="mx-auto flex max-w-[58rem] flex-col items-center space-y-4 text-center">
          <h2 className="font-heading text-3xl leading-[1.1] sm:text-3xl md:text-6xl">
            Publish Everywhere
          </h2>
          <p className="max-w-[85%] leading-normal text-muted-foreground sm:text-lg sm:leading-7">
            Connect your accounts and let Babulus handle the distribution.
          </p>
        </div>
        <div className="mx-auto grid justify-center gap-4 sm:grid-cols-3 md:max-w-[64rem]">
          <FeatureCard
            title="YouTube"
            description="Auto-upload with optimized titles, descriptions, and tags."
            icon={<Share2 className="h-10 w-10 text-red-600" />}
          />
          <FeatureCard
            title="X / Twitter"
            description="Post video clips directly to your feed to drive engagement."
            icon={<Share2 className="h-10 w-10 text-black dark:text-white" />}
          />
          <FeatureCard
            title="TikTok / Reels"
            description="Vertical format support for short-form video platforms."
            icon={<Share2 className="h-10 w-10 text-pink-500" />}
          />
        </div>
      </section>
    </div>
  );
}
