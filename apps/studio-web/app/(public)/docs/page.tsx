import type { Metadata } from "next";
import Link from "next/link";
import { DocsShell } from "@/components/docs/docs-shell";
import { docsHref, listDocsByCategory } from "@/lib/docs-registry";

export const metadata: Metadata = {
  title: "Docs",
  description: "Product and technical documentation for Babulus.",
  openGraph: {
    title: "Docs",
    description: "Product and technical documentation for Babulus.",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Docs",
    description: "Product and technical documentation for Babulus.",
  },
};

export default function DocsLandingPage() {
  const sections = listDocsByCategory({ includeInternal: false });

  // Split sections into accessible and developer categories
  const accessibleCategories = ["Overview", "Guides"];
  const accessibleSections = sections.filter((s) =>
    accessibleCategories.includes(s.category)
  );
  const isRoadmapDoc = (slug: readonly string[]) => slug[0] === "roadmap";
  const designersSection = sections.find((s) => s.category === "Designers");
  const developerSections = sections.filter(
    (s) =>
      !accessibleCategories.includes(s.category) &&
      s.category !== "Designers" &&
      !s.docs.some((doc) => isRoadmapDoc(doc.slug)),
  );

  const standardsSection = developerSections.find((s) => s.category === "Standards");
  const devRefSection = developerSections.find((s) => s.category === "Developer Reference");
  const projectStorageSection = developerSections.find((s) => s.category === "Project Storage");
  const ttsSection = developerSections.find((s) => s.category === "TTS Providers");
  const renderingSection = developerSections.find((s) => s.category === "Rendering");
  const otherDevSections = developerSections.filter(
    (s) =>
      s.category !== "Standards" &&
      s.category !== "Developer Reference" &&
      s.category !== "Project Storage" &&
      s.category !== "TTS Providers" &&
      s.category !== "Rendering",
  );
  const roadmapSection = sections.find((s) =>
    s.docs.some((doc) => isRoadmapDoc(doc.slug)),
  );

  return (
    <DocsShell>
      <div className="space-y-8">
        <div className="rounded-2xl bg-card p-2">
          <div className="rounded-xl bg-background p-8 md:p-10">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-foreground/60">
              Documentation
            </p>
            <h1 className="mt-3 font-heading text-3xl md:text-5xl leading-[1.05] tracking-tight">
              How it works and how to use it.
            </h1>
            <p className="mt-4 max-w-[58ch] text-muted-foreground leading-7">
              Start with the introduction, skim the roadmap, or dive into technical details and
              configuration guides.
            </p>
            <p className="mt-4 max-w-[58ch] text-muted-foreground leading-7">
              In the Anthus Platform, Babulus is the media-output layer. It pairs with
              <a href="https://anth.us/platform/biblicus" className="font-semibold text-foreground hover:text-primary"> Biblicus</a>
              {" "}for corpus inputs, with
              <a href="https://anth.us/platform/videoml" className="font-semibold text-foreground hover:text-primary"> VideoML</a>
              {" "}for rendering, and with
              <a href="https://korpor.us" className="font-semibold text-foreground hover:text-primary"> Korporus</a>
              {" "}when the workflow needs a stable hosted shell.
            </p>
          </div>
        </div>

        {/* Main documentation (no header) */}
        <div className="grid gap-4 lg:grid-cols-2">
          {accessibleSections.map(({ category, docs }) => (
            <div key={category} className="rounded-2xl bg-card p-2">
              <div className="rounded-xl bg-background p-6">
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-foreground/60">
                  {category}
                </div>
                <div className="mt-4 space-y-3">
                  {docs.map((doc) => (
                    <Link
                      key={doc.slug.join("/")}
                      href={docsHref(doc)}
                      className="block rounded-xl bg-card p-4 transition-colors hover:bg-card/80"
                    >
                      <div className="font-semibold leading-snug">{doc.title}</div>
                      <div className="mt-1 text-sm text-muted-foreground leading-6">
                        {doc.description}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Designers section */}
        {designersSection ? (
          <div className="rounded-2xl bg-card p-2">
            <div className="rounded-xl bg-background p-6">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-foreground/60">
                Designers
              </div>
              <div className="mt-4 space-y-3">
                {[
                  ["components/layouts", "Layouts", "Standard screen layouts and composition building blocks."],
                  ["components/colors", "Color Schemes", "Radix-based palettes for light and dark modes."],
                  ["components/typography", "Typefaces", "Curated font pairings for different video moods."],
                  ["animation", "Animation", "Frame-driven motion across layout, data, generative art, 3D, and motion graphics."],
                  ["videoml/transitions", "Transitions", "Scene-to-scene motion, easing, and audio cues."],
                  ["components", "Components", "Off-the-shelf titles, overlays, callouts, and motion UI."],
                ].map(([slug, label, description]) => (
                  <Link
                    key={slug}
                    href={`/docs/${slug}`}
                    className="block rounded-xl bg-card p-4 transition-colors hover:bg-card/80"
                  >
                    <div className="font-semibold leading-snug">{label}</div>
                    <div className="mt-1 text-sm text-muted-foreground leading-6">
                      {description}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {/* Visual divider */}
        <div className="relative py-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border/50" />
          </div>
        </div>

        {/* Developer documentation section */}
        <div className="space-y-6">
          <div className="rounded-2xl bg-card p-2">
            <div className="rounded-xl bg-background p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-foreground/60">
                Developer Documentation
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Technical guides for setting up rendering, integrations, and infrastructure.
              </p>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-4">
              {standardsSection ? (
                <div className="rounded-2xl bg-card p-2">
                  <div className="rounded-xl bg-background p-6">
                    <div className="text-xs font-semibold uppercase tracking-[0.2em] text-foreground/60">
                      {standardsSection.category}
                    </div>
                    <div className="mt-4 space-y-3">
                      {standardsSection.docs.map((doc) => (
                        <Link
                          key={doc.slug.join("/")}
                          href={docsHref(doc)}
                          className="block rounded-xl bg-card p-4 transition-colors hover:bg-card/80"
                        >
                          <div className="font-semibold leading-snug">{doc.title}</div>
                          <div className="mt-1 text-sm text-muted-foreground leading-6">
                            {doc.description}
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}
              {devRefSection ? (
                <div className="rounded-2xl bg-card p-2">
                  <div className="rounded-xl bg-background p-6">
                    <div className="text-xs font-semibold uppercase tracking-[0.2em] text-foreground/60">
                      {devRefSection.category}
                    </div>
                    <div className="mt-4 space-y-3">
                      {devRefSection.docs.map((doc) => (
                        <Link
                          key={doc.slug.join("/")}
                          href={docsHref(doc)}
                          className="block rounded-xl bg-card p-4 transition-colors hover:bg-card/80"
                        >
                          <div className="font-semibold leading-snug">{doc.title}</div>
                          <div className="mt-1 text-sm text-muted-foreground leading-6">
                            {doc.description}
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}
              {projectStorageSection ? (
                <div className="rounded-2xl bg-card p-2">
                  <div className="rounded-xl bg-background p-6">
                    <div className="text-xs font-semibold uppercase tracking-[0.2em] text-foreground/60">
                      {projectStorageSection.category}
                    </div>
                    <div className="mt-4 space-y-3">
                      {projectStorageSection.docs.map((doc) => (
                        <Link
                          key={doc.slug.join("/")}
                          href={docsHref(doc)}
                          className="block rounded-xl bg-card p-4 transition-colors hover:bg-card/80"
                        >
                          <div className="font-semibold leading-snug">{doc.title}</div>
                          <div className="mt-1 text-sm text-muted-foreground leading-6">
                            {doc.description}
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}
              {otherDevSections.map((section) => (
                <div key={section.category} className="rounded-2xl bg-card p-2">
                  <div className="rounded-xl bg-background p-6">
                    <div className="text-xs font-semibold uppercase tracking-[0.2em] text-foreground/60">
                      {section.category}
                    </div>
                    <div className="mt-4 space-y-3">
                      {section.docs.map((doc) => (
                        <Link
                          key={doc.slug.join("/")}
                          href={docsHref(doc)}
                          className="block rounded-xl bg-card p-4 transition-colors hover:bg-card/80"
                        >
                          <div className="font-semibold leading-snug">{doc.title}</div>
                          <div className="mt-1 text-sm text-muted-foreground leading-6">
                            {doc.description}
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="space-y-4">
              {ttsSection ? (
                <div className="rounded-2xl bg-card p-2">
                  <div className="rounded-xl bg-background p-6">
                    <div className="text-xs font-semibold uppercase tracking-[0.2em] text-foreground/60">
                      {ttsSection.category}
                    </div>
                    <div className="mt-4 space-y-3">
                      {ttsSection.docs.map((doc) => (
                        <Link
                          key={doc.slug.join("/")}
                          href={docsHref(doc)}
                          className="block rounded-xl bg-card p-4 transition-colors hover:bg-card/80"
                        >
                          <div className="font-semibold leading-snug">{doc.title}</div>
                          <div className="mt-1 text-sm text-muted-foreground leading-6">
                            {doc.description}
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}
              {renderingSection ? (
                <div className="rounded-2xl bg-card p-2">
                  <div className="rounded-xl bg-background p-6">
                    <div className="text-xs font-semibold uppercase tracking-[0.2em] text-foreground/60">
                      {renderingSection.category}
                    </div>
                    <div className="mt-4 space-y-3">
                      {renderingSection.docs.map((doc) => (
                        <Link
                          key={doc.slug.join("/")}
                          href={docsHref(doc)}
                          className="block rounded-xl bg-card p-4 transition-colors hover:bg-card/80"
                        >
                          <div className="font-semibold leading-snug">{doc.title}</div>
                          <div className="mt-1 text-sm text-muted-foreground leading-6">
                            {doc.description}
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {roadmapSection ? (
          <div className="rounded-2xl bg-card p-2">
            <div className="rounded-xl bg-background p-6">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-foreground/60">
                Roadmap
              </div>
              <div className="mt-4 space-y-3">
                {roadmapSection.docs.map((doc) => (
                  <Link
                    key={doc.slug.join("/")}
                    href={docsHref(doc)}
                    className="block rounded-xl bg-card p-4 transition-colors hover:bg-card/80"
                  >
                    <div className="font-semibold leading-snug">{doc.title}</div>
                    <div className="mt-1 text-sm text-muted-foreground leading-6">
                      {doc.description}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </DocsShell>
  );
}
