import type { Metadata } from "next";
import Link from "next/link";
import { Languages, Sparkles, ShieldCheck, Globe, Type, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FeatureCard } from "@/components/marketing/feature-grid";

export const metadata: Metadata = {
  title: "Translations",
  description: "AI-powered video translations that go beyond voiceover—translate on-screen text, captions, and visual elements automatically.",
};

export default function TranslationsPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <section className="container py-12 md:py-16 lg:py-24">
        <div className="mx-auto max-w-[58rem] space-y-8">
          <div className="space-y-4 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-foreground/60">
              Global reach
            </p>
            <h1 className="font-heading text-3xl leading-[1.1] sm:text-3xl md:text-6xl">
              Unlimited translations—voice and on-screen.
            </h1>
            <p className="text-lg text-muted-foreground max-w-[85%] mx-auto">
              Unlike voice-only translation tools, Babulus is designed to translate the full video: captions, on-screen text, and voiceover—so your message stays consistent in every language.
            </p>
          </div>

          {/* Core features */}
          <div className="mx-auto grid justify-center gap-4 sm:grid-cols-2 md:grid-cols-3 pt-8">
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

          {/* Detailed explanation */}
          <div className="space-y-6 pt-12">
            <h2 className="font-heading text-2xl sm:text-3xl">
              Beyond voice-only translation
            </h2>

            <div className="space-y-4 text-muted-foreground leading-relaxed">
              <p>
                Most AI translation tools focus exclusively on dubbing audio—replacing the voiceover in one language with another. But professional videos contain far more than just spoken words. <strong className="text-foreground">On-screen text, captions, lower thirds, callouts, and visual annotations</strong> are critical parts of the message.
              </p>
              <p>
                Babulus translates <strong className="text-foreground">the entire video</strong>, not just the audio track. Because your video is defined in code with React components, the platform can intelligently identify, extract, and translate all text elements—then re-render the video with properly localized visuals.
              </p>

              <h3 className="text-xl font-semibold text-foreground pt-4">
                How AI-powered translation works
              </h3>
              <p>
                When you request a translation, Babulus:
              </p>
              <ol className="list-decimal list-inside space-y-2 pl-4">
                <li>Analyzes the source <code className="text-sm bg-muted px-1.5 py-0.5 rounded">.babulus.ts</code> file to extract all text content</li>
                <li>Uses AI translation models to convert the script, captions, and on-screen text into the target language</li>
                <li>Generates new voiceover audio in the target language using text-to-speech services</li>
                <li>Updates all React components with translated text and re-renders the visuals</li>
                <li>Recalculates timing based on the new audio duration (different languages have different pacing)</li>
                <li>Outputs a complete localized video with both translated audio and visuals</li>
              </ol>

              <h3 className="text-xl font-semibold text-foreground pt-4">
                Maintaining brand consistency
              </h3>
              <p>
                Translation isn't just about converting words—it's about <strong className="text-foreground">preserving meaning and brand voice</strong>. Babulus allows you to define translation glossaries and style guides so that product names, technical terms, and brand language remain consistent across all language variants.
              </p>
              <p>
                Because everything is code-based, you can version-control your translation preferences and apply them automatically to every video. Update your glossary once, and all future translations incorporate the changes.
              </p>

              <h3 className="text-xl font-semibold text-foreground pt-4">
                Built-in, not bolted-on
              </h3>
              <p>
                Translation isn't an afterthought or a premium add-on in Babulus—it's a <strong className="text-foreground">core feature of the platform</strong>. Because the system is designed around code and AI from the start, generating translations is as simple as requesting a new render in a different language.
              </p>
              <p>
                You don't need to export files, upload them to third-party services, manually sync timing adjustments, or re-edit on-screen text. The entire translation pipeline is automated and integrated directly into the video production workflow.
              </p>

              <h3 className="text-xl font-semibold text-foreground pt-4">
                Unlimited languages, unlimited scale
              </h3>
              <p>
                Want to publish your content in 5 languages? 20 languages? With traditional video production, each language variant multiplies your workload. With Babulus, <strong className="text-foreground">translation scales automatically</strong>.
              </p>
              <p>
                Generate a single source video, specify your target languages, and let the platform handle the rest. Every language gets professionally translated voiceover, properly localized on-screen text, and accurate timing—without manual intervention.
              </p>

              <div className="bg-muted/50 border rounded-lg p-6 mt-8">
                <h4 className="font-semibold text-foreground mb-2">Example: Multi-language product launch</h4>
                <p className="text-sm">
                  A SaaS company uses Babulus to create a product demo video in English. With a single command, they generate translations in Spanish, French, German, Japanese, and Korean. Each version includes localized voiceover, translated UI callouts, and region-specific examples—ready to publish on regional landing pages and social channels. Total time: minutes, not weeks.
                </p>
              </div>
            </div>

            {/* CTA */}
            <div className="flex flex-col items-center gap-4 pt-12 text-center">
              <p className="text-sm text-muted-foreground">
                Ready to reach a global audience?
              </p>
              <Link href="/waitlist">
                <Button size="lg">Join waitlist</Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
