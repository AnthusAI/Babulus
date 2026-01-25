import Link from "next/link";
import { DocsShell } from "@/components/docs/docs-shell";
import { docsHref, listDocsByCategory } from "@/lib/docs-registry";

export const metadata = {
  title: "Docs",
};

export default function DocsLandingPage() {
  const sections = listDocsByCategory();

  return (
    <DocsShell>
      <div className="space-y-8">
        <div className="rounded-2xl bg-card p-2">
          <div className="rounded-xl bg-background p-8 md:p-10">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-foreground/60">
              Documentation
            </p>
            <h1 className="mt-3 font-heading text-3xl md:text-5xl leading-[1.05] tracking-tight">
              Babulus docs, in one place.
            </h1>
            <p className="mt-4 max-w-[58ch] text-muted-foreground leading-7">
              Guides for configuring providers, environment-aware caching, project storage, and the
              Babulus DSL.
            </p>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {sections.map(({ category, docs }) => (
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
    </DocsShell>
  );
}

