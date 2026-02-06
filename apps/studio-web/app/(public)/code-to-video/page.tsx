import type { Metadata } from "next";
import Link from "next/link";
import { PreviewEmbed } from "@/components/marketing/preview-embed";
import { Button } from "@/components/ui/button";
import { codeToHtml } from "shiki";

export const metadata: Metadata = {
  title: "Code to Video",
  description: "Write declarative XML and Babulus generates complete videos automatically—with AI voiceovers, automatic timing, and animated visuals.",
};

const exampleCode = `<videoml id="code-to-video-preview" title="Code to Video Preview" fps="30" width="1920" height="1080">
  <scene id="intro">
    <layer id="content">
      <title-slide
        props='{"eyebrow":"Code to Video","title":"Code Your Videos","subtitle":"(AI is really good at it!)","verticalAlign":"center","horizontalAlign":"center","entranceStartFrame":-999}'
      />
    </layer>
    <cue id="intro-vo">
      <voice>Write XML. Babulus builds the video.</voice>
    </cue>
  </scene>

  <scene id="code">
    <layer id="content">
      <bullet-list-screen
        props='{"eyebrow":"Pipeline","title":"Your code becomes a video","subtitle":"Scene structure + narration = render","bullets":{"items":["Write a few scenes","Add voiceover with cues","Babulus computes timing","Renderer outputs MP4"],"bulletStyle":"icon","bulletIcon":{"kind":"lucide","name":"check","size":44,"strokeWidth":3.2},"fontSize":48,"lineHeight":1.2,"spacing":24}}'
      />
    </layer>
    <cue id="code-vo">
      <voice>Scenes and narration become a finished render.</voice>
    </cue>
  </scene>
</videoml>`;

export default async function CodeToVideoPage() {
  const highlightedCode = await codeToHtml(exampleCode, {
    lang: "xml",
    theme: "github-dark",
  });

  return (
    <div className="flex flex-col min-h-screen">
      <section className="container py-12 md:py-16 lg:py-24">
        <div className="mx-auto max-w-[58rem] space-y-8">
          <div className="space-y-4 text-center">
            <h1 className="font-heading text-3xl leading-[1.1] sm:text-3xl md:text-6xl">
              Code to Video
            </h1>
            <p className="text-lg text-muted-foreground">
              Write declarative XML. Get complete videos with AI voiceovers, automatic timing, and animated visuals.
            </p>
          </div>

          {/* Video preview */}
          <div className="w-full pt-8">
            <PreviewEmbed
              id="code-to-video-preview"
              showControls
              showThemeControls
            />
          </div>

          {/* Explanation */}
          <div className="space-y-6 pt-8">
            <h2 className="font-heading text-2xl sm:text-3xl">
              This video was generated from this code:
            </h2>

            {/* Code block with syntax highlighting */}
            <div
              className="rounded-lg border overflow-hidden [&_pre]:!bg-[#0d1117] [&_pre]:!m-0 [&_pre]:p-6 [&_pre]:overflow-x-auto [&_code]:text-sm"
              dangerouslySetInnerHTML={{ __html: highlightedCode }}
            />

            {/* How it works explanation */}
            <div className="space-y-6 pt-6">
              <h2 className="font-heading text-2xl sm:text-3xl">
                Videos as source code
              </h2>

              <div className="space-y-4 text-muted-foreground leading-relaxed">
                <p>
                  Babulus turns declarative XML into complete videos. You write the structure you want—scenes, voiceover narration, visual styling, transitions—and the platform <strong className="text-foreground">automatically generates, times, and renders everything</strong>.
                </p>
                <p>
                  This isn't a video editor. It's a <strong className="text-foreground">compiler</strong> that takes code as input and produces MP4 files as output.
                </p>

                <h3 className="text-xl font-semibold text-foreground pt-4">
                  AI generates the audio
                </h3>
                <p>
                  Every <code className="text-sm bg-muted px-1.5 py-0.5 rounded">&lt;voice&gt;</code> element triggers AI audio generation. Babulus connects to services like ElevenLabs or OpenAI, synthesizes natural-sounding speech, and manages the audio files automatically.
                </p>
                <p>
                  Background music, sound effects, and ambient audio work the same way. Reference them in code, and Babulus handles retrieval, caching, and integration.
                </p>

                <h3 className="text-xl font-semibold text-foreground pt-4">
                  Timing is calculated automatically
                </h3>
                <p>
                  You never specify timestamps. Babulus analyzes the duration of generated audio clips and <strong className="text-foreground">calculates scene timing automatically</strong>. Change your narration, and everything adjusts—no manual recalculation needed.
                </p>
                <p>
                  Scenes transition based on actual audio length. Pauses respect the durations you specify in code. Visual animations synchronize with voiceover pacing. The system figures it out.
                </p>

                <h3 className="text-xl font-semibold text-foreground pt-4">
                  Visuals are React components
                </h3>
                <p>
                  Every visual element is an <strong className="text-foreground">animated React component</strong>. This gives you full access to CSS animations, responsive layouts, dynamic data visualization, and modern web development patterns—all rendered into video frames.
                </p>
                <p>
                  Better yet: <strong className="text-foreground">these components can live on web pages too</strong>. Build a chart animation for your video, then embed the same component in a blog post or interactive demo. The code is reusable everywhere.
                </p>

                <h3 className="text-xl font-semibold text-foreground pt-4">
                  Built for AI agents
                </h3>
                <p>
                  Code-as-video has a critical advantage: <strong className="text-foreground">AI agents work natively with code</strong>. Traditional video tools require AI to make dozens of API calls through human-centric interfaces—adding scenes, adjusting parameters, uploading assets, tweaking timing. Each operation is a separate action in a database-backed system.
                </p>
                <p>
                  With Babulus, an AI agent can <strong className="text-foreground">read, understand, and modify entire video productions</strong> in a single pass. It analyzes structure, refactors scenes, adjusts pacing, updates content, and generates variations by working directly with source code. The code <em>is</em> the video.
                </p>
                <p>
                  This means AI agents have first-class access to video production. They collaborate on video projects like they collaborate on software projects—with the same tools, workflows, and level of control. Code becomes the <strong className="text-foreground">single source of truth</strong> that both humans and AI can read, write, and reason about.
                </p>

                <h3 className="text-xl font-semibold text-foreground pt-4">
                  The full pipeline
                </h3>
                <p>
                  From code to MP4:
                </p>
                <ol className="list-decimal list-inside space-y-2 pl-4">
                  <li>Write or update your <code className="text-sm bg-muted px-1.5 py-0.5 rounded">.babulus.xml</code> file</li>
                  <li>Babulus parses the code and generates voiceover audio via AI</li>
                  <li>The timing engine calculates scene durations from audio lengths</li>
                  <li>React components render with synchronized animations</li>
                  <li>Everything composites into a final video file</li>
                </ol>
                <p className="pt-2">
                  Your video is now <strong className="text-foreground">version-controlled, reproducible, and programmable</strong>. Change the code, commit it, regenerate. No timeline editing required.
                </p>
              </div>

              {/* CTA */}
              <div className="flex flex-col items-center gap-4 pt-12 text-center">
                <p className="text-sm text-muted-foreground">
                  Ready to generate videos from code?
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
