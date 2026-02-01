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
  const accessibleCategories = ["Overview", "Guides", "Roadmap"];
  const accessibleSections = sections.filter((s) =>
    accessibleCategories.includes(s.category)
  );
  const developerSections = sections.filter(
    (s) => !accessibleCategories.includes(s.category)
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
            {developerSections.map(({ category, docs }) => (
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
        </div>
      </div>
    </DocsShell>
  );
}
