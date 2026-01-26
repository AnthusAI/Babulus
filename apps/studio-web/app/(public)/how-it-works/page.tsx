import type { Metadata } from "next";
import Link from "next/link";
import { MonitorPlay } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "How it works",
  description: "Learn how Babulus generates videos automatically from TypeScript code using AI-powered audio generation and animated React components.",
};

export default function HowItWorksPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <section className="container py-12 md:py-16 lg:py-24">
        <div className="mx-auto max-w-[58rem] space-y-8">
          <div className="space-y-4 text-center">
            <h1 className="font-heading text-3xl leading-[1.1] sm:text-3xl md:text-6xl">
              How it works
            </h1>
            <p className="text-lg text-muted-foreground">
              Videos generated automatically from code—with AI-powered audio, automatic timing, and animated React components.
            </p>
          </div>

          {/* Video placeholder */}
          <div className="w-full pt-8">
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

          {/* Explanation */}
          <div className="space-y-6 pt-8">
            <h2 className="font-heading text-2xl sm:text-3xl">
              This video was generated automatically from this code:
            </h2>

            {/* Code block */}
            <div className="rounded-lg border bg-muted/50">
              <pre className="overflow-x-auto p-6">
                <code className="text-sm">
{`import { defineVideo } from "babulus";

export default defineVideo((video) => {
  video.composition("Introduction to Babulus", (composition) => {
    composition.meta({ fps: 30, width: 1280, height: 720 });
    composition.posterTime(2);
    composition.voiceover({ provider: "elevenlabs", leadInSeconds: 0.5 });

    composition.scene("Welcome", (scene) => {
      scene.markup({
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        textAlign: "center",
        titleColor: "#ffffff",
        titleSize: 56,
      });

      scene.cue("Opening", (cue) => {
        cue.voice((voice) => {
          voice.say("Welcome to Babulus, the AI-powered video creation platform.");
          voice.pause(0.4);
          voice.say("Create professional videos using code, with automatic voiceovers and scene composition.");
        });
      });
    });

    composition.scene("Key Features", (scene) => {
      scene.markup({
        background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
        titleColor: "#ffffff",
        titleSize: 48,
      });

      scene.cue("Power of TypeScript", (cue) => {
        cue.voice((voice) => {
          voice.say("Babulus combines the power of TypeScript with AI to streamline video production.");
          voice.pause(0.3);
          voice.say("Write your video content as code, and we handle voiceover generation, timing, and rendering.");
        });
      });
    });
  });
});`}
                </code>
              </pre>
            </div>

            {/* How it works explanation */}
            <div className="space-y-6 pt-6">
              <h2 className="font-heading text-2xl sm:text-3xl">
                A machine that makes videos from source code
              </h2>

              <div className="space-y-4 text-muted-foreground leading-relaxed">
                <p>
                  Babulus is fundamentally different from traditional video editing tools. Instead of manually arranging clips on a timeline, you <strong className="text-foreground">describe your video in TypeScript code</strong>. The platform then orchestrates the entire production pipeline automatically.
                </p>

                <h3 className="text-xl font-semibold text-foreground pt-4">
                  AI-powered audio generation
                </h3>
                <p>
                  When you call <code className="text-sm bg-muted px-1.5 py-0.5 rounded">voice.say()</code>, Babulus automatically connects to audio generation services like ElevenLabs or OpenAI to synthesize natural-sounding voiceovers. The platform handles the API calls, audio file management, and caching behind the scenes.
                </p>
                <p>
                  Background music and sound effects work the same way—you reference them in your code, and Babulus retrieves and integrates them into your video automatically.
                </p>

                <h3 className="text-xl font-semibold text-foreground pt-4">
                  Automatic timing and synchronization
                </h3>
                <p>
                  The render engine analyzes the duration of each generated audio clip and <strong className="text-foreground">automatically calculates the timing</strong> for every scene and transition. You don't specify timestamps manually—the system figures out when each element should appear based on the actual length of your voiceover, pauses, and music.
                </p>
                <p>
                  This means you can iterate on your script without recalculating timings. Change the narration, and everything adjusts automatically.
                </p>

                <h3 className="text-xl font-semibold text-foreground pt-4">
                  Animated React components
                </h3>
                <p>
                  Visual elements in Babulus videos are <strong className="text-foreground">animated React components</strong>. This gives you the full power of modern web development—CSS animations, responsive layouts, dynamic data visualization—all rendered into your video.
                </p>
                <p>
                  Even better: <strong className="text-foreground">these same components can be published on web pages</strong> associated with your videos. Build your visuals once, and use them everywhere—in the video itself, on landing pages, in interactive demos, or embedded in blog posts.
                </p>

                <h3 className="text-xl font-semibold text-foreground pt-4">
                  From code to video
                </h3>
                <p>
                  The entire process happens automatically:
                </p>
                <ol className="list-decimal list-inside space-y-2 pl-4">
                  <li>You write or update your <code className="text-sm bg-muted px-1.5 py-0.5 rounded">.babulus.ts</code> file</li>
                  <li>Babulus parses your code and generates voiceover audio via AI services</li>
                  <li>The timing engine calculates scene durations based on audio lengths</li>
                  <li>React components are rendered with proper animations and transitions</li>
                  <li>Everything is composited into a final video file</li>
                </ol>
                <p className="pt-2">
                  Because it's all code, your video becomes <strong className="text-foreground">version-controlled, reproducible, and programmable</strong>. Make a change, commit it, and regenerate. No manual timeline editing required.
                </p>
              </div>

              {/* CTA */}
              <div className="flex flex-col items-center gap-4 pt-12 text-center">
                <p className="text-sm text-muted-foreground">
                  Ready to create videos from code?
                </p>
                <Link href="/waitlist">
                  <Button size="lg">Join waitlist</Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
