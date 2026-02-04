import type { Metadata } from "next";
import { Hero } from "@/components/marketing/hero";
import { FeatureCard } from "@/components/marketing/feature-grid";
import { CodeReveal } from "@/components/marketing/code-reveal";
import {
  Bot,
  Share2,
  Sparkles,
  Zap,
  ShieldCheck,
  Languages,
  Lock,
  Unlock,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { WaitlistExpectations } from "@/components/marketing/waitlist-expectations";
import { PreviewEmbed } from "@/components/marketing/preview-embed";

export const metadata: Metadata = {
  title: {
    absolute: "Babulus: AI Video CMS",
  },
  description: "Your AI Video CMS for automated research, scripting, rendering, and publishing.",
  openGraph: {
    title: "Babulus: AI Video CMS",
    description: "Your AI Video CMS for automated research, scripting, rendering, and publishing.",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Babulus: AI Video CMS",
    description: "Your AI Video CMS for automated research, scripting, rendering, and publishing.",
  },
};

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Hero />

      {/* Workflow overview */}
      <section id="workflow" className="bg-recess py-12 md:py-16 lg:py-24">
        <div className="container space-y-6">
          <div className="mx-auto flex max-w-[58rem] flex-col items-center space-y-4 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-foreground/60">
              How it works
            </p>
            <h2 className="font-heading text-3xl leading-[1.1] sm:text-3xl md:text-6xl">
              A video pipeline that only needs your approvals.
            </h2>
            <p className="max-w-[85%] leading-normal text-muted-foreground sm:text-lg sm:leading-7">
              Babulus runs asynchronously: it researches topics, drafts scripts, builds storyboards,
              renders videos, and queues publishing—then asks you for lightweight guidance at the right moments.
            </p>
          </div>

          <div className="mx-auto grid justify-center gap-4 sm:grid-cols-2 md:max-w-[64rem] md:grid-cols-3">
            <FeatureCard
              title="Research & Ideas"
              description="Agents monitor the web and propose topics tailored to your brand."
              icon={<Bot className="h-10 w-10 text-primary" />}
            />
            <FeatureCard
              title="Script & Storyboard"
              description="Drafts become structured storyboards so reviews are fast and consistent."
              icon={<Sparkles className="h-10 w-10 text-primary" />}
            />
            <FeatureCard
              title="Render & Publish"
              description="Generate videos and distribute across channels—with an approval gate."
              icon={<Zap className="h-10 w-10 text-primary" />}
            />
          </div>

          <div className="mx-auto flex max-w-[58rem] flex-col items-center gap-3 text-center">
            <p className="text-sm text-muted-foreground">
              Want early access? Join the waitlist for launch invites and progress updates.
            </p>
            <Link href="/waitlist">
              <Button size="lg">Join waitlist</Button>
            </Link>
            <div className="pt-4">
              <WaitlistExpectations compact />
            </div>
          </div>
        </div>
      </section>

      {/* Feature: Broadcasting */}
      <section className="container py-12 md:py-16 lg:py-24">
        <div className="mx-auto flex max-w-[58rem] flex-col items-center space-y-4 text-center mb-12">
          <h2 className="font-heading text-3xl leading-[1.1] sm:text-3xl md:text-6xl">
            Publish Everywhere
          </h2>
          <p className="max-w-[85%] leading-normal text-muted-foreground sm:text-lg sm:leading-7">
            Connect your accounts and let Babulus handle distribution—without turning your content into a locked
            black box.
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
            description="Post clips to your feed to drive engagement."
            icon={<Share2 className="h-10 w-10 text-foreground" />}
          />
          <FeatureCard
            title="TikTok / Reels"
            description="Vertical format support for short-form platforms."
            icon={<Share2 className="h-10 w-10 text-pink-500" />}
          />
        </div>
      </section>

      {/* Feature: Translation */}
      <section id="translations" className="bg-recess py-12 md:py-16 lg:py-24">
        <div className="container space-y-6">
          <div className="mx-auto flex max-w-[58rem] flex-col items-center space-y-4 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-foreground/60">
              Global reach
            </p>
            <h2 className="font-heading text-3xl leading-[1.1] sm:text-3xl md:text-6xl">
              Unlimited translations—voice and on-screen.
            </h2>
            <p className="max-w-[85%] leading-normal text-muted-foreground sm:text-lg sm:leading-7">
              Unlike voice-only translation tools, Babulus is designed to translate the full video:
              captions, on-screen text, and voiceover—so your message stays consistent in every language.
            </p>
          </div>
          <div className="mx-auto grid justify-center gap-4 sm:grid-cols-2 md:max-w-[64rem] md:grid-cols-3">
            <FeatureCard
              title="On-screen text"
              description="Translate lower thirds, callouts, captions, and UI-like overlays."
              icon={<Languages className="h-10 w-10 text-primary" />}
            />
            <FeatureCard
              title="Voiceover"
              description="Generate localized narration while preserving pacing and tone."
              icon={<Sparkles className="h-10 w-10 text-primary" />}
            />
            <FeatureCard
              title="Consistency"
              description="Keep brand terms and product language aligned across every variant."
              icon={<ShieldCheck className="h-10 w-10 text-primary" />}
            />
          </div>
        </div>
      </section>

      {/* Feature: No Vendor Lock-in */}
      <section className="bg-recess py-12 md:py-16 lg:py-24">
        <div className="container space-y-6">
          <div className="mx-auto flex max-w-[58rem] flex-col items-center space-y-4 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-foreground/60">
              Ownership
            </p>
            <h2 className="font-heading text-3xl leading-[1.1] sm:text-3xl md:text-6xl">
              Your content. Your keys.
            </h2>
            <p className="max-w-[85%] leading-normal text-muted-foreground sm:text-lg sm:leading-7">
              Don’t get locked into “magic” platforms like HeyGen, Synthesia, or D-ID. With Babulus, you can
              export projects, run locally, and plug rendered outputs into your own publishing system.
            </p>
          </div>
          <div className="mx-auto grid justify-center gap-4 sm:grid-cols-2 md:max-w-[64rem]">
            <div className="relative overflow-hidden rounded-xl bg-card p-2">
              <div className="flex h-[180px] flex-col justify-between rounded-lg bg-background p-6">
                <Lock className="h-10 w-10 text-muted-foreground" />
                <div className="space-y-2">
                  <h3 className="font-bold text-muted-foreground">Closed platforms</h3>
                  <p className="text-sm text-muted-foreground">
                    Proprietary pipelines. Limited control. If you stop paying, you risk losing access to your
                    workflow.
                  </p>
                </div>
              </div>
            </div>
            <div className="relative overflow-hidden rounded-xl bg-card p-2">
              <div className="flex h-[180px] flex-col justify-between rounded-lg bg-background p-6">
                <Unlock className="h-10 w-10 text-primary" />
                <div className="space-y-2">
                  <h3 className="font-bold">Babulus</h3>
                  <p className="text-sm text-muted-foreground">
                    Portable projects. Bring your own keys. Cloud + local workflows. API-level access to outputs.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Control (optional) */}
      <section id="control" className="container py-12 md:py-16 lg:py-24">
        <div className="mx-auto flex max-w-[58rem] flex-col items-center space-y-4 text-center mb-12">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-foreground/60">
            Optional depth
          </p>
          <h2 className="font-heading text-3xl leading-[1.1] sm:text-3xl md:text-6xl">
            Open the hood when you want.
          </h2>
          <p className="max-w-[85%] leading-normal text-muted-foreground sm:text-lg sm:leading-7">
            You can use Babulus without writing code. But when you need more control, the system is designed to
            be inspectable and portable—so you’re never stuck waiting on a vendor.
          </p>
        </div>
        <CodeReveal />
        <div className="mx-auto mt-10 flex max-w-[58rem] flex-col items-center gap-3 text-center">
          <p className="text-sm text-muted-foreground">
            Ready to see what this could do for your team?
          </p>
          <Link href="/waitlist">
            <Button size="lg">Join waitlist</Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
