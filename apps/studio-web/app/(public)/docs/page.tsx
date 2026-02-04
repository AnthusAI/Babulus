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
  const accessibleCategories = ["Overview"];
  const accessibleSections = sections.filter((s) =>
    accessibleCategories.includes(s.category)
  );
  const developerSections = sections.filter((s) => !accessibleCategories.includes(s.category));
  const isThemeSlug = (slug: readonly string[]) =>
    slug[0] === "components" &&
    (slug[1] === "layouts" || slug[1] === "typography" || slug[1] === "colors");
  const filteredDeveloperSections = developerSections
    .map((section) => ({
      ...section,
      docs: section.docs.filter((doc) => !isThemeSlug(doc.slug)),
    }))
    .filter((section) => section.docs.length);

  const devRefSection = filteredDeveloperSections.find((s) => s.category === "Developer Reference");
  const projectStorageSection = filteredDeveloperSections.find((s) => s.category === "Project Storage");
  const ttsSection = filteredDeveloperSections.find((s) => s.category === "TTS Providers");
  const renderingSection = filteredDeveloperSections.find((s) => s.category === "Rendering");
  const otherDevSections = filteredDeveloperSections.filter(
    (s) =>
      s.category !== "Developer Reference" &&
      s.category !== "Project Storage" &&
      s.category !== "TTS Providers" &&
      s.category !== "Rendering",
  );
  const roadmapSection = sections.find((s) => s.category === "Roadmap");

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
          </div>
        </div>

        {/* Accessible content section (no header) */}
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
          <div className="rounded-2xl bg-card p-2">
            <div className="rounded-xl bg-background p-6">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-foreground/60">
                Themes
              </div>
              <div className="mt-4 space-y-3">
                <Link
                  href="/docs/components/layouts"
                  className="block rounded-xl bg-card p-4 transition-colors hover:bg-card/80"
                >
                  <div className="font-semibold leading-snug">Layouts</div>
                  <div className="mt-1 text-sm text-muted-foreground leading-6">
                    Standard screen layouts and composition building blocks.
                  </div>
                </Link>
                <Link
                  href="/docs/components/typography"
                  className="block rounded-xl bg-card p-4 transition-colors hover:bg-card/80"
                >
                  <div className="font-semibold leading-snug">Typography Schemes</div>
                  <div className="mt-1 text-sm text-muted-foreground leading-6">
                    Curated font pairings for different video moods.
                  </div>
                </Link>
                <Link
                  href="/docs/components/colors"
                  className="block rounded-xl bg-card p-4 transition-colors hover:bg-card/80"
                >
                  <div className="font-semibold leading-snug">Color Schemes</div>
                  <div className="mt-1 text-sm text-muted-foreground leading-6">
                    Radix-based palettes for light and dark modes.
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </div>

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
